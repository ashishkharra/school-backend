const { responseData } = require('../../helpers/responseData');
const adminAttendanceService = require('../../services/admins/admin.attendance.service.js')

const adminAttendanceController = {
    getAttendances: async (req, res) => {
        try {
            const { classId, section } = req.params;
            const result = await adminAttendanceService.getAttendances(classId, section);

            console.log('result from service : ', result)

            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false))
            }

            return res.status(result.success ? 200 : 400).json(
                responseData(
                    result.message,                      // message key
                    { data: result.data, pagination: result.pagination },
                    req,
                    result.success
                )
            );
        } catch (error) {
            console.log('Error while getting attendances : ', error.message);
            return res.status(500).json(responseData('SERVER_ERROR', {}, req, false));
        }
    }
}

module.exports = adminAttendanceController