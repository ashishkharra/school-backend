const { responseData } = require("../../helpers/responseData");
const adminAssignmentService = require("../../services/admins/admin.assignment.service");

const adminAssignments = {
    getAssignment: async (req, res) => {
        try {
            const { classId, section } = req.query;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;
            const result = await adminAssignmentService.adminAssignment(classId, skip, limit)

            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false))
            }

            return res.status(200).json(responseData(result?.success, result, req, result?.success || true))
        } catch (error) {
            console.log("error while fetching assignments : ", error.message);
            return res.status(500).json(responseData('SERVER_ERROR', { error : error.message }, req, false))
        }
    },

    getSubmissions: async (req, res) => {
        try {
            const { classId, studentId } = req.query;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const result = await adminAssignmentService.getSubmissions(classId, studentId, page, limit)

            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false))
            }

            return res.status(200).json(responseData(result?.success, result, req, result?.success || true))
        } catch (error) {
            console.log("error while fetching submissions : ", error.message);
            return res.status(500).json(responseData('SERVER_ERROR', { error : error.message }, req, false))
        }
    }
}

module.exports = adminAssignments