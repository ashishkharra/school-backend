const mongoose = require('mongoose')
const studentService = require('../../services/students/student.service.js')
const { responseData } = require('../../helpers/responseData.js')
const { sendEmail } = require('../../helpers/helper.js')

const studentController = {
    downloadAssignment: async (req, res) => {
        try {
            const { studentId, assignmentId } = req.params;

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

            if (!result.success) {
                return res.status(
                    result.message.includes("not found") ? 404 : 403
                ).json(responseData('ASSIGNMENT_NOT_FOUND', {}, req));
            }

            res.download(result.filePath, result.fileName);

        } catch (error) {
            console.error("Controller error:", error);
            return res.status(500).json(responseData("SOMETHING_WENT_WRONG", {}, req));
        }
    },

    viewProfile: async (req, res) => {
        try {
            const { studentId } = req.params;

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
            return res.status(500).json(responseData("SOMETHING_WENT_WRONG", {}, req));
        }
    },

    viewAttendanceByClass: async (req, res) => {
        try {
            const { studentId } = req.params;
            const { month, date, year, page, limit, teacher } = req.query;

            if (!studentId) {
                return res.status(400).json(responseData("STUDENT_ID_REQUIRED", {}, req));
            }

            if (!mongoose.isValidObjectId(studentId)) {
                return res.status(400).json(responseData("INVALID_STUDENT_ID", {}, req));
            }

            const pageNum = !isNaN(parseInt(page, 10)) && parseInt(page, 10) > 0
                ? parseInt(page, 10)
                : process.env.DEFAULT_PAGE;
            const limitNum = !isNaN(parseInt(limit, 10)) && parseInt(limit, 10) > 0
                ? parseInt(limit, 10)
                : process.env.DEFAULT_LIMIT;

            const attendance = await studentService.getAttendanceByClass(
                studentId,
                {
                    month: month ? parseInt(month, 10) : null,
                    year: year ? parseInt(year, 10) : null,
                    date: date || null,
                    page: pageNum,
                    limit: limitNum,
                }
            );

            if (!attendance.success) {
                return res.status(500).json(responseData("ERROR_FETCHING_ATTENDANCE", {}, req));
            }

            return res.status(200).json(responseData("GET_ATTENDANCE", attendance, req, true));

        } catch (error) {
            console.error("Error in viewAttendanceByClass:", error.message);
            return res.status(500).json(responseData("SOMETHING_WENT_WRONG", {}, req));
        }
    },

    requestUpdateProfile: async (req, res) => {
        try {
            const { studentId } = req.params
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
    }

}

module.exports = studentController