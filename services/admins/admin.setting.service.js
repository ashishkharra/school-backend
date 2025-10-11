const { default: mongoose } = require("mongoose");
const SchoolSetting = require("../../models/admin/admin.setting.schema.js");

module.exports = {
    saveSettings: async (data) => {
        try {
            let existing = await SchoolSetting.findOne();

            if (existing) {
                await SchoolSetting.updateOne({ _id: existing._id }, data);
                const updated = await SchoolSetting.findById(existing._id);
                return { success: true, message: "SETTINGS_UPDATED", data: updated };
            } else {
                const created = await SchoolSetting.create(data);
                return { success: true, message: "SCHOOL_SETTINGS_CREATED", data: created };
            }
        } catch (error) {
            console.error("Error in saveSettings:", error);
            return { success: false, message: error.message || "SERVER_ERROR" };
        }
    },

    getSettings: async () => {
        try {
            let settings = await SchoolSetting.findOne();
            if (!settings)
                return { success: false, message: "SETTINGS_NOT_FOUND", data: {} };

            settings.schoolLogo = process.env.STATIC_URL + settings.schoolLogo
            return { success: true, message: "SCHOOL_SETTINGS_FETCHED", data: settings };
        } catch (error) {
            console.error("Error in getSettings:", error);
            return { success: false, message: error.message || "SERVER_ERROR", data: {} };
        }
    },

    updateSettings: async (id, data) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return { success: false, message: "SETTING_ID_NOT_VALID" };
            }

            // Fetch existing document first
            const existing = await SchoolSetting.findById(id);
            if (!existing) {
                return { success: false, message: "SETTING_NOT_FOUND" };
            }

            const updatableData = {};

            // Copy top-level fields except nested objects
            Object.keys(data).forEach((key) => {
                if (
                    !["address", "contact", "schoolTiming", "periods", "academicSession"].includes(key)
                ) {
                    if (data[key] !== null && data[key] !== undefined && data[key] !== "") {
                        updatableData[key] = data[key];
                    }
                }
            });

            // Merge nested objects
            ["address", "contact", "schoolTiming", "periods", "academicSession"].forEach(
                (field) => {
                    if (data[field] && typeof data[field] === "object") {
                        updatableData[field] = {
                            ...existing[field]?.toObject?.() || existing[field],
                            ...data[field],
                        };
                    }
                }
            );

            // Update school logo if present
            if (data.schoolLogo) {
                updatableData.schoolLogo = data.schoolLogo;
            }

            // Perform update
            const updated = await SchoolSetting.findByIdAndUpdate(id, updatableData, {
                new: true,
                runValidators: true,
            });

            return { success: true, message: "SETTINGS_UPDATED", data: updated };
        } catch (err) {
            return { success: false, message: "UPDATE_FAILED: " + err.message, data: {} };
        }
    },

    resetSettings: async () => {
        try {
            const settings = await SchoolSetting.findOne();
            if (!settings) {
                return { success: false, message: "NO_SETTINGS_FOUND", data: {} };
            }

            const resetData = {
                schoolName: null,
                schoolLogo: null,
                address: {
                    street: null,
                    city: null,
                    state: null,
                    zip: null,
                    country: null,
                },
                contact: {
                    phone: null,
                    email: null,
                    website: null,
                },
                schoolTiming: {
                    startTime: null,
                    endTime: null,
                },
                periods: {
                    totalPeriods: null,
                    periodDuration: null,
                    breakDuration: null,
                    lunchBreak: {
                        isEnabled: false,
                        time: null,
                        duration: null,
                    },
                },
                academicSession: {
                    startDate: null,
                    endDate: null,
                    currentSession: null,
                },
                status: "inactive",
            };

            const updated = await SchoolSetting.findByIdAndUpdate(
                settings._id,
                { $set: resetData },
                { new: true }
            );

            return { success: true, message: "SCHOOL_SETTINGS_RESET", data: updated };
        } catch (error) {
            console.error("resetSettings Service Error:", error);
            return { success: false, message: "RESET_FAILED", data: {} };
        }
    },

};
