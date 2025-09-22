const Student = require('../../models/students/student.schema.js')
const Assignment = require('../../models/assignment/assignment.schema.js')
const Attendance = require('../../models/students/attendance.schema.js')
const mongoose = require('mongoose')
const path = require("path");
const fs = require("fs");


const { studentAttendancePipeline, studentProfilePipeline, studentAssignmentPipeline } = require('../../helpers/commonAggregationPipeline.js')

const studentService = {
    downloadAssignmentService: async (studentId, assignmentId) => {
        try {
            const student = await Student.findById(studentId);
            if (!student) return { success: false, message: "Student not found" };

            const data = await Assignment.aggregate(studentAssignmentPipeline(assignmentId));
            if (!data || data.length === 0) return { success: false, message: "Assignment not found" };

            const assignment = data[0];

            const enrolledClassIds = student.enrollments.map(e => e.class.toString());
            if (!enrolledClassIds.includes(assignment.classInfo._id.toString())) {
                return { success: false, message: "You are not enrolled in this class" };
            }

            const filePath = path.join(__dirname, "../uploads/assignments", assignment.fileUrl);
            if (!fs.existsSync(filePath)) return { success: false, message: "File not found on server" };

            return { success: true, filePath, fileName: assignment.fileUrl, assignment };
        } catch (error) {
            console.error("Service error:", error);
            return { success: false, message: "Something went wrong" };
        }
    },

    getStudentProfile: async (studentId) => {
        try {
            const pipeline = studentProfilePipeline(studentId);
            const result = await Student.aggregate(pipeline);
            return result[0] || null;
        } catch (error) {
            console.error("Error in getStudentProfile service:", error);
            return null;
        }
    },

    getAttendanceByClass: async (studentId, options) => {
        try {

            const { month, date, year, page = 1, limit = 10, teacher } = options;

            const pipeline = studentAttendancePipeline({
                studentId,
                month,
                date,
                year,
                page,
                limit,
                teacher
            });

            const totalCountFilter = { "records.student": new mongoose.Types.ObjectId(studentId) };

            // if (year || month) {
            //     totalCountFilter.$expr = { $and: [] };
            //     if (year) totalCountFilter.$expr.$and.push({ $eq: [{ $year: "$date" }, parseInt(year, 10)] });
            //     if (month) totalCountFilter.$expr.$and.push({ $eq: [{ $month: "$date" }, parseInt(month, 10)] });
            // }

            // if (date) {
            //     const start = new Date(date + "T00:00:00.000Z");
            //     const end = new Date(date + "T23:59:59.999Z");
            //     totalCountFilter.date = { $gte: start, $lte: end };
            // }

            const attendanceData = await Attendance.aggregate(pipeline)

            const jsonData = attendanceData[0]?.docs || [];

            const meta = {
                studentId,
                month,
                date,
                year,
                page,
                limit,
                totalDocs: attendanceData[0]?.totalDocs,
                totalPages: attendanceData[0]?.totalPages
            };

            return {
                success: true,
                jsonData,
                meta
            };


        } catch (error) {
            console.error("Error fetching attendance:", error);
            return { success: false, message: "Error fetching attendance" };
        }
    }

}

module.exports = studentService