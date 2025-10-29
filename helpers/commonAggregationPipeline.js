const { default: mongoose } = require("mongoose")
const moment = require('moment')
const { getPaginationArray } = require('./helper.js')
const Student = require('../models/students/student.schema.js')
const TeacherTimeTable = require('../models/class/teacher.timetable.schema.js')


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
    // 1️⃣ Match this student
    { $match: { _id } },

    // 2️⃣ Lookup all enrollments of this student
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "student",
        as: "enrollments"
      }
    },

    // 3️⃣ Lookup class details for those enrollments
    {
      $lookup: {
        from: "classes",
        localField: "enrollments.class",
        foreignField: "_id",
        as: "classDocs"
      }
    },

    // 4️⃣ Extract only the latest academic year enrollment (with classId only)
    {
      $addFields: {
        latestEnrollment: {
          $let: {
            vars: {
              latest: {
                $arrayElemAt: [
                  {
                    $slice: [
                      {
                        $reverseArray: {
                          $sortArray: {
                            input: "$enrollments",
                            sortBy: { academicYear: 1 }
                          }
                        }
                      },
                      1
                    ]
                  },
                  0
                ]
              }
            },
            in: {
              academicYear: "$$latest.academicYear",
              section: "$$latest.section",
              rollNo: "$$latest.rollNo",
              status: "$$latest.status",
              classId: "$$latest.class", // ✅ keep only class _id
              className: {
                $let: {
                  vars: {
                    classMatch: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$classDocs",
                            as: "c",
                            cond: { $eq: ["$$c._id", "$$latest.class"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$classMatch.name"
                }
              },
              subjects: {
                $let: {
                  vars: {
                    classMatch: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$classDocs",
                            as: "c",
                            cond: { $eq: ["$$c._id", "$$latest.class"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$classMatch.subjects"
                }
              }
            }
          }
        }
      }
    },

    // 5️⃣ Lookup recent attendance (last 5 records)
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

    // 6️⃣ Lookup fee details
    {
      $lookup: {
        from: "studentfees",
        localField: "_id",
        foreignField: "studentId",
        as: "feeDetails"
      }
    },

    // 7️⃣ Simplify fee details
    {
      $addFields: {
        feeDetails: {
          $map: {
            input: "$feeDetails",
            as: "fee",
            in: {
              totalFee: "$$fee.totalFee",
              payableAmount: "$$fee.payableAmount",
              paidTillNow: "$$fee.paidTillNow",
              remaining: "$$fee.remaining",
              status: "$$fee.status",
              payments: "$$fee.payments"
            }
          }
        }
      }
    },

    // 8️⃣ Final projection
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
        currentEnrollment: "$latestEnrollment", // ✅ classId only, no enrollment _id
        recentAttendance: 1,
        feeDetails: 1
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
  const today = moment().format("dddd");

  return [
    // 1️⃣ Match teacher
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

    // 3️⃣ Lookup class info for each subject in subjectsHandled
    {
      $lookup: {
        from: "classes",
        localField: "subjectsHandled.classId",
        foreignField: "_id",
        as: "subjectClasses"
      }
    },

    // 4️⃣ Merge class name + section into each subject
    {
      $addFields: {
        subjectsHandled: {
          $map: {
            input: { $ifNull: ["$subjectsHandled", []] },
            as: "subj",
            in: {
              _id: "$$subj._id",
              subjectName: "$$subj.subjectName",
              subjectCode: "$$subj.subjectCode",
              classId: "$$subj.classId",
              className: {
                $let: {
                  vars: {
                    matchedClass: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$subjectClasses",
                            as: "cls",
                            cond: { $eq: ["$$cls._id", "$$subj.classId"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$matchedClass.name"
                }
              },
              section: {
                $let: {
                  vars: {
                    matchedClass: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$subjectClasses",
                            as: "cls",
                            cond: { $eq: ["$$cls._id", "$$subj.classId"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$matchedClass.section"
                }
              }
            }
          }
        }
      }
    },

    // 4.1️⃣ Lookup class(es) where teacher is classTeacher
    {
      $lookup: {
        from: "classes",
        localField: "_id",
        foreignField: "classTeacher",
        as: "classTeacherOf"
      }
    },

    // 4.2️⃣ Merge classTeacher info into each subjectsHandled entry
    {
      $addFields: {
        subjectsHandled: {
          $map: {
            input: "$subjectsHandled",
            as: "subj",
            in: {
              _id: "$$subj._id",
              subjectName: "$$subj.subjectName",
              subjectCode: "$$subj.subjectCode",
              classId: "$$subj.classId",
              className: "$$subj.className",
              section: "$$subj.section",
              // boolean if this teacher is class teacher of this subject's class
              isClassTeacher: {
                $in: [
                  "$$subj.classId",
                  {
                    $map: {
                      input: { $ifNull: ["$classTeacherOf", []] },
                      as: "ct",
                      in: "$$ct._id"
                    }
                  }
                ]
              },
              // If class teacher for this class, include that class name & section, otherwise null
              classTeacherClass: {
                $let: {
                  vars: {
                    matched: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$classTeacherOf", []] },
                            as: "ct",
                            cond: { $eq: ["$$ct._id", "$$subj.classId"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    $cond: [
                      { $ifNull: ["$$matched", false] },
                      { name: "$$matched.name", section: "$$matched.section" },
                      null
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },

    // 5️⃣ Lookup today's timetable
    {
      $lookup: {
        from: "teachertimetables",
        let: { teacherId: "$_id", today: today },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$teacher", "$$teacherId"] },
                  { $eq: ["$day", "$$today"] },
                  { $eq: ["$status", "active"] }
                ]
              }
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
          { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subjects",
              localField: "subject",
              foreignField: "_id",
              as: "subjectInfo"
            }
          },
          { $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true } },
          { $sort: { period: 1 } },
          {
            $project: {
              _id: 1,
              day: 1,
              period: 1,
              startTime: 1,
              endTime: 1,
              status: 1,
              "classInfo.name": 1,
              "classInfo.section": 1,
              "subjectInfo.name": 1
            }
          }
        ],
        as: "todaysTimetable"
      }
    },

    // 6️⃣ Project final clean data
    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        dob: 1,
        gender: 1,
        maritalStatus: 1,
        address: 1,
        bloodGroup: 1,
        physicalDisability: 1,
        disabilityDetails: 1,
        department: 1,
        designation: 1,
        qualifications: 1,
        specialization: 1,
        experience: 1,
        dateOfJoining: 1,
        salaryInfo: 1,
        profilePic: 1,
        aadharFront: 1,
        aadharBack: 1,
        certificates: 1,
        resume: 1,
        joiningLetter: 1,
        emergencyContact: 1,
        achievements: 1,
        clubsInCharge: 1,
        eventsHandled: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        teachingClasses: 1,
        subjectsHandled: 1,
        todaysTimetable: 1
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

    // ✅ ADDED: remove duplicate students (keep the first occurrence)
    {
      $group: {
        _id: "$_id",
        doc: { $first: "$$ROOT" }
      }
    },
    { $replaceRoot: { newRoot: "$doc" } },

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
const getStudentWithDetails = (studentId) => {
  const today = moment().format("dddd");

  return [
    // 1️⃣ Match the student by ID
    { $match: { _id: new mongoose.Types.ObjectId(studentId) } },

    // 2️⃣ Lookup student enrollments with class info
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

    // 3️⃣ Lookup student fees with fee structure
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

    // 4️⃣ Lookup attendance records
    {
      $lookup: {
        from: "attendances",
        localField: "_id",
        foreignField: "student",
        as: "attendanceRecords"
      }
    },

    // 5️⃣ Lookup assignments
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

    // 6️⃣ Lookup today's timetable for the student's class
    {
      $lookup: {
        from: "teachertimetables",
        let: {
          classId: { $arrayElemAt: ["$enrollments.class", 0] }, // student's current class
          today: today
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$class", "$$classId"] },
                  { $eq: ["$day", "$$today"] },
                  { $eq: ["$status", "active"] }
                ]
              }
            }
          },
          // Populate teacher info
          {
            $lookup: {
              from: "teachers",
              localField: "teacher",
              foreignField: "_id",
              as: "teacherInfo"
            }
          },
          { $unwind: { path: "$teacherInfo", preserveNullAndEmptyArrays: true } },

          // Populate subject info
          {
            $lookup: {
              from: "subjects",
              localField: "subject",
              foreignField: "_id",
              as: "subjectInfo"
            }
          },
          { $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true } },

          // Sort by period
          { $sort: { period: 1 } },

          // Keep only required fields
          {
            $project: {
              _id: 1,
              day: 1,
              period: 1,
              startTime: 1,
              endTime: 1,
              "teacherInfo.name": 1,
              "subjectInfo.name": 1,
              "class": 1
            }
          }
        ],
        as: "todaysTimetable"
      }
    },

    // 7️⃣ Add full parent/guardian info
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

    // 8️⃣ Flatten and merge data
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
              todaysTimetable: "$todaysTimetable",
              parentDetails: "$parentDetails"
            }
          ]
        }
      }
    }

    // 9️⃣ Optionally project only needed fields (if you want cleaner output)
    // {
    //   $project: {
    //     name: 1,
    //     enrollmentDetails: 1,
    //     todaysTimetable: 1,
    //     assignmentsDetails: 1,
    //     feesDetails: 1
    //   }
    // }
  ];
};

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
              subjectsHandled: "$teacherDoc.subjectsHandled",
              specialization: "$teacherDoc.specialization"
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
  const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
  const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");

  return [
    // 1️⃣ Match submissions of the student
    { $match: { student: new mongoose.Types.ObjectId(studentId) } },

    // 2️⃣ Lookup assignment details
    {
      $lookup: {
        from: "assignments",
        localField: "assignment",
        foreignField: "_id",
        as: "assignmentDetails"
      }
    },
    { $unwind: "$assignmentDetails" },

    // 3️⃣ Group by class (since each student belongs to one class)
    {
      $group: {
        _id: "$assignmentDetails.class",
        totalMarksObtained: { $sum: "$marksObtained" },
        totalMaxMarks: { $sum: "$assignmentDetails.maxMarks" },
        assignmentsCount: { $sum: 1 },
        submittedAssignments: {
          $sum: { $cond: [{ $eq: ["$status", "Submitted"] }, 1, 0] }
        },
        gradedAssignments: {
          $sum: { $cond: [{ $eq: ["$status", "Graded"] }, 1, 0] }
        },
        lateSubmissions: {
          $sum: { $cond: [{ $eq: ["$isLate", true] }, 1, 0] }
        },
        classId: { $first: "$assignmentDetails.class" }
      }
    },

    // 4️⃣ Lookup class info
    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "classInfo"
      }
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

    // 5️⃣ Lookup and flatten attendance data
    {
      $lookup: {
        from: "attendances",
        let: {
          classId: "$classId",
          studentId: new mongoose.Types.ObjectId(studentId),
          start: startOfMonth,
          end: endOfMonth
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$class", "$$classId"] },
                  { $gte: ["$date", "$$start"] },
                  { $lte: ["$date", "$$end"] }
                ]
              }
            }
          },
          {
            $project: {
              records: {
                $filter: {
                  input: "$records",
                  as: "rec",
                  cond: { $eq: ["$$rec.student", "$$studentId"] }
                }
              }
            }
          },
          { $unwind: "$records" },
          {
            $group: {
              _id: "$records.status",
              count: { $sum: 1 }
            }
          }
        ],
        as: "attendanceSummary"
      }
    },

    // 6️⃣ Flatten attendance summary into fields
    {
      $addFields: {
        presentCount: {
          $ifNull: [
            {
              $first: {
                $filter: {
                  input: "$attendanceSummary",
                  as: "a",
                  cond: { $eq: ["$$a._id", "Present"] }
                }
              }
            },
            { count: 0 }
          ]
        },
        absentCount: {
          $ifNull: [
            {
              $first: {
                $filter: {
                  input: "$attendanceSummary",
                  as: "a",
                  cond: { $eq: ["$$a._id", "Absent"] }
                }
              }
            },
            { count: 0 }
          ]
        },
        pendingCount: {
          $ifNull: [
            {
              $first: {
                $filter: {
                  input: "$attendanceSummary",
                  as: "a",
                  cond: { $eq: ["$$a._id", "Pending"] }
                }
              }
            },
            { count: 0 }
          ]
        }
      }
    },

    // 7️⃣ Final clean projection (flat root structure)
    {
      $project: {
        _id: 0,
        classId: 1,
        className: "$classInfo.name",
        section: "$classInfo.section",
        totalMarksObtained: 1,
        totalMaxMarks: 1,
        assignmentsCount: 1,
        submittedAssignments: 1,
        gradedAssignments: 1,
        lateSubmissions: 1,
        percentage: {
          $cond: [
            { $eq: ["$totalMaxMarks", 0] },
            0,
            { $multiply: [{ $divide: ["$totalMarksObtained", "$totalMaxMarks"] }, 100] }
          ]
        },
        presentCount: "$presentCount.count",
        absentCount: "$absentCount.count",
        pendingCount: "$pendingCount.count",
        totalDays: {
          $add: [
            "$presentCount.count",
            "$absentCount.count",
            "$pendingCount.count"
          ]
        },
        attendancePercentage: {
          $cond: [
            {
              $eq: [
                {
                  $add: [
                    "$presentCount.count",
                    "$absentCount.count",
                    "$pendingCount.count"
                  ]
                },
                0
              ]
            },
            0,
            {
              $multiply: [
                {
                  $divide: [
                    "$presentCount.count",
                    {
                      $add: [
                        "$presentCount.count",
                        "$absentCount.count",
                        "$pendingCount.count"
                      ]
                    }
                  ]
                },
                100
              ]
            }
          ]
        }
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


module.exports = {
  getAttendanceLookup,

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
  getAssignmentLookup,
  getTeacherAssignByLookup,
  getAllTeachersWithClassLookup,
  getAttendanceLookup,
  teacherAttendancePipeline,
  getGradeLookupPipeline,
  getTeachersAttendancesByMonth,

  // fees
  getAllFeesStructurePipeline,

  // time table
  getTimetableForClassAggregation
}




