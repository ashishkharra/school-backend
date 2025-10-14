const { default: mongoose } = require("mongoose")
const { getPaginationArray } = require('./helper.js')
const Student = require('../models/students/student.schema.js')

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


// const teacherProfilePipeline = (teacherId) => {
//   return [
//     { $match: { _id: new mongoose.Types.ObjectId(teacherId) } },

//     {
//       $lookup: {
//         from: 'classes',
//         localField: '_id',
//         foreignField: 'teacher',  // assuming Class has a "teacher" field
//         as: 'classData'
//       }
//     },

//     { $unwind: { path: "$classData", preserveNullAndEmptyArrays: true } },

//     {
//       $project: {
//         "name": 1,
//         "email": 1,
//         "phone": 1,
//         "dateOfBirth": 1,
//         "gender": 1,
//         "maritalStatus": 1,
//         "spouseName": 1,
//         "children": 1,
//         "address": 1,
//         "bloodGroup": 1,
//         "physicalDisability": 1,
//         "department": 1,
//         "designation": 1,
//         "qualifications": 1,
//         "specialization": 1,
//         "experience": 1,
//         "dateOfJoining": 1,
//         "classes": 1,
//         "subjectsHandled": 1,
//         "salaryInfo": 1,
//         "IDProof": 1,
//         "certificates": 1,
//         "resume": 1,
//         "joiningLetter": 1,
//         "emergencyContact": 1,
//         "achievements": 1,
//         "clubsInCharge": 1,
//         "eventsHandled": 1,
//         "status": 1,
//         "createdAt": 1,
//         "updatedAt": 1,

//         "classData.name": 1,
//         "classData.section": 1
//       }
//     }
//   ];
// };
const teacherProfilePipeline = (teacherId) => {
  return [
    // 1️⃣ Match the teacher
    { $match: { _id: new mongoose.Types.ObjectId(teacherId) } },
 
    // 2️⃣ Extract file URLs from nested objects
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
 
    // 3️⃣ Populate class details
    {
      $lookup: {
        from: 'classes',
        localField: 'classes',
        foreignField: '_id',
        as: 'classData'
      }
    },
 
    // 4️⃣ Project only required fields
    {
      $project: {
        // basic info
        name: 1,
        email: 1,
        phone: 1,
        dob: 1,
        gender: 1,
        maritalStatus: 1,
        spouseName: 1,
        children: 1,
        address: 1,
        country: 1,
        bloodGroup: 1,
        physicalDisability: 1,
        disabilityDetails: 1,
 
        // professional info
        department: 1,
        designation: 1,
        qualifications: 1,
        specialization: 1,
        experience: 1,
        dateOfJoining: 1,
        subjectsHandled: 1,
        classes: 1,
        salaryInfo: 1,
 
        // file fields
        profilePic: 1,
        aadharFront: 1,
        aadharBack: 1,
        certificates: 1,
        resume: 1,
        joiningLetter: 1,
 
        // emergency / achievements
        emergencyContact: 1,
        achievements: 1,
        clubsInCharge: 1,
        eventsHandled: 1,
 
        // meta fields
        status: 1,
        createdAt: 1,
        updatedAt: 1,
 
        // populated class info
        classData: {
          _id: 1,
          name: 1,
          section: 1
        }
      }
    }
  ];
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
  const match = { status: "active" };
  if (className) match.name = { $regex: className, $options: "i" };

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
          $cond: [
            { $eq: ["$isClassTeacher", true] },
            {
              _id: "$teacherDoc._id",
              name: "$teacherDoc.name",
              email: "$teacherDoc.email",
              department: "$teacherDoc.department",
              specialization: "$teacherDoc.specialization"
            },
            null
          ]
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
        startTime: 1,
        endTime: 1
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
const getAssignmentLookup = (classId, subjectId, uploadedBy) => {
  const matchStage = {}
  if (classId) matchStage.classId = mongoose.Types.ObjectId(classId)
  if (subjectId) matchStage.subjectId = mongoose.Types.ObjectId(subjectId)
  if (uploadedBy) matchStage.uploadedBy = mongoose.Types.ObjectId(uploadedBy)

  return [
    { $match: matchStage },
    {
      $addFields: {
        AssignmentPic: {
          $cond: [
            {
              $or: [{ $eq: ['$fileUrl', ''] }, { $eq: ['$fileUrl', null] }]
            },
            '',
            { $concat: [process.env.IMAGE_PATH, '$fileUrl'] }
          ]
        }
      }
    },
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
        localField: 'uploadedBy',
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
        title: 1,
        description: 1,
        dueDate: 1,
        maxMarks: 1,
        AssignmentPic: 1, // ✅ renamed field
        createdAt: 1,
        updatedAt: 1,

        // Class
        'classDetails._id': 1,
        'classDetails.name': 1,
        'classDetails.section': 1,

        // Teacher
        'teacherDetails._id': 1,
        'teacherDetails.name': 1,
        'teacherDetails.email': 1,
        'teacherDetails.phone': 1,
        'teacherDetails.department': 1,

        // Subject
        'subjectDetails._id': 1,
        'subjectDetails.name': 1,
        'subjectDetails.code': 1
      }
    }
  ]
}

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


const getAttendanceLookup = (matchQuery, page = 1, limit = 10) => {
  return [
    // Match documents
    { $match: matchQuery },

    // Lookup student details
    {
      $lookup: {
        from: "students",
        localField: "records.student",
        foreignField: "_id",
        as: "studentData"
      }
    },

    // Map the records array with required student fields only
    {
      $addFields: {
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

    // Remove the temporary studentData array
    { $project: { studentData: 0 } },

    // Sort by date descending
    { $sort: { date: -1 } },

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

const getGradeLookupPipeline = ({ whereStatement, page, limit }) => {
  return [
    { $match: whereStatement },

    // Lookup student data
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentData'
      }
    },
    { $unwind: { path: '$studentData', preserveNullAndEmptyArrays: true } },

    // Lookup assignment data
    {
      $lookup: {
        from: 'assignments',
        localField: 'assignment',
        foreignField: '_id',
        as: 'assignmentData'
      }
    },
    { $unwind: { path: '$assignmentData', preserveNullAndEmptyArrays: true } },

    // Lookup subject inside assignmentData
    {
      $lookup: {
        from: 'subjects',
        localField: 'assignmentData.subjectId', // field in assignments collection
        foreignField: '_id',
        as: 'assignmentData.subjectData'
      }
    },

    // Optional: unwind subjectData if you want only one subject object
    {
      $unwind: { path: '$assignmentData.subjectData', preserveNullAndEmptyArrays: true }
    },

    // Facet for pagination
    {
      $facet: {
        docs: [
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];
};

module.exports = {
  getAttendanceLookup
};


module.exports = {
  studentAttendancePipeline,
  studentProfilePipeline,
  studentAssignmentPipeline,
  teacherProfilePipeline,
  getAllStudentsPipeline,
  // getStudentDetailsPipeline,
  getAllClassesPipeline,
  getStudentWithDetails,
  buildAssignmentPipeline,
  buildAttendancePipeline,
  getAllClassesPipeline,
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
  getAssignmentLookup,
  getTeacherAssignByLookup,
  getAllTeachersWithClassLookup,
  getAttendanceLookup,
  teacherAttendancePipeline,
  getGradeLookupPipeline
}




