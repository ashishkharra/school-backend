const Student = require('../../models/students/student.schema.js')
const Assignment = require('../../models/assignment/assignment.schema.js')
const Attendance = require('../../models/students/attendance.schema.js')
const Submission = require('../../models/assignment/submission.schema.js')
const _ = require('lodash');
const { sendEmail } = require('../../helpers/helper.js')

const mongoose = require('mongoose')
const path = require("path");
const fs = require("fs");


const { studentAttendancePipeline, studentProfilePipeline, studentAssignmentPipeline, getSubmissionWithDetails } = require('../../helpers/commonAggregationPipeline.js')

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
        const { month, date, year, page = 1, limit = 10, teacherNameFilter } = options;
        try {
            const pipeline = studentAttendancePipeline({
                studentId,
                month,
                date,
                year,
                page,
                limit,
                teacherNameFilter
            });

            const data = await Attendance.aggregate(pipeline);
            console.log('data pipeline : ', data)

            // total count for pagination
            const totalCountQuery = { "records.student": new mongoose.Types.ObjectId(studentId) };
            if (year) totalCountQuery.date = { ...totalCountQuery.date, $expr: { $eq: [{ $year: "$date" }, year] } };
            if (month) totalCountQuery.date = { ...totalCountQuery.date, $expr: { $eq: [{ $month: "$date" }, month] } };

            const totalDocs = await Attendance.countDocuments(totalCountQuery);

            return {
                success: true,
                jsonData: data,
                meta: {
                    page,
                    limit,
                    totalDocs,
                    totalPages: Math.ceil(totalDocs / limit)
                }
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
            return { success: false, message: "Error fetching attendance" };
        }
    },

    requestUpdateProfile: async (studentId, requestedFields) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" }
            }

            const student = await Student.findById(studentId)
                .populate('classId')
                .lean();

            if (!student) {
                return { success: false, message: 'STUDENT_NOT_FOUND' }
            }

            const requestedFieldsHtml = Object.entries(requestedFields || {})
                .map(([key, value]) => `${_.startCase(key)}: ${value}`)
                .join('<br/>');

            const emailData = {
                ADMIN_NAME: 'Admin',
                STUDENT_NAME: student.name,
                ROLL_NO: student.rollNo || '',
                CLASS_NAME: student.class?.name || '',
                SECTION: student.class?.section || '',
                REQUESTED_FIELDS: requestedFieldsHtml,
                REQUEST_DATE: new Date().toLocaleString(),
                SCHOOL_NAME: process.env.SCHOOL_NAME || 'Your School'
            };

            const emailSent = await sendEmail('student-profile-update-request', emailData);

            if (!emailSent) {
                return { success: false, message: 'EMAIL_ERROR' }
            }

            return { success: true, message: 'EMAIL_SUCCESSFULLY_SENT' }
        } catch (error) {
            console.error('Error in requestUpdateProfile:', error);
            return { success: false, message: "SERVER_ERROR" }
        }
    },

    submitAssignment: async (studentId, assignmentId, files) => {
        try {
            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) return { success: false, message: "ASSIGNMENT_NOT_FOUND" };

            const now = new Date();
            const isLate = now > assignment.dueDate;

            let submission = await Submission.findOne({ student: studentId, assignment: assignmentId });

            if (submission) {
                // Add as resubmission
                submission.resubmissions.push({
                    files,
                    submittedAt: now,
                    isLate
                });
                submission.status = "Submitted";
                submission.isLate = isLate;
            } else {
                // Create new submission
                submission = await Submission.create({
                    assignment: assignmentId,
                    student: studentId,
                    files,
                    status: "Submitted",
                    isLate
                });
            }

            await submission.save();

            const [populated] = await Submission.aggregate(getSubmissionWithDetails(submission._id));

            return { success: true, message: "SUBMISSION_SUCCESSFUL", data: populated };
        } catch (err) {
            console.error("Submit Assignment Service Error:", err.message);
            return { success: false, message: "SUBMISSION_FAILED" };
        }
    },

    // Teacher grades a submission
    gradeSubmission: async (submissionId, teacherId, marks, feedback) => {
        try {
            const submission = await Submission.findById(submissionId);
            if (!submission) return { success: false, message: "SUBMISSION_NOT_FOUND" };

            submission.marksObtained = marks;
            submission.feedback = feedback;
            submission.gradedBy = teacherId;
            submission.status = "Graded";

            await submission.save();

            const [populated] = await Submission.aggregate(getSubmissionWithDetails(submission._id));

            return { success: true, message: "SUBMISSION_GRADED", data: populated };
        } catch (err) {
            console.error("Grade Submission Service Error:", err.message);
            return { success: false, message: "GRADING_FAILED" };
        }
    },

    // Get submission details
    getSubmissionDetails: async (submissionId) => {
        try {
            const [populated] = await Submission.aggregate(getSubmissionWithDetails(submissionId));
            if (!populated) return { success: false, message: "SUBMISSION_NOT_FOUND" };
            return { success: true, data: populated };
        } catch (err) {
            console.error("Get Submission Details Error:", err.message);
            return { success: false, message: "FETCH_FAILED" };
        }
    }
}

module.exports = studentService