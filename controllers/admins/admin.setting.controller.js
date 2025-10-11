const schoolSettingService = require("../../services/admins/admin.setting.service.js");
const { responseData } = require("../../helpers/responseData.js");

module.exports = {
    saveSettings: async (req, res) => {
        try {
            const data = req.body;

            if (req.files && req.files.schoolLogo && req.files.schoolLogo.length > 0) {
                data.schoolLogo = `/logo/${req.files.schoolLogo[0].filename}`;
            }

            const result = await schoolSettingService.saveSettings(data);

            return res
                .status(result.success ? 200 : 400)
                .json(responseData(result.message, result.data || {}, req, result.success));
        } catch (error) {
            console.error("saveSettings Error:", error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    getSettings: async (req, res) => {
        try {
            const result = await schoolSettingService.getSettings();

            return res
                .status(result.success ? 200 : 404)
                .json(responseData(result.message, result.data || {}, req, result.success));
        } catch (error) {
            console.error("getSettings Error:", error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    updateSettings: async (req, res) => {
        try {
            const { id } = req.params;
            const data = { ...req.body };

            console.log('fiels : ', req.files)

            if (req.files?.schoolLogo && req.files.schoolLogo.length > 0) {
                data.schoolLogo = `/logo/${req.files.schoolLogo[0].filename}`
            }

            Object.keys(data).forEach((key) => {
                if (data[key] === null || data[key] === undefined || data[key] === "") {
                    delete data[key];
                }
            });

            const result = await schoolSettingService.updateSettings(id, data);
            return res.json(responseData(result.message, result.data, req, result.success));
        } catch (error) {
            return res
                .status(500)
                .json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    resetSettings: async (req, res) => {
        try {
            const result = await schoolSettingService.resetSettings();

            return res
                .status(result.success ? 200 : 400)
                .json(responseData(result.message, result.data || {}, req, result.success));
        } catch (error) {
            console.error("resetSettings Error:", error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },
};
