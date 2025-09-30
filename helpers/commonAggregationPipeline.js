const { default: mongoose } = require("mongoose")
const { getPaginationArray } = require('./helper')
const Student = require('../models/students/student.schema.js')

const studentAssignmentPipeline = (assignmentId) => [
  { $match: { _id: new mongoose.Types.ObjectId(assignmentId) } },

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
    $lookup: {
      from: "teachers",
      localField: "uploadedBy",
      foreignField: "_id",
      as: "teacherInfo",
    },
  },
  { $unwind: "$teacherInfo" },

  {
    $project: {
      title: 1,
      fileUrl: 1,
      instructions: 1,
      description: 1,
      "classInfo._id": 1,
      "classInfo.name": 1,
      "classInfo.subject": 1,
      "teacherInfo._id": 1,
      "teacherInfo.name": 1,
    },
  },
];

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
    { $skip: (page - 1) * limit },
    { $limit: limit }
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
  return [
    { $match: { _id: new mongoose.Types.ObjectId({ _id: teacherId }) } },

    {
      $lookup: {
        from: 'classes',
        localField: '_id',
        foreignField: 'teacher',
        as: 'classData'
      }
    },

    { $unwind: { path: "$classData", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        "name": 1,
        "email": 1,
        "phone": 1,
        "dateOfBirth": 1,
        "gender": 1,
        "maritalStatus": 1,
        "spouseName": 1,
        "children": 1,
        "address": 1,
        "bloodGroup": 1,
        "physicalDisability": 1,
        "department": 1,
        "designation": 1,
        "qualifications": 1,
        "specialization": 1,
        "experience": 1,
        "dateOfJoining": 1,
        "classes": 1,
        "subjectsHandled": 1,
        "salaryInfo": 1,
        "IDProof": 1,
        "certificates": 1,
        "resume": 1,
        "joiningLetter": 1,
        "emergencyContact": 1,
        "achievements": 1,
        "clubsInCharge": 1,
        "eventsHandled": 1,
        "status": 1,
        "createdAt": 1,
        "updatedAt": 1,

        "classData.name": 1,
        "classData.section": 1
      }
    }

  ];
}

const getClassWithStudentsPipeline = (classId, skip = 0, limit = 10, studentFilter = {}) => [
  // Match the specific class
  { $match: { _id: new mongoose.Types.ObjectId(classId) } },
  {
    $lookup: {
      from: "enrollments",
      localField: "_id",
      foreignField: "class",
      as: "enrollments"
    }
  },
  { $unwind: "$enrollments" },
  {
    $lookup: {
      from: "students",
      localField: "enrollments.student",
      foreignField: "_id",
      as: "student"
    }
  },
  { $unwind: "$student" },
  {
    $match: {
      "student.isRemoved": 0,
      ...studentFilter
    }
  },
  { $sort: { "enrollments.rollNo": 1 } },
  { $skip: skip },
  { $limit: limit },
  {
    $project: {
      _id: 1,
      name: 1,
      section: 1,
      subjects: 1,
      teacher: 1,
      "enrollments._id": 1,
      "enrollments.academicYear": 1,
      "enrollments.rollNo": 1,
      "enrollments.status": 1,
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

const getStudentDetailsPipeline = (studentId) => [
  { $match: { _id: new mongoose.Types.ObjectId(studentId) } },

  // 1. Lookup all enrollments and attach their class info
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
        { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            section: 1,
            rollNo: 1,
            academicYear: 1,
            status: 1,
            classInfo: {
              _id: 1,
              name: 1,
              section: 1,
              subjects: 1,
              teacher: 1
            }
          }
        }
      ],
      as: "enrollments"
    }
  },

  // 2. Attendance records
  {
    $lookup: {
      from: "attendances",
      localField: "_id",
      foreignField: "student",
      as: "attendanceRecords"
    }
  },

  // 3. Fees records
  {
    $lookup: {
      from: "fees",
      localField: "_id",
      foreignField: "student",
      as: "feesRecords"
    }
  },

  // 4. Assignment submissions filtered for this student
  {
    $lookup: {
      from: "assignments",
      let: { studentId: "$_id" },
      pipeline: [
        { $match: { $expr: { $in: ["$$studentId", "$submissions.student"] } } },
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

  // 5. Final projection
  {
    $project: {
      name: 1,
      email: 1,
      dob: 1,
      gender: 1,
      bloodGroup: 1,
      phone: 1,
      address: 1,
      parents: 1,
      guardian: 1,
      emergencyContact: 1,
      physicalDisability: 1,
      profilePic: 1,
      status: 1,
      isRemoved: 1,
      removedAt: 1,
      removedReason: 1,
      enrollments: 1,          // now an array with classInfo inside each
      attendanceRecords: 1,
      feesRecords: 1,
      assignments: 1,
      grades: 1
    }
  }
];

const getAllClassesPipeline = (classIdentifier, section, page = 1, limit = 10) => {
  const match = {};
  if (classIdentifier) match.classIdentifier = classIdentifier;
  if (section) match.section = section;

  const pipeline = [
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
        classIdentifier: 1,
        section: 1,
        studentCount: 1,
        classTeacher: 1
      }
    },
    { $sort: { createdAt: -1 } },           // newest first
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ];

  return pipeline;
};

const getStudentWithDetails = async (studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return null;

  const [result] = await Student.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(studentId) } },

    // Join with enrollments
    {
      $lookup: {
        from: 'enrollments',
        localField: '_id',
        foreignField: 'student',
        as: 'enrollments'
      }
    },
    { $unwind: { path: '$enrollments', preserveNullAndEmptyArrays: true } },

    // Join with class (from enrollment.class)
    {
      $lookup: {
        from: 'classes',
        localField: 'enrollments.class',
        foreignField: '_id',
        as: 'classInfo'
      }
    },
    { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },

    // Optionally project only the fields you need
    {
      $project: {
        name: 1,
        email: 1,
        status: 1,
        parents: 1,
        guardian: 1,
        'enrollments.rollNo': 1,
        'enrollments.academicYear': 1,
        'classInfo.name': 1
      }
    }
  ]);

  return result || null;
}

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



module.exports = {
  studentAttendancePipeline,
  studentProfilePipeline,
  studentAssignmentPipeline,
  teacherProfilePipeline,
  getClassWithStudentsPipeline,
  getStudentDetailsPipeline,
  getAllClassesPipeline,
  getStudentWithDetails,
  buildAssignmentPipeline,
  buildAttendancePipeline,
  getAllClassesPipeline,
  // classinstudentPipeline
  assignmentWithClassPipeline,
  studentFeesLookup,
  singleStudentFeeLookup
}




