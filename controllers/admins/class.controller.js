const adminClassService = require('../../services/admins/class.service.js')
const { responseData } = require('../../helpers/responseData.js')

const adminClassController = {
    addClass: async (req, res) => {
        try {
            const data = req.body;
            const result = await adminClassService.addClass(data);
            return res.status(201).json(responseData("CLASS_REGISTERED", result, req, true));
        } catch (error) {
            console.log('Class register error : ', error.message)
            return res.status(400).json(responseData("REGISTRATION_FAILED", { error: error.message }, req, false));
        }
    }
}

module.exports = adminClassController