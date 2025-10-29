const Student = require('../../models/students/student.schema.js')
const Assignment = require('../../models/assignment/assignment.schema.js')
const Attendance = require('../../models/students/attendance.schema.js')
const Submission = require('../../models/assignment/submission.schema.js')
const StudentFee = require('../../models/fees/studentFee.schema.js')
const Grade = require('../../models/assignment/grades.schema.js')
const _ = require('lodash');
const { sendEmail } = require('../../helpers/helper.js')
const { responseData } = require('../../helpers/responseData.js')

const mongoose = require('mongoose')
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { v4 } = require("uuid");
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { studentAttendancePipeline, studentProfilePipeline, studentAssignmentPipeline, getSubmissionWithDetails, studentDashboardPipeline } = require('../../helpers/commonAggregationPipeline.js')

const studentService = {
    studentForgotPassword: async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const student = await Student.findOne({ email });

            if (student) {
                const resetToken = jwt.sign(
                    { id: student._id, email: student.email },
                    process.env.JWT_SECRET,
                    { expiresIn: "15m" }
                );
                await Student.findOneAndUpdate(
                    { email },
                    { token: resetToken }
                );

                const link = `${process.env.RESET_PASSWORD_LINK}/${resetToken}`;

                const dataBody = {
                    email: email,
                    EMAIL: email,
                    LINK: link,
                    STUDENT_NAME: student.name
                };

                try {
                    await sendEmail("student-forgot-password", dataBody);
                    return res.json(responseData("EMAIL_SENT", {}, req, true));
                } catch (emailErr) {
                    console.error("Email sending failed:", emailErr.message);
                    return res.json(responseData("EMAIL_SEND_FAILED", {}, req, false));
                }
            } else {
                return res.json(responseData("STUDENT_EMAIL_NOT_FOUND", {}, req, false));
            }
        } catch (err) {
            console.error("Error:", err.message);
            return res.json(responseData("ERROR_OCCUR", {}, req, false));
        }
    },

    studentResetPassword: async (req, res) => {
        try {
            const { password } = req.body
            const token = req.params.token

            const resetToken = await Student.findOne({ token })
            const passwordMatch = await bcrypt.compare(password, resetToken?.password)
            if (passwordMatch) {
                return res.json(responseData('PASSWORD_SAME_ERORR', {}, req, false))
            }
            if (!isEmpty(resetToken)) {
                let salt = await genSalt(10)
                let hash = await genHash(password, salt)
                if (!isEmpty(hash)) {
                    await Student.findOneAndUpdate(
                        { _id: resetToken._id },
                        { password: hash, token: null, forceLogout: true }
                    )
                    return res.json(responseData('PASSWORD_CHANGED', {}, req, true))
                } else {
                    return res.json(responseData('ERROR_OCCUR', {}, req, false))
                }
            } else {
                return res.json(responseData('LINK_INVALID', {}, req, false))
            }
        } catch (err) {
            console.log('Error', err.message)
            return res.json(responseData('ERROR_OCCUR', {}, req, false))
        }
    },

    changePassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body
            const { _id } = req.user

            const student = await Student.findOne({ _id })
            const isPasswordMatch = await bcrypt.compare(oldPassword, student.password)

            if (!isPasswordMatch) {
                return res.json(responseData('INVALID_OLD_PASSWORD', {}, req, false))
            }

            if (oldPassword === newPassword) {
                return res.json(responseData('PASSWORD_SAME_ERROR', {}, req, false))
            }

            const salt = await bcrypt.genSalt(10)
            const hash = await bcrypt.hash(newPassword, salt)

            if (!hash) {
                return res.json(responseData('ERROR_OCCUR', {}, req, false))
            }

            await Student.findOneAndUpdate(
                { _id },
                {
                    password: hash,
                    isPasswordSet: true,
                    forceLogout: true
                }
            )

            return res.json(responseData('PASSWORD_CHANGED', {}, req, true))
        } catch (err) {
            console.log('Error', err.message)
            return res.json(responseData('ERROR_OCCUR', {}, req, false))
        }
    },

    downloadAssignmentService: async (studentId, assignmentId) => {
        try {
            const student = await Student.findById(studentId);
            if (!student) return { success: false, message: "Student not found" };
            // console.log(studentAssignmentPipeline)
            const data = await Assignment.aggregate(studentAssignmentPipeline(assignmentId));
            console.log('assignment data : ', data)
            if (data.length < 1) {
                return { success: false, message: "Assignment not found" };
            }

            const assignment = data[0];

            // const enrolledClassIds = student.enrollments.map(e => e.class.toString());
            // if (!enrolledClassIds.includes(assignment.classInfo._id.toString())) {
            //     return { success: false, message: "UNAUTHORIZED_CLASS" };
            // }

            const filePath = path.join(__dirname, "../..", assignment.fileUrl);
            console.log("filePath----", filePath)
            if (!fs.existsSync(filePath)) return { success: false, message: "FILE_NOT_FOUND" };

            return { status: 200, success: true, filePath, message: "ASSIGNMENT_DOWNLOADED_SUCCESSFULLY", fileName: assignment.fileUrl, assignment };
        } catch (error) {
            console.error("Error while downloading assignment : ", error);
            return { success: false, message: "SEVER_ERROR" };
        }
    },

    getStudentProfile: async (studentId) => {
        try {
            const pipeline = studentProfilePipeline(studentId);
            let result = await Student.aggregate(pipeline);

            result[0].profilePic = process.env.STATIC_URL + result[0].profilePic
            result[0].aadharFront = process.env.STATIC_URL + result[0].aadharFront
            result[0].aadharBack = process.env.STATIC_URL + result[0].aadharBack

            console.log('rsult : ', result[0])
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

            // total count for pagination
            const totalCountQuery = { "records.student": new mongoose.Types.ObjectId(studentId) };
            if (year) totalCountQuery.date = { ...totalCountQuery.date, $expr: { $eq: [{ $year: "$date" }, year] } };
            if (month) totalCountQuery.date = { ...totalCountQuery.date, $expr: { $eq: [{ $month: "$date" }, month] } };

            const totalDocs = await Attendance.countDocuments(totalCountQuery);

            if (!totalDocs) return { success: false, message: 'ERROR_FETCHING_ATTENDANCE' }

            return {
                success: true,
                message: 'GET_ATTENDANCE',
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

    submitAssignment: async (studentId, assignmentId, classId, files) => {
        try {
            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) return { success: false, message: "ASSIGNMENT_NOT_FOUND" };

            const now = new Date();
            const isLate = now > assignment.dueDate;

            let submission = await Submission.findOne({ student: studentId, assignment: assignmentId, class: classId });

            const formattedFiles = files.map(f => ({
                fileUrl: f.path,
                fileName: f.originalname,
                fileType: f.mimetype,
                uploadedAt: new Date()
            }));

            if (submission) {
                if (submission.files.length > 0) {
                    submission.resubmissions.push({
                        files: submission.files,
                        submittedAt: submission.submittedAt,
                        isLate: submission.isLate
                    });
                }

                submission.files = formattedFiles;
                submission.submittedAt = now;
                submission.status = "Submitted";
                submission.isLate = isLate;
                submission.class = classId;

                await submission.save();
            } else {
                submission = await Submission.create({
                    assignment: assignmentId,
                    student: studentId,
                    files: formattedFiles,
                    submittedAt: now,
                    status: "Submitted",
                    isLate
                });
            }

            const populated = await Submission.findById(submission._id)
                .populate("assignment")
                .populate("student")
                .populate("gradedBy")
                .lean();

            return { success: true, message: "SUBMISSION_SUCCESSFUL", data: populated };
        } catch (err) {
            console.error("Submit Assignment Service Error:", err);
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
    getSubmissionDetails: async (submissionId, studentId) => {
        try {
            console.log("Inside submission")
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success : false, message : "STUDENT_ID_NOT_VALID"}
            }
            const [populated] = await Submission.aggregate(getSubmissionWithDetails(submissionId));
            if (!populated) return { success: false, message: "SUBMISSION_NOT_FOUND" };
            return { success: true, data: populated };
        } catch (err) {
            console.log("Inside submission error")
            console.error("Get Submission Details Error:", err.message);
            return { success: false, message: "FETCH_FAILED" };
        }
    },

    getStudentDashboard: async (studentId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" };
            }

            const pipeline = studentDashboardPipeline(studentId);
            const result = await Submission.aggregate(pipeline);

            console.log('resss ------ ', result)

            if (result.length === 0) {
                return { success: false, message: "STUDENT_NOT_FOUND" };
            }

            const data = result;

            const overall = data.reduce(
                (acc, subj) => {
                    acc.totalMarksObtained += subj.totalMarksObtained;
                    acc.totalMaxMarks += subj.totalMaxMarks;
                    acc.totalAssignments += subj.assignmentsCount;
                    acc.totalSubmitted += subj.submittedAssignments;
                    acc.totalLate += subj.lateSubmissions;
                    return acc;
                },
                {
                    totalMarksObtained: 0,
                    totalMaxMarks: 0,
                    totalAssignments: 0,
                    totalSubmitted: 0,
                    totalLate: 0,
                }
            );

            const overallPercentage = overall.totalMaxMarks
                ? (overall.totalMarksObtained / overall.totalMaxMarks) * 100
                : 0;

            const gradeData = await Submission.aggregate([
                { $unwind: "$grades" },
                { $match: { "grades.student": new mongoose.Types.ObjectId(studentId) } },
                {
                    $lookup: {
                        from: "assignments",
                        localField: "grades.assignment",
                        foreignField: "_id",
                        as: "assignmentInfo",
                    },
                },
                { $unwind: "$assignmentInfo" },
                {
                    $project: {
                        _id: 0,
                        assignmentId: "$grades.assignment",
                        subjectId: "$assignmentInfo.subject",
                        assignmentTitle: "$assignmentInfo.title",
                        marks: "$grades.marks",
                        grade: "$grades.grade",
                        remark: "$grades.remark",
                        status: "$grades.status",
                        createdAt: "$grades.createdAt",
                    },
                },
                { $sort: { createdAt: -1 } },
            ]);

            const subjectGrades = await Submission.aggregate([
                { $unwind: "$grades" },
                { $match: { "grades.student": new mongoose.Types.ObjectId(studentId) } },
                {
                    $lookup: {
                        from: "assignments",
                        localField: "grades.assignment",
                        foreignField: "_id",
                        as: "assignmentInfo",
                    },
                },
                { $unwind: "$assignmentInfo" },
                {
                    $group: {
                        _id: "$assignmentInfo.subject",
                        averageMarks: { $avg: "$grades.marks" },
                        totalAssignments: { $sum: 1 },
                        graded: {
                            $sum: {
                                $cond: [{ $eq: ["$grades.status", "Graded"] }, 1, 0],
                            },
                        },
                        pending: {
                            $sum: {
                                $cond: [{ $eq: ["$grades.status", "Submitted"] }, 1, 0],
                            },
                        },
                    },
                },
            ]);

            return {
                success: true,
                message: "DASHBOARD_DATA_FETCHED",
                data: {
                    subjects: data,
                    overall: {
                        ...overall,
                        overallPercentage: Number(overallPercentage.toFixed(2)),
                    },
                    grades: {
                        recent: gradeData.slice(0, 5),
                        subjects: subjectGrades,
                    },
                },
            };
        } catch (error) {
            console.error("Error in getStudentDashboard service:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    getAllAssignmentOfClass: async (classId, title, subject, page = 1, limit = 10) => {
        try {
            const query = { class: classId };

            // 🔍 Apply filters if provided
            const filters = [];
            if (title && title.trim() !== "") {
                filters.push({ title: { $regex: title, $options: "i" } });
            }
            if (subject && subject.trim() !== "") {
                filters.push({ subject: { $regex: subject, $options: "i" } });
            }

            if (filters.length > 0) {
                query.$or = filters; // match either title or subject
            }

            // Pagination setup
            const skip = (page - 1) * limit;

            // Count total
            const total = await Assignment.countDocuments(query);

            // Fetch paginated assignments
            let assignments = await Assignment.find(query)
                .select("title description dueDate maxMarks fileUrl resources subject uploadedBy createdAt")
                .populate("uploadedBy", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            assignments.map(a => {
                a.fileUrl = process.env.STATIC_URL_ + a.fileUrl
            })

            // Handle no data
            if (!assignments || assignments.length === 0) {
                return {
                    success: false,
                    message: "ASSIGNMENT_NOT_FOUND",
                    data: [],
                    pagination: {
                        total: 0,
                        page,
                        limit,
                        totalPages: 0
                    }
                };
            }

            // ✅ Successful response
            return {
                success: true,
                message: "ASSIGNMENT_FETCHED_SUCCESSFULLY",
                data: assignments,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error("Error fetching assignments:", error);
            return {
                success: false,
                message: "SERVER_ERROR",
                error: error.message
            };
        }
    },

    performance: async (studentId) => {
        try {
            const student = await Student.findById(studentId);
            if (!student) {
                return { success: false, message: "STUDENT_NOT_FOUND" };
            }

            console.log('student : ', student)

            const grades = await Grade.find({ student: studentId });
            const averageGrade =
                grades.length > 0
                    ? grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length
                    : 0;

            const attendanceRecords = await Attendance.aggregate([
                { $unwind: "$records" },
                { $match: { "records.student": student._id } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        present: {
                            $sum: {
                                $cond: [{ $eq: ["$records.status", "Present"] }, 1, 0],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        attendancePercentage: {
                            $cond: [{ $eq: ["$total", 0] }, 0, { $multiply: [{ $divide: ["$present", "$total"] }, 100] }],
                        },
                    },
                },
            ]);
            const attendancePercentage = attendanceRecords[0]?.attendancePercentage || 0;

            const fee = await StudentFee.findOne({ studentId });
            const feeCompletion =
                fee && fee.totalFee > 0
                    ? (fee.paidTillNow / fee.totalFee) * 100
                    : 0;

            const overallScore = Math.round(
                (averageGrade * 0.6) + (attendancePercentage * 0.3) + (feeCompletion * 0.1)
            );

            return {
                success: true,
                message: "STUDENT_PERFORMANCE_FETCHED",
                data: {
                    studentId,
                    averageGrade: averageGrade.toFixed(2),
                    attendancePercentage: attendancePercentage.toFixed(2),
                    feeCompletion: feeCompletion.toFixed(2),
                    overallScore,
                    performanceLevel:
                        overallScore >= 85
                            ? "Excellent"
                            : overallScore >= 70
                                ? "Good"
                                : overallScore >= 50
                                    ? "Average"
                                    : "Needs Improvement",
                },
            };
        } catch (error) {
            console.error("Error calculating performance:", error);
            return { success: false, message: error.message };
        }
    }

}

module.exports = studentService