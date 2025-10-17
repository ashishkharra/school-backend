const mongoose = require('mongoose')
const studentService = require('../../services/students/student.service.js')
const { responseData } = require('../../helpers/responseData.js')

const studentController = {
    studentForgotPassword: async (req, res) => {
        try {
            await studentService.studentForgotPassword(req, res)
        } catch (error) {
            const msg = error.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {error : error.message}, req))
        }
    },

    studentResetPassword: async (req, res) => {
        try {
            await studentService.studentResetPassword(req, res)
        } catch (error) {
            const msg = error.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {error : error.message}, req))
        }
    },

    changePassword: async (req, res) => {
        try {
            await studentService.changePassword(req, res)
        } catch (error) {
            const msg = error.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {error : error.message}, req))
        }
    },

    downloadAssignment: async (req, res) => {
        try {
            const { assignmentId } = req.params;
            const studentId  = req.user?._id;

            if (!studentId || !assignmentId) {
                return res.status(400).json(responseData("INVALID_CREDENTIALS", {}, req));
            }

            if (!mongoose.isValidObjectId(studentId)) {
                return res.status(400).json(responseData("INVALID_STUDENT_ID", {}, req));
            }

            if (!mongoose.isValidObjectId(assignmentId)) {
                return res.status(400).json(responseData("INVALID_ASSIGNMENT_ID", {}, req));
            }

            const result = await studentService.downloadAssignmentService(studentId, assignmentId);
            console.log("result----", result)
            if (!result.success) {
                return res.status(result.message.includes("not found") ? 404 : 403).json(responseData('ASSIGNMENT_NOT_FOUND', {}, req, false));
            }

            res.status(200).json({ status: result?.status, message: result?.message }).download(result.filePath, result.fileName);

        } catch (error) {
            console.error("Controller error:", error);
            return res.status(500).json(responseData("SOMETHING_WENT_WRONG", {error : error.message}, req));
        }
    },

    viewProfile: async (req, res) => {
        try {
            const studentId  = req.user?._id;

            if (!studentId) {
                return res.status(400).json(responseData("STUDENT_ID_REQUIRED", {}, req));
            }

            if (!mongoose.isValidObjectId(studentId)) {
                return res.status(400).json(responseData("INVALID_STUDENT_ID", {}, req));
            }

            const profile = await studentService.getStudentProfile(studentId);

            if (!profile) {
                return res.status(404).json(responseData("STUDENT_NOT_FOUND", {}, req));
            }

            return res.status(200).json(responseData("STUDENT_PROFILE_FETCHED", profile, req, true));

        } catch (error) {
            console.error("Error fetching student profile:", error.message);
            return res.status(500).json(responseData("SOMETHING_WENT_WRONG", {error : error.message}, req));
        }
    },

    viewAttendanceByClass: async (req, res) => {
        try {
            const studentId  = req.user?._id;
            const { month, date, year, page = 1, limit = 10, teacher } = req.query;

            if (!studentId) {
                return res.status(400).json(responseData("STUDENT_ID_REQUIRED", {}, req));
            }
            if (!mongoose.isValidObjectId(studentId)) {
                return res.status(400).json(responseData("INVALID_STUDENT_ID", {}, req));
            }

            const attendance = await studentService.getAttendanceByClass(studentId, {
                month: month ? parseInt(month, 10) : null,
                year: year ? parseInt(year, 10) : null,
                date: date || null,
                page: parseInt(page, 10) || 1,
                limit: parseInt(limit, 10) || 10,
                teacherNameFilter: teacher || null
            });

            if (!attendance) {
                return res.status(500).json(responseData("ERROR_FETCHING_ATTENDANCE", {}, req, false));
            }

            return res.status(200).json(responseData("GET_ATTENDANCE", attendance, req, true));
        } catch (error) {
            console.log("Error in viewAttendanceByClass:", error);
            return res.status(500).json(responseData("SOMETHING_WENT_WRONG", {error : error.message}, req));
        }
    },

    requestUpdateProfile: async (req, res) => {
        try {
            const studentId  = req.user?._id;
            const { requestedFields } = req.body
            // const { id } = req.user;
            const result = await studentService.requestUpdateProfile(studentId, requestedFields);

            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false))
            }
            return res
                .status(200)
                .json(responseData(result?.message, { studentId }, req, true));
        } catch (error) {
            console.error('Error in requestUpdateProfile:', error.message);
            return res
                .status(500)
                .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
        }
    },

    submitAssignment: async (req, res) => {
        try {
            const { assignmentId,  classId } = req.body;
            const studentId = req.user._id;

            const files = [];
            if (req.file) files.push(req.file);
            if (req.files && req.files.length > 0) files.push(...req.files);

            if (!files.length) {
                return res.status(400).json(responseData("NO_FILES_UPLOADED", {}, req, false));
            }

            const result = await studentService.submitAssignment(studentId, assignmentId, classId, files);

            return res.status(result.success ? 200 : 400).json(
                responseData(result.message, result.data || {}, req, result.success)
            );
        } catch (error) {
            console.error(error);
            return res.status(500).json(responseData("SERVER_ERROR", {error : error.message}, req, false));
        }
    },

    gradeSubmission: async (req, res) => {
        try {
            const { submissionId } = req.params;
            const teacherId = req.user._id;
            const { marks, feedback } = req.body;

            const result = await studentService.gradeSubmission(submissionId, teacherId, marks, feedback);
            return res.status(result.success ? 200 : 400).json(responseData(result.message, result.data, req, result.success));
        } catch (error) {
            console.error(error);
            return res.status(500).json(responseData("SERVER_ERROR", {error : error.message}, req, false));
        }
    },

    getSubmissionDetails: async (req, res) => {
        try {
            const { submissionId } = req.params;
            const result = await studentService.getSubmissionDetails(submissionId);
            return res.status(result.success ? 200 : 404).json(responseData(result.message, result.data, req, result.success));
        } catch (error) {
            console.error(error);
            return res.status(500).json(responseData("SERVER_ERROR", {error : error.message}, req, false));
        }
    },

    studentDashboard: async (req, res) => {
        try {
            const studentId = req.user._id;
            
            if (!studentId) {
                return res.status(400).json(responseData("STUDENT_ID_REQUIRED", {}, req, false));
            }

            const result = await studentService.getStudentDashboard(studentId);

            if (!result.success) {
                return res.status(result.message.includes("not found") ? 404 : 400).json(responseData(result.message, {}, req, false));
            }

            return res.status(200).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.error('Error while fetching student dashboard:', error);
            return res.status(500).json(responseData("SERVER_ERROR", {error : error.message}, req, false));
        }
    }

}

module.exports = studentController