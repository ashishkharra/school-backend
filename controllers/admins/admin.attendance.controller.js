const { responseData } = require('../../helpers/responseData');
const adminAttendanceService = require('../../services/admins/admin.attendance.service.js')

const adminAttendanceController = {
    getAttendances: async (req, res) => {
        try {
            const { classId } = req.params;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;
            const result = await adminAttendanceService.getAttendances(classId, skip, limit);

            console.log('result from service : ', result)

            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false))
            }

            return res.status(result.success ? 200 : 400).json(
                responseData(
                    result.message,
                    { data: result.data, pagination: result.pagination },
                    req,
                    result.success
                )
            );
        } catch (error) {
            console.log('Error while getting attendances : ', error.message);
            return res.status(500).json(responseData('SERVER_ERROR', { error : error.message }, req, false));
        }
    }
}

module.exports = adminAttendanceController