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

    addSubjects: async (req, res) => {
        try {
            const data = req.body;
            const result = await adminClassService.addSubjects(data);
            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));
            }
            return res.status(201).json(responseData(result?.message, result, req, true));
        } catch (error) {
            console.log('Subject register error : ', error.message)
            return res.status(500).json(responseData("REGISTRATION_FAILED", {}, req, false));
        }
    },

    getAllClasses: async (req, res) => {
        try {
            const { classId, section } = req.params;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;

            const result = await adminClassService.getAllClasses(classId, section, page, limit);
            if (!result.success) {
                return res
                    .status(400)
                    .json(responseData(result.message, {}, req, false));
            }

            return res
                .status(200)
                .json(responseData(result.message, result, req, true));
        } catch (error) {
            console.log("Get all class error :", error.message);
            return res
                .status(500)
                .json(responseData("ERROR_WHILE_GETTING_ALL_CLASSES", {}, req, false));
        }
    },

    getAllSubjects: async (req, res) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const result = await adminClassService.getSubjects(page, limit);
            if (!result.success)
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));

            return res.status(200).json(responseData(result?.message, result, req, result?.success || true));
        } catch (error) {
            console.log('Get all subjects error : ', error)
            return res.status(500).json(responseData("ERROR_WHILE_GETTING_ALL_SUBJECTS", {}, req, false));
        }
    }
}

module.exports = adminClassController