const { default: mongoose } = require("mongoose")
const { getPaginationArray } = require('./helper')

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
  const matchConditions = [];

  if (month) matchConditions.push({ $eq: [{ $month: "$date" }, parseInt(month, 10)] });
  if (year) matchConditions.push({ $eq: [{ $year: "$date" }, parseInt(year, 10)] });

  if (date) {
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");
    matchConditions.push({ $gte: ["$date", start] });
    matchConditions.push({ $lte: ["$date", end] });
  }

  return [
    { $unwind: "$records" },

    { $match: { "records.student": new mongoose.Types.ObjectId(studentId) } },

    {
      $addFields: {
        status: "$records.status",
        remarks: "$records.remarks",
        classId: "$class",
      },
    },

    ...(matchConditions.length ? [{ $match: { $expr: { $and: matchConditions } } }] : []),

    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    { $unwind: "$classInfo" },

    {
      $lookup: {
        from: "teachers",
        localField: "classInfo.teacher",
        foreignField: "_id",
        as: "teacherInfo",
      },
    },
    { $unwind: "$teacherInfo" },

    ...(teacherNameFilter ? [{ $match: { "teacherInfo.name": teacherNameFilter } }] : []),

    {
      $project: {
        _id: 0,
        student: studentId,
        date: 1,
        session: 1,
        status: 1,
        remarks: 1,
        className: "$classInfo.name",
        teacherName: "$teacherInfo.name",
      },
    },

    { $sort: { date: -1, session: 1 } },

    ...getPaginationArray(page, limit),
  ];
};

const studentProfilePipeline = (studentId) => {
  const _id = new mongoose.Types.ObjectId(studentId);

  return [
    { $match: { _id } },

    // Lookup class details from enrollments
    {
      $lookup: {
        from: "classes",
        localField: "enrollments.class",
        foreignField: "_id",
        as: "enrolledClasses"
      }
    },

    // Lookup last 5 attendance records
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

    // Merge enrollments with class info
    {
      $addFields: {
        enrollments: {
          $map: {
            input: "$enrollments",
            as: "enroll",
            in: {
              year: "$$enroll.year",
              section: "$$enroll.section",
              classId: "$$enroll.class",
              className: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: "$enrolledClasses",
                          as: "cls",
                          cond: { $eq: ["$$cls._id", "$$enroll.class"] }
                        }
                      },
                      as: "cls",
                      in: "$$cls.name"
                    }
                  },
                  0
                ]
              }
            }
          }
        }
      }
    },

    // Flatten everything for final output
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
        enrollments: 1,
        recentAttendance: 1,
        parents: 1
      }
    }
  ];
};

const getClassWithStudentsPipeline = (classId, skip = 0, limit = 10, studentFilter = {}) => [
  { $match: { _id: new mongoose.Types.ObjectId(classId) } },
  {
    $lookup: {
      from: "students",
      let: { classId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$class", "$$classId"] }, ...studentFilter } },
        { $sort: { rollNo: 1 } }, // sort by rollNo
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            name: 1,
            rollNo: 1,
            section: 1,
            academicYear: 1,
            status: 1,
            gender: 1,
            physicalDisability: 1
          }
        }
      ],
      as: "students"
    }
  },
  {
    $project: {
      name: 1,
      subject: 1,
      teacher: 1,
      students: 1
    }
  }
];

const getStudentDetailsPipeline = (studentId) => [
  { $match: { _id: new mongoose.Types.ObjectId(studentId) } },

  // 1. Class info
  {
    $lookup: {
      from: "classes", // collection name
      localField: "class",
      foreignField: "_id",
      as: "classInfo"
    }
  },
  { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

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

  // 4. Assignment submissions
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
            "submissions.$": 1
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
      rollNo: 1,
      dob: 1,
      gender: 1,
      bloodGroup: 1,
      phone: 1,
      address: 1,
      parents: 1,
      guardian: 1,
      emergencyContact: 1,
      physicalDisability: 1,
      disabilityDetails: 1,
      profilePic: 1,
      status: 1,
      isRemoved: 1,
      removedAt: 1,
      removedReason: 1,
      classInfo: 1,
      attendanceRecords: 1,
      feesRecords: 1,
      assignments: 1,
      grades: 1
    }
  }
];

module.exports = {
  studentAttendancePipeline,
  studentProfilePipeline,
  studentAssignmentPipeline,
  getClassWithStudentsPipeline,
  getStudentDetailsPipeline
}