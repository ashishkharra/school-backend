// services/studentService.js
const Student = require("../../models/student.schema.js");
const Class = require("../../models/class.schema.js");
const Attendance = require('../../models/attendance.schema.js')
const Fees = require('../../models/fees.schema.js')
const Assignment = require('../../models/assignment.schema.js')

const adminStudent = {
    // Create Student
    addStudent: async (studentData) => {
        const { name, email, classId } = studentData;

        const classObj = await Class.findById(classId);
        if (!classObj) {
            return null
        }

        classObj.studentCount += 1;
        const rollNo = `${classObj.name}-${String(classObj.studentCount).padStart(3, "0")}`;

        // Save student
        const student = new Student({
            name,
            email,
            class: classId,
            rollNo,
        });
        await student.save();

        classObj.students.push(student._id);
        await classObj.save();

        return student;
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


            {
                $lookup: {
                    from: "Fees",
                    localField: "_id",
                    foreignField: "student",
                    as: "feesRecords"
                }
            },

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
                    feesRecords: 1,
                    assignments: 1,
                    grades: 1
                }
            }
        ]);

        return result[0];
    },

    // Update Student
    updateStudentProfile: async (id, data) => {
        return await Student.findByIdAndUpdate(id, data, { new: true });
    },

    updateStudentClass: async (id, newClassId) => {
        const student = await Student.findById(id);
        if (!student) return null

        if (student.class) {
            await Class.findByIdAndUpdate(student.class, {
                $pull: { students: student._id },
                $inc: { studentCount: -1 },
            });
        }

        const updatedClass = await Class.findByIdAndUpdate(
            newClassId,
            { $push: { students: student._id }, $inc: { studentCount: 1 } },
            { new: true }
        );

        student.class = newClassId;
        student.rollNo = `${updatedClass.name.toUpperCase()}-${updatedClass.studentCount}`;
        await student.save();

        return student;
    },

    updateStudentGrades: async (id, grades) => {
        return await Student.findByIdAndUpdate(
            id,
            { grades },
            { new: true }
        );
    },
    
    updateStudentAttendance: async (studentId, attendanceId, updateData) => {
        return await Attendance.findOneAndUpdate(
            { _id: attendanceId, student: studentId },
            updateData,
            { new: true }
        );
    },

    updateStudentFees : async (studentId, feeId, updateData) => {
        return await Fees.findOneAndUpdate(
            { _id: feeId, student: studentId },
            updateData,
            { new: true }
        );
    },

    // Delete Student
    deleteStudentById: async (id) => {

        const student = await Student.findById(id);
        if (!student) return null

        await Class.findByIdAndUpdate(student.class, {
            $pull: { students: student._id },
            $inc: { studentCount: -1 },
        });

        await Attendance.deleteMany({ student: student._id });

        await Fees.deleteMany({ student: student._id });

        await Assignment.updateMany(
            { "submissions.student": student._id },
            { $pull: { submissions: { student: student._id } } }
        );

        return await Student.findByIdAndDelete(id);
    }
}

module.exports = adminStudent