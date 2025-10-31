const { default: mongoose } = require("mongoose")
const { getPaginationArray } = require('./helper.js')
const { ObjectId } = require("mongoose").Types;
const Student = require('../models/students/student.schema.js')
const TeacherTimeTable = require('../models/class/teacher.timetable.schema.js')
const { Types } = require("mongoose");


const studentAssignmentPipeline = (assignmentId) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(assignmentId)
      }
    },
    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "classInfo"
      }
    },
    {
      $unwind: {
        path: "$classInfo"
      }
    },
    {
      $lookup: {
        from: "teachers",
        localField: "uploadedBy",
        foreignField: "_id",
        as: "teacherInfo"
      }
    },
    {
      $unwind: {
        path: "$teacherInfo"
      }
    },
    {
      $project: {
        title: 1,
        fileUrl: 1,
        description: 1,
        "classInfo.name": 1,
        "classInfo.section": 1,
        "teacherInfo.name": 1
      }
    }
  ];
};

const studentAttendancePipeline = ({
  studentId,
  month,
  date,
  year,
  page = 1,
  limit = 10,
  teacherNameFilter,
}) => {
  const matchExpr = [];

  if (month) matchExpr.push({ $eq: [{ $month: "$date" }, month] });
  if (year) matchExpr.push({ $eq: [{ $year: "$date" }, year] });

  if (date) {
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");
    matchExpr.push({ $gte: ["$date", start] });
    matchExpr.push({ $lte: ["$date", end] });
  }

  const pipeline = [
    { $unwind: "$records" },
    { $match: { "records.student": new mongoose.Types.ObjectId(studentId) } },

    ...(matchExpr.length ? [{ $match: { $expr: { $and: matchExpr } } }] : []),

    {
      $addFields: {
        status: "$records.status",
        remarks: "$records.remarks",
        classId: "$class"
      }
    },

    {
      $lookup: {
        from: "classes",
        localField: "class",
        foreignField: "_id",
        as: "classInfo"
      }
    },
    { $unwind: "$classInfo" },

    {
      $lookup: {
        from: "teachers",
        localField: "classInfo.teacher",
        foreignField: "_id",
        as: "teacherInfo"
      }
    },
    { $unwind: "$teacherInfo" },

    ...(teacherNameFilter ? [{ $match: { "teacherInfo.name": teacherNameFilter } }] : []),

    {
      $project: {
        _id: 0,
        date: 1,
        session: 1,
        status: 1,
        remarks: 1,
        className: "$classInfo.name",
        section: "$classInfo.section",
        teacherName: "$teacherInfo.name"
      }
    },

    { $sort: { date: -1, session: 1 } },
    ...getPaginationArray(page, limit)
  ];

  return pipeline;
};

const studentProfilePipeline = (studentId) => {
  const _id = new mongoose.Types.ObjectId(studentId);

  return [
    // Match this student
    { $match: { _id } },

    // 1️⃣ Get the student's enrollments
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "student",
        as: "enrollments"
      }
    },

    // 2️⃣ Lookup class details for each enrollment
    {
      $lookup: {
        from: "classes",
        localField: "enrollments.class",
        foreignField: "_id",
        as: "classDocs"
      }
    },

    // 3️⃣ Merge class name/section + subjects into each enrollment
    {
      $addFields: {
        enrollments: {
          $map: {
            input: "$enrollments",
            as: "enroll",
            in: {
              year: "$$enroll.year",
              section: "$$enroll.section",
              className: {
                $let: {
                  vars: {
                    matched: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$classDocs",
                            as: "c",
                            cond: { $eq: ["$$c._id", "$$enroll.class"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$matched.name"
                }
              },
              // ✅ Include subjects array from the matched class
              subjects: {
                $let: {
                  vars: {
                    matched: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$classDocs",
                            as: "c",
                            cond: { $eq: ["$$c._id", "$$enroll.class"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$matched.subjects"
                }
              }
            }
          }
        }
      }
    },

    // 4️⃣ Recent 5 attendance records
    {
      $lookup: {
        from: "attendances",
        let: { studentId: "$_id" },
        pipeline: [
          { $unwind: "$records" },
          { $match: { $expr: { $eq: ["$records.student", "$$studentId"] } } },
          {
            $lookup: {
              from: "classes",
              localField: "class",
              foreignField: "_id",
              as: "classInfo"
            }
          },
          { $unwind: "$classInfo" },
          {
            $project: {
              _id: 0,
              date: 1,
              session: 1,
              status: "$records.status",
              remarks: "$records.remarks",
              className: "$classInfo.name",
              section: "$classInfo.section"
            }
          },
          { $sort: { date: -1 } },
          { $limit: 5 }
        ],
        as: "recentAttendance"
      }
    },

    // 5️⃣ Final projection
    {
      $project: {
        _id: 0,
        name: 1,
        email: 1,
        rollNo: 1,
        dob: 1,
        age: 1,
        gender: 1,
        phone: 1,
        address: 1,
        profilePic: 1,
        grades: 1,
        parents: 1,
        enrollments: 1,       // now contains className, section, subjects
        recentAttendance: 1
      }
    }
  ];
};

const assignmentWithClassPipeline = (classId) => [
  {
    $match: { class: mongoose.Types.ObjectId(classId) } // filter assignments by class
  },
  {
    $lookup: {
      from: 'classes',          // Class collection
      localField: 'class',
      foreignField: '_id',
      as: 'classInfo'
    }
  },
  { $unwind: '$classInfo' },    // Convert classInfo array to object
  {
    $project: {
      title: 1,
      description: 1,
      dueDate: 1,
      fileUrl: 1,
      'classInfo.name': 1,
      'classInfo.section': 1
    }
  }
];

// const classinstudentPipeline = (classId) => [
//   {
//     $match: {
//       classId: mongoose.Types.ObjectId.isValid(classId)
//         ? mongoose.Types.ObjectId(classId)
//         : classId
//     }
//   },
//   {
//     $lookup: {
//       from: 'classes',          // Class collection name
//       localField: 'classId',  
//       foreignField: '_id',
//       as: 'classInfo'
//     }
//   },
//   { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } }, // keep even if classInfo missing
//   {
//     $project: {
//       _id: 1,
//       name: 1,
//       email: 1,
//       admissionNo: 1,
//       classId: 1,
//       'classInfo.name': 1,
//       'classInfo.section': 1
//     }
//   }
// ];


const teacherProfilePipeline = (teacherId) => {

  //   // 1️⃣ Match the teacher

  //   // 2️⃣ Flatten file fields
  //   {
  //     $addFields: {
  //       profilePic: "$profilePic.fileUrl",
  //       aadharFront: "$aadharFront.fileUrl",
  //       aadharBack: "$aadharBack.fileUrl",
  //       resume: "$resume.fileUrl",
  //       joiningLetter: "$joiningLetter.fileUrl",
  //       certificates: {
  //         $map: {
  //           input: "$certificates",
  //           as: "cert",
  //           in: "$$cert.fileUrl"
  //         }
  //       }
  //     }
  //   },

  //   // 3️⃣ Lookup classes the teacher teaches (from `classes` array)
  //   {
  //     $lookup: {
  //       from: "classes",
  //       localField: "classes",
  //       foreignField: "_id",
  //       as: "teachingClasses"
  //     }
  //   },

  //   // 4️⃣ Lookup the class where this teacher is class teacher (from `classes.teacher`)
  //   {
  //     $lookup: {
  //       from: "classes",
  //       let: { teacherId: "$_id" },
  //       pipeline: [
  //         { $match: { $expr: { $eq: ["$teacher", "$$teacherId"] } } },
  //         {
  //           $project: {
  //             _id: 1,
  //             name: 1,
  //             section: 1,
  //             classIdentifier: 1,
  //             studentCount: 1
  //           }
  //         }
  //       ],
  //       as: "classTeacherOf"
  //     }
  //   },

  //   // 5️⃣ Lookup subjects based on specialization
  //   {
  //     $lookup: {
  //       from: "subjects",
  //       localField: "subjectsHandled.subjectName",
  //       foreignField: "name",
  //       as: "subjectsInfo"
  //     }
  //   },

  //   // 6️⃣ Clean format — make classTeacherOf a single object instead of array
  //   {
  //     $addFields: {
  //       classTeacherOf: {
  //         $cond: [
  //           { $gt: [{ $size: "$classTeacherOf" }, 0] },
  //           { $arrayElemAt: ["$classTeacherOf", 0] },
  //           null
  //         ]
  //       }
  //     }
  //   },

  //   // 7️⃣ Final projection
  //   {
  //     $project: {
  //       name: 1,
  //       email: 1,
  //       phone: 1,
  //       dob: 1,
  //       gender: 1,
  //       maritalStatus: 1,
  //       address: 1,
  //       bloodGroup: 1,
  //       physicalDisability: 1,
  //       disabilityDetails: 1,
  //       designation: 1,
  //       qualifications: 1,
  //       specialization: 1,
  //       experience: 1,
  //       dateOfJoining: 1,
  //       salaryInfo: 1,
  //       emergencyContact: 1,
  //       achievements: 1,
  //       clubsInCharge: 1,
  //       eventsHandled: 1,
  //       profilePic: 1,
  //       aadharFront: 1,
  //       aadharBack: 1,
  //       certificates: 1,
  //       resume: 1,
  //       joiningLetter: 1,
  //       status: 1,
  //       teachingClasses: 1,
  //       classTeacherOf: 1, // ✅ separate key for class teacher
  //       subjectsInfo: 1,
  //       createdAt: 1,
  //       updatedAt: 1
  //     }
  //   }
  // ];

 return [
   
    { $match: { _id: new mongoose.Types.ObjectId(teacherId) } 
    
  },
  {
    $addFields: {
      profilePic: "$profilePic.fileUrl",
      aadharFront: "$aadharFront.fileUrl",
      aadharBack: "$aadharBack.fileUrl",
      resume: "$resume.fileUrl",
      joiningLetter: "$joiningLetter.fileUrl",
      certificates: {
        $map: {
          input: "$certificates",
          as: "cert",
          in: "$$cert.fileUrl"
        }
      }
    }
  },
  {
    $lookup: {
      from: "classes",
      localField: "classes",
      foreignField: "_id",
      as: "teachingClasses"
    }
  },
  {
    $lookup: {
      from: "classes",
      let: { teacherId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$teacher", "$$teacherId"] } } },
        {
          $project: {
            _id: 1,
            name: 1,
            section: 1,
            classIdentifier: 1,
            studentCount: 1
          }
        }
      ],
      as: "classTeacherOf"
    }
  },
  {
 
  $lookup: {
    from: "subjects",
    let: { names: "$subjectsHandled.subjectName" },
    pipeline: [
      {
        $match: {
          $expr: {
            $in: [
              { $toLower: "$name" },
              { $map: { input: "$$names", as: "n", in: { $toLower: "$$n" } } }
            ]
          }
        }
      }
    ],
    as: "subjectsInfo"
  }},

  {
    $addFields: {
      classTeacherOf: {
        $cond: [
          { $gt: [{ $size: "$classTeacherOf" }, 0] },
          { $arrayElemAt: ["$classTeacherOf", 0] },
          null
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      subjectsInfo: 1,
      
      email: 1,
      phone: 1,
      dob: 1,
      gender: 1,
      maritalStatus: 1,
      address: 1,
      bloodGroup: 1,
      physicalDisability: 1,
      disabilityDetails: 1,
      designation: 1,
      qualifications: 1,
      specialization: 1,
      experience: 1,
      dateOfJoining: 1,
      salaryInfo: 1,
      emergencyContact: 1,
      achievements: 1,
      clubsInCharge: 1,
      eventsHandled: 1,
      profilePic: 1,
      aadharFront: 1,
      aadharBack: 1,
      certificates: 1,
      resume: 1,
      joiningLetter: 1,
      status: 1,
      teachingClasses: 1,
      classTeacherOf: 1,
      createdAt: 1,
      updatedAt: 1
    }
  }
]

};


// pipeline for getting all students from db
const getClassWithStudentsPipeline = (classId, skip = 0, limit = 10, filters = {}) => {
  const matchStage = { "student.isRemoved": 0 };

  if (filters.academicYear) matchStage["enrollments.academicYear"] = filters.academicYear;
  if (filters.section) matchStage["enrollments.section"] = filters.section;
  if (filters.rollNo) matchStage["enrollments.rollNo"] = { $regex: filters.rollNo, $options: "i" };
  if (filters.name) matchStage["student.name"] = { $regex: filters.name, $options: "i" };
  if (filters.gender) matchStage["student.gender"] = filters.gender;

  return [
    { $match: { _id: new mongoose.Types.ObjectId(classId) } },
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "class",
        as: "enrollments"
      }
    },
    { $unwind: { path: "$enrollments", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "students",
        localField: "enrollments.student",
        foreignField: "_id",
        as: "student"
      }
    },
    { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
    { $match: matchStage },
    {
      $replaceRoot: {
        newRoot: {
          academicYear: "$enrollments.academicYear",
          rollNo: "$enrollments.rollNo",
          status: "$enrollments.status",
          classId: "$_id",
          className: "$name",
          section: "$section",
          studentId: "$student._id",
          studentName: "$student.name",
          gender: "$student.gender",
          bloodGroup: "$student.bloodGroup",
          phone: "$student.phone",
          email: "$student.email",
          profilePic: "$student.profilePic.fileUrl"
        }
      }
    },
    { $sort: { rollNo: 1 } },
    { $skip: skip },
    { $limit: limit }
  ];
};

const getAllStudentsPipeline = (skip = 0, limit = 10, filters = {}) => {
  const matchStage = { "student.isRemoved": 0 };
  if (filters.academicYear) matchStage["academicYear"] = filters.academicYear;
  if (filters.section) matchStage["section"] = filters.section;
  if (filters.rollNo) matchStage["rollNo"] = { $regex: filters.rollNo, $options: "i" };
  if (filters.name) matchStage["student.name"] = { $regex: filters.name, $options: "i" };
  if (filters.gender) matchStage["student.gender"] = filters.gender;

  return [
    {
      $lookup: {
        from: "classes",
        localField: "class",
        foreignField: "_id",
        as: "classInfo"
      }
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "students",
        localField: "student",
        foreignField: "_id",
        as: "student"
      }
    },
    { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
    { $match: matchStage },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            { classId: "$classInfo._id", className: "$classInfo.name", section: "$classInfo.section" },
            "$student",
            { academicYear: "$academicYear", rollNo: "$rollNo", status: "$status" }
          ]
        }
      }
    },
    { $sort: { rollNo: 1 } },
    { $skip: skip },
    { $limit: limit }
  ];
};


const getStudentsByClassNamePipeline = (className, skip = 0, limit = 10, studentFilter = {}) => [
  // Lookup class details
  {
    $lookup: {
      from: "classes",
      localField: "class",
      foreignField: "_id",
      as: "classInfo"
    }
  },
  { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

  // Match by class name
  { $match: { "classInfo.name": className } },

  // Lookup student
  {
    $lookup: {
      from: "students",
      localField: "student",
      foreignField: "_id",
      as: "student"
    }
  },
  { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },

  // Remove null students (optional)
  { $match: { student: { $ne: null } } },

  // Apply filters
  {
    $match: {
      "student.isRemoved": 0,
      ...studentFilter
    }
  },

  // Sorting + pagination
  { $sort: { rollNo: 1 } },
  { $skip: skip },
  { $limit: limit },

  // Flatten root
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          "$student",
          {
            academicYear: "$academicYear",
            rollNo: "$rollNo",
            status: "$status",
            classInfo: {
              _id: "$classInfo._id",
              name: "$classInfo.name",
              section: "$classInfo.section"
            }
          }
        ]
      }
    }
  },

  // Final projection
  {
    $project: {
      isRemoved: 0,
      password: 0,
      token: 0,
      refreshToken: 0,
      logs: 0
    }
  }
];

const getStudentsPipeline = (filters = {}, skip = 0, limit = 10) => {
  const matchStage = { "student.isRemoved": 0 };

  if (filters.name) {
    matchStage["student.name"] = { $regex: filters.name, $options: "i" };
  }

  return [
    {
      $lookup: {
        from: "classes",
        localField: "class",
        foreignField: "_id",
        as: "classInfo"
      }
    },
    { $unwind: "$classInfo" },

    // Match by className if provided
    ...(filters.className ? [{ $match: { "classInfo.name": filters.className } }] : []),

    {
      $lookup: {
        from: "students",
        localField: "student",
        foreignField: "_id",
        as: "student"
      }
    },
    { $unwind: "$student" },

    { $match: matchStage },

    { $sort: { rollNo: 1 } },
    { $skip: skip },
    { $limit: limit },

    {
      $project: {
        _id: 1,
        academicYear: 1,
        rollNo: 1,
        status: 1,
        classInfo: { _id: 1, name: 1, section: 1 },
        student: {
          _id: 1,
          name: 1,
          gender: 1,
          bloodGroup: 1,
          phone: 1,
          email: 1
        }
      }
    }
  ];
};

// pipeline for getting student detail
const getStudentWithDetails = (studentId) => [
  { $match: { _id: new mongoose.Types.ObjectId(studentId) } },

  // Lookup student enrollments with class info
  {
    $lookup: {
      from: "enrollments",
      let: { studentId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$student", "$$studentId"] } } },
        {
          $lookup: {
            from: "classes",
            localField: "class",
            foreignField: "_id",
            as: "classInfo"
          }
        },
        { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } }
      ],
      as: "enrollments"
    }
  },

  // Lookup student fees with fee structure
  {
    $lookup: {
      from: "studentfees",
      localField: "_id",
      foreignField: "studentId",
      as: "feesRecords"
    }
  },
  {
    $lookup: {
      from: "feestructures",
      localField: "feesRecords.feeStructureId",
      foreignField: "_id",
      as: "feeStructures"
    }
  },

  // Lookup attendance
  {
    $lookup: {
      from: "attendances",
      localField: "_id",
      foreignField: "student",
      as: "attendanceRecords"
    }
  },

  // Lookup assignments
  {
    $lookup: {
      from: "assignments",
      let: { studentId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $in: ["$$studentId", { $ifNull: ["$submissions.student", []] }]
            }
          }
        },
        {
          $project: {
            title: 1,
            dueDate: 1,
            submissions: {
              $filter: {
                input: "$submissions",
                as: "sub",
                cond: { $eq: ["$$sub.student", "$$studentId"] }
              }
            }
          }
        }
      ],
      as: "assignments"
    }
  },

  // Add full parent/guardian info
  {
    $addFields: {
      parentDetails: {
        $cond: [
          { $gt: [{ $size: { $ifNull: ["$parents", []] } }, 0] },
          "$parents",
          {
            $cond: [
              { $ifNull: ["$guardian", false] },
              ["$guardian"], // wrap guardian in array for consistency
              []
            ]
          }
        ]
      }
    }
  },

  // Flatten root with replaceRoot
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          "$$ROOT",
          {
            enrollmentDetails: "$enrollments",
            feesDetails: "$feesRecords",
            attendanceDetails: "$attendanceRecords",
            assignmentsDetails: "$assignments",
            parentDetails: "$parentDetails"
          }
        ]
      }
    }
  },

  // Cleanup: remove unwanted fields
];
// pipeline for getting all classes from db
const getAllClassesPipeline = (className, page = 1, limit = 10) => {
  const match = {};
  if (className && className.trim() !== "") {
    match.name = { $regex: className.trim(), $options: "i" };
  }

  return [
    { $match: match },
    {
      $lookup: {
        from: "teachers",
        localField: "teacher",
        foreignField: "_id",
        as: "teacherDoc"
      }
    },
    { $unwind: { path: "$teacherDoc", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        classTeacher: {
          $cond: {
            if: { $ifNull: ["$teacherDoc", false] },
            then: {
              _id: "$teacherDoc._id",
              name: "$teacherDoc.name",
              email: "$teacherDoc.email",
              department: "$teacherDoc.department",
              subjectsHandled: "$teacherDoc.subjectsHandled"
            },
            else: null
          }
        }
      }
    },
    {
      $project: {
        name: 1,
        section: 1,
        status: 1,
        studentCount: 1,
        classTeacher: 1,
        createdAt: 1,
        classIdentifier: 1
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ];
};

// getting assignment pipeline
const buildAssignmentPipeline = (classId, skip = 0, limit = 10) => {
  return [
    { $match: { class: new mongoose.Types.ObjectId({ class: classId }) } },

    {
      $lookup: {
        from: "classes",
        localField: "class",
        foreignField: "_id",
        as: "classData"
      }
    },

    { $unwind: { path: "$classData", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        "title": 1,
        "instructions": 1,
        "dueDate": 1,
        "maxMarks": 1,
        "passingMarks": 1,
        "fileUrl": 1,
        "resources": 1,
        "uploadedBy": 1,
        "subject": 1,
        "classData.name": 1,
        "classData.section": 1,
      }
    },

    { $skip: skip },
    { $limit: limit }
  ]
}

//getting attendance pipeline
function buildAttendancePipeline(classId, skip = 0, limit = 10) {
  return [
    { $match: { class: new mongoose.Types.ObjectId(classId) } },

    { $unwind: { path: "$records", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "students",
        localField: "records.student",
        foreignField: "_id",
        as: "stud"
      }
    },
    { $unwind: { path: "$stud", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "classes",
        localField: "class",
        foreignField: "_id",
        as: "classData"
      }
    },
    { $unwind: { path: "$classData", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "teachers",
        localField: "takenBy",
        foreignField: "_id",
        as: "teacherData"
      }
    },
    { $unwind: { path: "$teacherData", preserveNullAndEmptyArrays: true } },

    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              _id: "$_id",
              status: "$records.status",
              remarks: "$records.remarks",
              studentName: "$stud.name",
              className: "$classData.name",
              classSection: "$classData.section",
              teacherName: "$teacherData.name",
              teacherSubjects: {
                $map: {
                  input: "$teacherData.subjectsHandled",
                  as: "subj",
                  in: "$$subj.subjectName"
                }
              }
            }
          ]
        }
      }
    },

    { $skip: skip },
    { $limit: limit }
  ];
}

// student fees pipeline
const studentFeesLookup = (studentId) => [
  { $match: { student: mongoose.Types.ObjectId(studentId) } },
  {
    $lookup: {
      from: "students",
      localField: "student",
      foreignField: "_id",
      as: "studentInfo",
    },
  },
  { $unwind: "$studentInfo" },
  {
    $lookup: {
      from: "classes",
      localField: "class",
      foreignField: "_id",
      as: "classInfo",
    },
  },
  { $unwind: "$classInfo" },
  {
    $project: {
      "studentInfo.name": 1,
      "studentInfo.admissionNo": 1,
      feesStatus: 1,
      feeDetails: 1,
      "classInfo.name": 1,
      "classInfo.section": 1,
    },
  },
];

const singleStudentFeeLookup = (enrollmentId) => [
  { $match: { _id: mongoose.Types.ObjectId(enrollmentId) } },
  {
    $lookup: {
      from: "students",
      localField: "student",
      foreignField: "_id",
      as: "studentInfo",
    },
  },
  { $unwind: "$studentInfo" },
  {
    $lookup: {
      from: "classes",
      localField: "class",
      foreignField: "_id",
      as: "classInfo",
    },
  },
  { $unwind: "$classInfo" },
  {
    $project: {
      student: 1,
      class: 1,
      feesStatus: 1,
      feeDetails: 1,
      "studentInfo.name": 1,
      "studentInfo.admissionNo": 1,
      "classInfo.name": 1,
      "classInfo.section": 1,
    },
  },
];

// student submission pipeline
const getSubmissionWithDetails = (submissionId) => [
  { $match: { _id: mongoose.Types.ObjectId(submissionId) } },
  {
    $lookup: {
      from: "assignments",
      localField: "assignment",
      foreignField: "_id",
      as: "assignmentDetails"
    }
  },
  { $unwind: "$assignmentDetails" },
  {
    $lookup: {
      from: "students",
      localField: "student",
      foreignField: "_id",
      as: "studentDetails"
    }
  },
  { $unwind: "$studentDetails" },
  {
    $lookup: {
      from: "teachers",
      localField: "gradedBy",
      foreignField: "_id",
      as: "teacherDetails"
    }
  },
  { $unwind: { path: "$teacherDetails", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      submittedAt: 1,
      files: 1,
      status: 1,
      marksObtained: 1,
      feedback: 1,
      isLate: 1,
      resubmissions: 1,
      assignment: "$assignmentDetails",
      student: "$studentDetails",
      gradedBy: "$teacherDetails"
    }
  }
];

// admin get submissions pipeline
const getSubmissionsPipeline = (classId, studentId, page = 1, limit = 10) => {
  const match = {};

  if (classId && studentId) {
    match.student = new mongoose.Types.ObjectId(studentId);
  }

  const pipeline = [
    ...(classId && studentId ? [{ $match: match }] : []),

    {
      $lookup: {
        from: "assignments",
        localField: "assignment",
        foreignField: "_id",
        as: "assignment",
      },
    },
    { $unwind: { path: "$assignment", preserveNullAndEmptyArrays: true } },

    ...(classId
      ? [{ $match: { "assignment.class": new mongoose.Types.ObjectId(classId) } }]
      : []),

    {
      $lookup: {
        from: "students",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "teachers",
        localField: "gradedBy",
        foreignField: "_id",
        as: "gradedBy",
      },
    },
    { $unwind: { path: "$gradedBy", preserveNullAndEmptyArrays: true } },

    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$$ROOT",
            {
              assignmentId: "$assignment._id",
              assignmentTitle: "$assignment.title",
              assignmentDescription: "$assignment.description",
              assignmentDueDate: "$assignment.dueDate",
              assignmentSubject: "$assignment.subject",
              assignmentClass: "$assignment.class",

              studentId: "$student._id",
              studentName: "$student.name",
              studentEmail: "$student.email",

              gradedById: "$gradedBy._id",
              gradedByName: "$gradedBy.name",
            },
          ],
        },
      },
    },

    { $project: { assignment: 0, student: 0, gradedBy: 0 } },
    { $sort: { submittedAt: -1 } },
    ...getPaginationArray(page, limit)
  ];

  return pipeline;
};



//---------teacher---------

const getAssignmentLookup = () => [
  {
    $addFields: {
      AssignmentPic: {
        $cond: [
          { $or: [{ $eq: ['$fileUrl', null] }, { $eq: ['$fileUrl', ''] }] },
          '',
          {
            $concat: [
              { $ifNull: [process.env.IMAGE_PATH, ''] },
              '$fileUrl'
            ]
          }
        ]
      }
    }
  },
  {
    $lookup: {
      from: 'classes',
      localField: 'class',
      foreignField: '_id',
      as: 'classDetails'
    }
  },
  { $unwind: { path: '$classDetails', preserveNullAndEmptyArrays: true } },

  // ✅ Lookup to count total assignments of this class
  {
    $lookup: {
      from: 'assignments',
      let: { classId: '$class' },
      pipeline: [
        { $match: { $expr: { $eq: ['$class', '$$classId'] } } },
        { $count: 'count' }
      ],
      as: 'classAssignmentCount'
    }
  },
  {
    $addFields: {
      totalAssignmentsInClass: {
        $ifNull: [{ $arrayElemAt: ['$classAssignmentCount.count', 0] }, 0]
      }
    }
  },
  { $project: { classAssignmentCount: 0 } },

  {
    $lookup: {
      from: 'teachers',
      localField: 'uploadedBy',
      foreignField: '_id',
      as: 'teacherDetails'
    }
  },
  { $unwind: { path: '$teacherDetails', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'subjects',
      localField: 'subject',
      foreignField: 'name',
      as: 'subjectDetails'
    }
  },
  { $unwind: { path: '$subjectDetails', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      title: 1,
      description: 1,
      dueDate: 1,
      maxMarks: 1,
      AssignmentPic: 1,
      createdAt: 1,
      updatedAt: 1,
      totalAssignmentsInClass: 1, // ✅ New Field Added Here
      'classDetails._id': 1,
      'classDetails.name': 1,
      'classDetails.section': 1,
      'teacherDetails._id': 1,
      'teacherDetails.name': 1,
      'teacherDetails.email': 1,
      'teacherDetails.phone': 1,
      'teacherDetails.department': 1,
      'subjectDetails._id': 1,
      'subjectDetails.name': 1,
      'subjectDetails.code': 1
    }
  }
];

const getTeacherAssignByLookup = (classId, teacherId) => {
  const matchStage = {}
  if (classId) matchStage.classId = mongoose.Types.ObjectId(classId)
  if (teacherId) matchStage.teacherId = mongoose.Types.ObjectId(teacherId)

  return [
    { $match: matchStage },

    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'classDetails'
      }
    },
    { $unwind: { path: '$classDetails', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacherDetails'
      }
    },
    { $unwind: { path: '$teacherDetails', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectId',
        foreignField: '_id',
        as: 'subjectDetails'
      }
    },
    { $unwind: { path: '$subjectDetails', preserveNullAndEmptyArrays: true } },

    {
      $project: {
        section: 1,
        subject: 1,
        startTime: 1,
        endTime: 1,
        createdAt: 1,
        updatedAt: 1,
        'classDetails._id': 1,
        'classDetails.name': 1,
        'classDetails.section': 1,
        'teacherDetails._id': 1,
        'teacherDetails.name': 1,
        'teacherDetails.email': 1,
        'teacherDetails.phone': 1,
        'teacherDetails.department': 1
      }
    }
  ]
}

const getAllTeachersWithClassLookup = (teacherId) => {
  return [
    // {
    //   $match: { _id: new mongoose.Types.ObjectId(teacherId) }
    // },
    {
      $lookup: {
        from: 'classes',
        localField: '_id',          // teacher._id
        foreignField: 'teacher',  // class.teacherId
        as: 'classesInfo'
      },

    },
    {
      $project: {
        // Teacher info
        name: 1,
        email: 1,
        phone: 1,
        department: 1,
        designation: 1,

        // Filter classes: only where teacher is class teacher
        classesInfo: {
          $map: {
            input: {
              $filter: {
                input: "$classesInfo",
                as: "class",
                cond: { $eq: ["$$class.isClassTeacher", true] }
              }
            },
            as: "class",
            in: {
              _id: "$$class._id",
              name: "$$class.name",
              section: "$$class.section",
              studentCount: "$$class.studentCount",
              startTime: "$$class.startTime",
              endTime: "$$class.endTime",
              isClassTeacher: "$$class.isClassTeacher"
            }
          }
        }
      }
    },
    // Only include teachers who have at least one class as class teacher
    { $match: { "classesInfo.0": { $exists: true } } }
  ];
};

const teacherAttendancePipeline = ({
  teacherId,
  month,
  date,
  year,
  statusFilter,
  page = 1,
  limit = 10
}) => {
  const matchExpr = [];

  if (month) matchExpr.push({ $eq: [{ $month: "$date" }, month] });
  if (year) matchExpr.push({ $eq: [{ $year: "$date" }, year] });

  if (date) {
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");
    matchExpr.push({ $gte: ["$date", start] });
    matchExpr.push({ $lte: ["$date", end] });
  }

  const pipeline = [
    { $match: { teacher: new mongoose.Types.ObjectId(teacherId) } },

    ...(matchExpr.length ? [{ $match: { $expr: { $and: matchExpr } } }] : []),

    ...(statusFilter ? [{ $match: { status: statusFilter } }] : []),

    {
      $lookup: {
        from: "teachers",
        localField: "teacher",
        foreignField: "_id",
        as: "teacherInfo"
      }
    },
    { $unwind: "$teacherInfo" },

    {
      $project: {
        _id: 0,
        date: 1,
        status: 1,
        remarks: 1,
        teacherName: "$teacherInfo.name",
        teacherEmail: "$teacherInfo.email",
        teacherId: "$teacherInfo._id"
      }
    },

    { $sort: { date: -1 } },
    ...getPaginationArray(page, limit)
  ];

  return pipeline;
};


const getAttendanceLookup = (matchQuery, teacherId, page = 1, limit = 10) => {
  const teacherObjId = new mongoose.Types.ObjectId(teacherId);
  return [
    { $match: matchQuery },

    // Lookup students
    {
      $lookup: {
        from: "students",
        localField: "records.student",
        foreignField: "_id",
        as: "studentData"
      }
    },

    // Lookup classes
    {
      $lookup: {
        from: "classes",
        localField: "class",
        foreignField: "_id",
        as: "classData"
      }
    },

    // Map records & attach class
    {
      $addFields: {
        class: { $arrayElemAt: ["$classData", 0] },
        records: {
          $map: {
            input: "$records",
            as: "r",
            in: {
              _id: "$$r._id",
              status: "$$r.status",
              remarks: "$$r.remarks",
              student: {
                $let: {
                  vars: {
                    student: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$studentData",
                            as: "s",
                            cond: { $eq: ["$$s._id", "$$r.student"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    _id: "$$student._id",
                    name: "$$student.name",
                    email: "$$student.email",
                    dob: "$$student.dob",
                    address: "$$student.address",
                    profilePic: "$$student.profilePic"
                  }
                }
              }
            }
          }
        }
      }
    },

    // Remove temporary arrays
    { $project: { studentData: 0, classData: 0 } },

    // Filter only class teacher records for logged-in teacher
    {
      $match: {
        "class.isClassTeacher": true,
        "class.teacher": teacherObjId
      }
    },

    // Sort by date descending
    { $sort: { date: 1 } },

    // Pagination
    {
      $facet: {
        docs: [
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        totalCount: [{ $count: "count" }]
      }
    }
  ];
};

// const getAttendanceSummaryLookup = (date, month, teacherId, classId) => {
//  const matchQuery = {};
//   if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
//     matchQuery.takenBy = new mongoose.Types.ObjectId(teacherId);
//      console.log(matchQuery.date,"-----======")
//   }

//   if (date) {
//     matchQuery.date = { $regex: new RegExp(`${date}`) }; 
//     console.log(matchQuery.date,"192.168.2.43======")
//   }

//   if (month) {
//     matchQuery.date = { $regex: new RegExp(`${month}`) }; 
//      console.log(matchQuery.date,"=====")
//   }

//   // ✅ Match by class
//   if (classId && mongoose.Types.ObjectId.isValid(classId)) {
//     matchQuery.class = new mongoose.Types.ObjectId(classId);
//   }

//   console.log("MATCH QUERY:", matchQuery);

//   return [
//     { $match: matchQuery },
//     { $unwind: "$records" },
//     {
//       $group: {
//         _id: null,
//         totalPresent: {
//           $sum: {
//             $cond: [
//               { $eq: [{ $toLower: "$records.status" }, "present"] },
//               1,
//               0
//             ]
//           }
//         },
//         totalAbsent: {
//           $sum: {
//             $cond: [
//               { $eq: [{ $toLower: "$records.status" }, "absent"] },
//               1,
//               0
//             ]
//           }
//         }
//       }
//     }
//   ];};

const getAttendanceSummaryLookup = (date, month, teacherId, classId, studentId) => {
  const matchQuery = {};

  // Filter by teacher
  if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
    matchQuery.takenBy = new mongoose.Types.ObjectId(teacherId);
  }

  // Filter by date or month (mutually exclusive)
  if (date) {
    matchQuery.date = { $regex: new RegExp(`${date}`) };
  } else if (month) {
    matchQuery.date = { $regex: new RegExp(`${month}`) };
  }

  // Filter by class
  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    matchQuery.class = new mongoose.Types.ObjectId(classId);
  }

  const pipeline = [
    { $match: matchQuery },
    { $unwind: "$records" },
  ];

  // ✅ Optional filter for specific student
  if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
    pipeline.push({
      $match: { "records.student": new mongoose.Types.ObjectId(studentId) },
    });
  }

  // ✅ Group to count present/absent
  pipeline.push({
    $group: {
      _id: null,
      totalPresent: {
        $sum: {
          $cond: [
            { $eq: [{ $toLower: "$records.status" }, "present"] },
            1,
            0
          ]
        }
      },
      totalAbsent: {
        $sum: {
          $cond: [
            { $eq: [{ $toLower: "$records.status" }, "absent"] },
            1,
            0
          ]
        }
      }
    }
  });

  return pipeline;
};


const getGradeLookupPipeline = ({ whereStatement, page, limit }) => {
  return [
    // 🔹 Unwind grades first to access nested fields like grades.status
    { $unwind: '$grades' },

    // 🔹 Then apply filtering
    { $match: whereStatement },

    // 🔹 Lookup student data
    {
      $lookup: {
        from: 'students',
        localField: 'grades.student',
        foreignField: '_id',
        as: 'studentData'
      }
    },
    { $unwind: { path: '$studentData', preserveNullAndEmptyArrays: true } },

    // 🔹 Lookup assignment data
    {
      $lookup: {
        from: 'assignments',
        localField: 'grades.assignment',
        foreignField: '_id',
        as: 'assignmentData'
      }
    },
    { $unwind: { path: '$assignmentData', preserveNullAndEmptyArrays: true } },

    // 🔹 Lookup subject inside assignmentData
    {
      $lookup: {
        from: 'subjects',
        localField: 'assignmentData.subjectId',
        foreignField: '_id',
        as: 'assignmentData.subjectData'
      }
    },
    { $unwind: { path: '$assignmentData.subjectData', preserveNullAndEmptyArrays: true } },

    // 🔹 Project only required fields
    {
      $project: {
        _id: 1,
        classId: 1,
        'grades._id': 1,
        'grades.marks': 1,
        'grades.grade': 1,
        'grades.remark': 1,
        'grades.status': 1,
        'grades.createdAt': 1,
        'grades.updatedAt': 1,
        'studentData._id': 1,
        'studentData.name': 1,
        'studentData.admissionNo': 1,
        'assignmentData._id': 1,
        'assignmentData.title': 1,
        'assignmentData.dueDate': 1,
        'assignmentData.maxMarks': 1,
        'assignmentData.subjectData._id': 1,
        'assignmentData.subjectData.name': 1
      }
    },

    // 🔹 Pagination
    {
      $facet: {
        docs: [
          { $sort: { 'grades.createdAt': -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];
};


const getAllFeesStructurePipeline = () => {
  return [
    {
      $lookup: {
        from: 'classes',
        localField: 'classIdentifier',
        foreignField: 'classIdentifier',
        as: 'classData'
      }
    },
    { $unwind: { path: '$classData', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        "classData.name": 1,
        "classData.section": 1,
        feeHeads: 1,
        totalAmount: 1,
        academicYear: 1,
      }
    }
  ]
}

const studentDashboardPipeline = (studentId) => {
  return [
    { $match: { student: studentObjectId } },

    // 2️⃣ Join assignments to get subjectId, maxMarks, passingMarks
    {
      $lookup: {
        from: "assignments",
        localField: "assignment",
        foreignField: "_id",
        as: "assignmentDetails"
      }
    },
    { $unwind: "$assignmentDetails" },

    // 3️⃣ Group by subject to calculate performance
    {
      $group: {
        _id: "$assignmentDetails.subjectId",
        totalMarksObtained: { $sum: "$marksObtained" },
        totalMaxMarks: { $sum: "$assignmentDetails.maxMarks" },
        assignmentsCount: { $sum: 1 },
        submittedAssignments: {
          $sum: { $cond: [{ $eq: ["$status", "Submitted"] }, 1, 0] }
        },
        lateSubmissions: {
          $sum: { $cond: ["$isLate", 1, 0] }
        }
      }
    },

    // 4️⃣ Add subject name using lookup from subjects collection
    {
      $lookup: {
        from: "subjects",
        localField: "_id",
        foreignField: "_id",
        as: "subjectInfo"
      }
    },
    { $unwind: "$subjectInfo" },

    // 5️⃣ Final projection
    {
      $project: {
        _id: 0,
        subjectId: "$_id",
        subjectName: "$subjectInfo.name",
        totalMarksObtained: 1,
        totalMaxMarks: 1,
        percentage: {
          $cond: [
            { $eq: ["$totalMaxMarks", 0] },
            0,
            { $multiply: [{ $divide: ["$totalMarksObtained", "$totalMaxMarks"] }, 100] }
          ]
        },
        assignmentsCount: 1,
        submittedAssignments: 1,
        lateSubmissions: 1
      }
    }
  ]
}


const getTeacherDashboardPipeline = (teacherId) => {
  if (!ObjectId.isValid(teacherId)) {
    throw new Error("INVALID_TEACHER_ID");
  }

  const teacherObjId = new ObjectId(teacherId);

  return [
    { $match: { _id: teacherObjId } },

    {
      $facet: {
        // === Total Classes & Class Info ===
        totalClasses: [
          {
            $lookup: {
              from: "classes",
              localField: "_id",
              foreignField: "teacher", // your classes collection uses "teacher"
              as: "classList",
            },
          },
          {
            $project: {
              totalClasses: { $size: { $ifNull: ["$classList", []] } },
              classDetails: {
                $map: {
                  input: { $ifNull: ["$classList", []] },
                  as: "cls",
                  in: {
                    _id: "$$cls._id",
                    name: "$$cls.name",
                    section: "$$cls.section",
                    subject: "$$cls.subject",
                  },
                },
              },
            },
          },
        ],

        // === Total Students (correct via enrollments → students) ===
        totalStudents: [
          // 1) get classes (same as above)
          {
            $lookup: {
              from: "classes",
              localField: "_id",
              foreignField: "teacher",
              as: "classList",
            },
          },
          // 2) pull enrollments for any of those class ids
          {
            $lookup: {
              from: "enrollments",
              let: { classIds: "$classList._id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $gt: [{ $size: { $ifNull: ["$$classIds", []] } }, 0] }, // ensure classIds not empty
                        { $in: ["$class", "$$classIds"] }
                      ]
                    }
                  }
                },
                {
                  $project: {
                    student: 1
                  }
                }
              ],
              as: "enrollmentsForClasses"
            }
          },
          // 3) collect distinct student ids (avoid duplicates)
          {
            $project: {
              studentIds: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ["$enrollmentsForClasses", []] } }, 0] },
                  {
                    $reduce: {
                      input: "$enrollmentsForClasses",
                      initialValue: [],
                      in: { $setUnion: ["$$value", ["$$this.student"]] }
                    }
                  },
                  []
                ]
              }
            }
          },
          // 4) optionally lookup student documents if you want (we only need count here)
          {
            $project: {
              totalStudents: { $size: { $ifNull: ["$studentIds", []] } }
            }
          }
        ],

        // === Attendance Summary ===
        attendanceSummary: [
          {
            $lookup: {
              from: "teacher_attendances",
              localField: "_id",
              foreignField: "teacher",
              as: "attendanceList",
            },
          },
          {
            $project: {
              totalAttendance: { $size: { $ifNull: ["$attendanceList", []] } },
              presentToday: {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$attendanceList", []] },
                    as: "a",
                    cond: {
                      $eq: [
                        { $dateToString: { format: "%Y-%m-%d", date: "$$a.date" } },
                        { $dateToString: { format: "%Y-%m-%d", date: new Date() } },
                      ],
                    },
                  },
                },
              },
            },
          },
        ],

        // === Assignment Summary ===
        assignmentSummary: [
          {
            $lookup: {
              from: "assignments",
              localField: "_id",
              foreignField: "uploadedBy",
              as: "assignments",
            },
          },
          {
            $project: {
              totalAssignments: { $size: { $ifNull: ["$assignments", []] } },
              recentAssignments: {
                $slice: [
                  {
                    $map: {
                      input: {
                        $sortArray: {
                          input: { $ifNull: ["$assignments", []] },
                          sortBy: { createdAt: -1 },
                        },
                      },
                      as: "a",
                      in: {
                        _id: "$$a._id",
                        title: "$$a.title",
                        dueDate: "$$a.dueDate",
                        classId: "$$a.class", // note: your assignment's class field name
                      },
                    },
                  },
                  5,
                ],
              },
            },
          },
        ],
      },
    },

    // === Combine all facets ===
    {
      $project: {
        totalStudents: { $arrayElemAt: ["$totalStudents.totalStudents", 0] },
        totalClasses: { $arrayElemAt: ["$totalClasses.totalClasses", 0] },
        classDetails: { $arrayElemAt: ["$totalClasses.classDetails", 0] },
        totalAttendance: { $arrayElemAt: ["$attendanceSummary.totalAttendance", 0] },
        presentToday: { $arrayElemAt: ["$attendanceSummary.presentToday", 0] },
        totalAssignments: { $arrayElemAt: ["$assignmentSummary.totalAssignments", 0] },
        recentAssignments: { $arrayElemAt: ["$assignmentSummary.recentAssignments", 0] },
      },
    },
  ];
};


const getTeacherClassAndAssignmentsLookup = (teacherId) => {
  if (!ObjectId.isValid(teacherId)) {
    throw new Error('INVALID_TEACHER_ID')
  }

  const teacherObjId = new ObjectId(teacherId)

  return [
    // 1️⃣ Match teacher
    { $match: { _id: teacherObjId } },

    // 2️⃣ Get all classes where this teacher is class teacher
    {
      $lookup: {
        from: 'classes',
        localField: '_id', // teacher _id
        foreignField: 'teacher', // match classes where class.teacher = teacher._id
        as: 'classTeacherDetails',
        pipeline: [
          {
            $lookup: {
              from: 'enrollments',
              localField: '_id',     // class _id
              foreignField: 'class', // enrollment.class
              as: 'enrollments',
              pipeline: [
                {
                  $lookup: {
                    from: 'students',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                  }
                },
                { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
                {
                  $project: {
                    _id: 1,
                    rollNo: 1,
                    section: 1,
                    status: 1,
                    'studentInfo._id': 1,
                    'studentInfo.name': 1,
                    'studentInfo.email': 1,
                    'studentInfo.phone': 1,
                    'studentInfo.gender': 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              studentsOfClass: '$enrollments',
              studentCount: { $size: '$enrollments' }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              section: 1,
              studentCount: 1,
              studentsOfClass: 1
            }
          }
        ]
      }
    },

    // 3️⃣ Assignments uploaded by this teacher
    {
      $lookup: {
        from: 'assignments',
        let: { teacherId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$uploadedBy', '$$teacherId'] }
            }
          },
          {
            $project: {
              title: 1,
              subject: 1,
              class: 1,
              dueDate: 1,
              createdAt: 1
            }
          }
        ],
        as: 'assignmentsOfSubjects'
      }
    },

    // 4️⃣ Final projection
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        classTeacherDetails: 1,
        assignmentsOfSubjects: 1
      }
    }
  ]
}
const getTeacherAttendanceSummaryLookup = (date, month, teacherId) => {
  const matchQuery = {};

  // ✅ Match teacherId
  if (mongoose.Types.ObjectId.isValid(teacherId)) {
    matchQuery.teacher = new mongoose.Types.ObjectId(teacherId);
  }

  // ✅ Filter by date or month
  if (date) {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    matchQuery.date = { $gte: startOfDay, $lte: endOfDay };
  } else if (month) {
    // Expect month format like "2025-10"
    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(year, mon - 1, 1);
    const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999);
    matchQuery.date = { $gte: startOfMonth, $lte: endOfMonth };
  }

  return [
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalPresent: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: "$status" }, "present"] }, 1, 0],
          },
        },
        totalAbsent: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: "$status" }, "absent"] }, 1, 0],
          },
        },
        totalLate: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: "$status" }, "late"] }, 1, 0],
          },
        },
      },
    },
    // ✅ Remove _id from final output
    {
      $project: {
        _id: 0,
        totalPresent: 1,
        totalAbsent: 1,
        totalLate: 1,
      },
    },
  ];

};


const getTeacherStudentsLookup = (teacherId) => {
  if (!ObjectId.isValid(teacherId)) {
    throw new Error('INVALID_TEACHER_ID');
  }

  const teacherObjId = new ObjectId(teacherId);

  return [
    { $match: { teacher: teacherObjId } },
    {
      $lookup: {
        from: 'enrollments',
        localField: '_id',
        foreignField: 'class',
        as: 'enrolledStudents'
      }
    },

    { $unwind: '$enrolledStudents' },

    // 4️⃣ Join with student details
    {
      $lookup: {
        from: 'students',
        localField: 'enrolledStudents.student',
        foreignField: '_id',
        as: 'studentDetails'
      }
    },

    // 5️⃣ Unwind student details
    { $unwind: '$studentDetails' },

    // 6️⃣ Project useful fields
    {
      $project: {
        _id: 0,
        classId: '$_id',
        className: '$name',
        studentId: '$studentDetails._id',
        studentName: '$studentDetails.name',
        rollNo: '$enrolledStudents.rollNo',
        section: '$enrolledStudents.section',
        feesStatus: '$enrolledStudents.feesStatus',
        status: '$enrolledStudents.status'
      }
    }
  ];
};

async function getTimetableForClassAggregation(classId) {
  const timetable = await TeacherTimeTable.aggregate([
    { $match: { class: new mongoose.Types.ObjectId(classId) } },

    // Lookup teacher info
    {
      $lookup: {
        from: "teachers",
        localField: "teacher",
        foreignField: "_id",
        as: "teacherInfo"
      }
    },
    { $unwind: { path: "$teacherInfo", preserveNullAndEmptyArrays: true } },

    // Lookup subject info
    {
      $lookup: {
        from: "subjects",
        localField: "subject",
        foreignField: "_id",
        as: "subjectInfo"
      }
    },
    { $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true } },

    // Lookup class info
    {
      $lookup: {
        from: "classes",
        localField: "class",
        foreignField: "_id",
        as: "classInfo"
      }
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

    // Project only required fields
    {
      $project: {
        day: 1,
        period: 1,
        startTime: 1,
        endTime: 1,
        startMinutes: 1,
        endMinutes: 1,
        section: 1,
        teacher: "$teacherInfo.name",
        teacherId: "$teacherInfo._id",
        subjectInfo: 1,
        className: "$classInfo.name"
      }
    }
  ]);

  return timetable;
}

function getTeachersAttendancesByMonth(monthStart, monthEnd, search) {
  const matchStage = {};

  if (search && search.trim() !== "") {
    matchStage.name = { $regex: search.trim(), $options: "i" }; // matches any part of the name
  }

  return [
    { $match: matchStage }, // filter teachers first
    {
      $lookup: {
        from: "teacher_attendances",
        let: { teacherId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$teacher", "$$teacherId"] },
                  { $gte: ["$date", monthStart] },
                  { $lte: ["$date", monthEnd] }
                ]
              }
            }
          },
          { $project: { date: 1, status: 1, _id: 0 } }
        ],
        as: "attendance"
      }
    },
    {
      $project: {
        teacherId: "$_id",
        teacherName: "$name",
        attendance: 1
      }
    },
    { $sort: { teacherName: 1 } }
  ];
}
const teacherSalaryStatusLookup = (month) => [
  {
    $lookup: {
      from: "salaries",
      let: { teacherId: "$_id", monthParam: month },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$teacherId", "$$teacherId"] },
                { $eq: ["$month", "$$monthParam"] }
              ]
            }
          }
        }
      ],
      as: "salaryData"
    }
  },
  {
    $addFields: {
      salaryStatus: {
        $cond: [
          {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$salaryData",
                    as: "s",
                    cond: { $eq: ["$$s.status", "Paid"] }
                  }
                }
              },
              0
            ]
          },
          "Paid",
          "Pending"
        ]
      }
    }
  },
  {
    $project: {
      _id: 1,
      name: 1,
      email: 1,
      designation: 1,
      salaryStatus: 1,
      salaryData: {
        $map: {
          input: "$salaryData",
          as: "s",
          in: {
            month: "$$s.month",
            finalSalary: "$$s.finalSalary",
            status: "$$s.status",
            paymentDate: "$$s.paymentDate"
          }
        }
      }
    }
  },
  { $sort: { name: 1 } }
];



module.exports = {
  getAttendanceLookup
};


module.exports = {
  studentAttendancePipeline,
  studentProfilePipeline,
  studentAssignmentPipeline,
  // teacherProfilePipeline,
  getAllStudentsPipeline,
  // getStudentDetailsPipeline,
  getAllClassesPipeline,
  getStudentWithDetails,
  buildAssignmentPipeline,
  buildAttendancePipeline,
  getAllClassesPipeline,
  studentDashboardPipeline,

  // classinstudentPipeline
  assignmentWithClassPipeline,
  studentFeesLookup,
  singleStudentFeeLookup,
  getSubmissionWithDetails,
  getStudentsByClassNamePipeline,
  getClassWithStudentsPipeline,
  getStudentsPipeline,
  getSubmissionsPipeline,

  //teacher
  teacherProfilePipeline,
  getAssignmentLookup,
  getTeacherAssignByLookup,
  getAllTeachersWithClassLookup,
  getAttendanceLookup,
  teacherAttendancePipeline,
  getGradeLookupPipeline,
  getTeacherDashboardPipeline,
  getAttendanceSummaryLookup,
  getTeacherClassAndAssignmentsLookup,
  getTeacherAttendanceSummaryLookup,
  getTeacherStudentsLookup,
  getTeachersAttendancesByMonth,
  teacherSalaryStatusLookup,
  // fees
  getAllFeesStructurePipeline,

  // time table
  getTimetableForClassAggregation
}




