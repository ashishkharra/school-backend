const adminClassService = require('../../services/admins/class.service.js')
const { responseData } = require('../../helpers/responseData.js')

const adminClassController = {
    addClass: async (req, res) => {
        try {
            const data = req.body;
            const result = await adminClassService.addClass(data);
            if (!result.success) {
                return res.status(401).json(responseData("CLASS_REGISTERATION_FAILED", {}, req, result?.success || false));
            }
            return res.status(201).json(responseData("CLASS_REGISTERED", result, req, true));
        } catch (error) {
            console.log('Class register error : ', error.message)
            return res.status(500).json(responseData("REGISTRATION_FAILED", {}, req, false));
        }
    }
}

module.exports = adminClassController