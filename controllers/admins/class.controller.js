const adminClassService = require('../../services/admins/class.service.js')
const { responseData } = require('../../helpers/responseData.js')

const adminClassController = {
    addClass: async (req, res) => {
        try {
            const data = req.body;
            const result = await adminClassService.addClass(data);
            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));
            }
            return res.status(201).json(responseData(result?.message, result, req, true));
        } catch (error) {
            console.log('Class register error : ', error.message)
            return res.status(500).json(responseData("REGISTRATION_FAILED", {}, req, false));
        }
    },

    getAllClasses: async (req, res) => {
        try {
            const { classId, section } = req.params
            const result = await adminClassController.getAllClasses(classId, section);
            if (!result.success)
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));

            return res.status(200).json(responseData(result?.message, {}, req, result?.success || true));
        } catch (error) {
            console.log('Get all class error : ', error.message)
            return res.status(500).json(responseData("ERROR_WHILE_GETTING_ALL_CLASSES", {}, req, false));
        }
    }
}

module.exports = adminClassController