const Student = require("../../models/students/student.schema.js");
const Class = require("../../models/class/class.schema.js");
const Attendance = require('../../models/students/attendance.schema.js')
// const Fees = require('../../models/fees')
const Assignment = require('../../models/assignment/assignment.schema.js')
const Enrollment = require('../../models/students/studentEnrollment.schema.js')

const adminStudent = {
    addStudent: async (studentData) => {
        const { name, dob, gender, email, phone, address, parents, classId, year, section } = studentData;

        // 1. Find class
        const classObj = await Class.findById(classId);
        if (!classObj) {
            return { success: false, message: "CLASS_NOT_FOUND" };
        }

        // 2. Create student (basic info)
        const student = await Student.create({
            name,
            dob,
            gender,
            email: email || null,
            phone: phone || null,
            address,
            parents,
        });

        // 3. Generate roll number
        classObj.studentCount += 1;
        const rollNo = `${classObj.name}-${String(classObj.studentCount).padStart(3, "0")}`;

        // 4. Prepare async operations
        const tasks = [
            Enrollment.create({
                student: student._id,
                class: classId,
                year,
                section,
                rollNo,
            }),
            Student.findByIdAndUpdate(student._id, { rollNo }),
            Class.findByIdAndUpdate(classId, {
                $inc: { studentCount: 0 }, // keep the new count
                $push: { students: student._id }
            })
        ];

        // 5. Run all in parallel with allSettled
        const results = await Promise.allSettled(tasks);

        const summary = results.map((r, i) => ({
            task: ["enrollment", "updateStudent", "updateClass"][i],
            status: r.status,
            value: r.value || r.reason.message,
        }));

        return {
            success: true,
            student,
            rollNo,
            summary, // shows which operations passed/failed
        };
    },

    // Get All Students
    getStudentAccordingClas: async (classId, updateData, page = 1, limit = 10) => {
        await Class.findByIdAndUpdate(classId, updateData, { new: true });

        const skip = (page - 1) * limit;

        const result = await Class.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(classId) } },
            {
                $lookup: {
                    from: "Student",
                    let: { classId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$class", "$$classId"] } } },
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        { $project: { name: 1, email: 1, rollNo: 1 } }
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
        ]);

        const totalStudents = await Student.countDocuments({ class: classId });

        return {
            class: result[0],
            pagination: {
                page,
                limit,
                totalStudents,
                totalPages: Math.ceil(totalStudents / limit)
            }
        };
    },

    // Get Student by ID
    getStudentById: async (id) => {
        const result = await Student.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },

            {
                $lookup: {
                    from: "Class",
                    localField: "class",
                    foreignField: "_id",
                    as: "classInfo"
                }
            },
            { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "Attendance",
                    localField: "_id",
                    foreignField: "student",
                    as: "attendanceRecords"
                }
            },


            // {
            //     $lookup: {
            //         from: "Fees",
            //         localField: "_id",
            //         foreignField: "student",
            //         as: "feesRecords"
            //     }
            // },

            {
                $lookup: {
                    from: "Assignment",
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

            {
                $project: {
                    name: 1,
                    email: 1,
                    rollNo: 1,
                    classInfo: { name: 1, subject: 1 },
                    attendanceRecords: 1,
                    // feesRecords: 1,
                    assignments: 1,
                    grades: 1
                }
            }
        ]);

        return result[0];
    },
}

module.exports = adminStudent