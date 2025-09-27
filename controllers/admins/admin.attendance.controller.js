const responseData = require('../../helpers/responseData');
const adminAttendanceService = require('../../services/admins/admin.attendance.service.js')

const adminAttendanceController = {
    getAttendances: async (req, res) => {
        try {
            const { classId, section } = req.params;
            const result = adminAttendanceService.getAttendances(classId, section);

            if (!result.success) {
                return res.status(401).json(responseData(result.message, {}, req, result?.success || false))
            }

            return res.status(200).json(responseData(result.message, result, req, result?.success || true))
        } catch (error) {
            console.log('Error while getting attendances : ', error.message);
            return res.status(500).json(responseData('SERVER_ERROR', {}, req, false));
        }
    }
}

module.exports = adminAttendanceController