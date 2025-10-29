const { default: mongoose } = require("mongoose");
const path = require("path");
const fs = require("fs");
const SchoolSetting = require("../../models/admin/admin.setting.schema.js");

module.exports = {
    saveSettings: async (data) => {
        try {
            let existing = await SchoolSetting.findOne();

            if (existing) {
                if (data.schoolLogo && existing.schoolLogo) {
                    const oldPath = path.join(__dirname, `../../uploads${existing.schoolLogo}`);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }

                await SchoolSetting.updateOne({ _id: existing._id }, data);
                const updated = await SchoolSetting.findById(existing._id);

                return { success: true, message: "SETTINGS_UPDATED", data: updated };
            } else {
                const created = await SchoolSetting.create(data);
                return { success: true, message: "SCHOOL_SETTINGS_CREATED", data: created };
            }
        } catch (error) {
            console.error("Error in saveSettings:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    getSettings: async () => {
        try {
            let settings = await SchoolSetting.findOne();

            console.log('url - ', process.env.STATIC_URL)

            if (!settings) {
                return { success: false, message: "SETTINGS_NOT_FOUND", data: {} };
            }

            if (settings.schoolLogo)
                settings.schoolLogo = process.env.STATIC_URL + settings.schoolLogo;

            if (settings.faqs?.length > 0) {
                settings.faqs = settings.faqs
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .slice(0, 3);
            }

            if (settings.banner?.length > 0) {
                settings.banner = settings.banner
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .slice(0, 3)
                    .map(b => process.env.STATIC_URL + b.image);
            }

            if (settings.gallery?.length > 0) {
                settings.gallery = settings.gallery
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    // .slice(0, 3)
                    .map(g => `${process.env.STATIC_URL}${g.image}`);
            }

            console.log('setting ----- ', settings)

            return {
                success: true,
                message: "SCHOOL_SETTINGS_FETCHED",
                data: settings,
            };
        } catch (error) {
            console.error("Error in getSettings:", error);
            return { success: false, message: "SERVER_ERROR", data: {} };
        }
    },


    updateSettings: async (data) => {
        try {
            console.log("Update data:", data);

            // 🔍 Fetch existing settings
            const existing = await SchoolSetting.findOne();
            if (!existing) {
                return { success: false, message: "SETTING_NOT_FOUND", data: {} };
            }

            const updatableData = {};
            const pushOps = {};

            // 🧩 Copy top-level fields (ignore nested objects)
            Object.keys(data).forEach((key) => {
                if (
                    !["address", "contact", "schoolTiming", "periods", "academicSession", "banner", "gallery"].includes(key)
                ) {
                    if (data[key] !== null && data[key] !== undefined && data[key] !== "") {
                        updatableData[key] = data[key];
                    }
                }
            });

            // 🧠 Merge nested object fields
            ["address", "contact", "schoolTiming", "periods", "academicSession"].forEach((field) => {
                if (data[field] && typeof data[field] === "object") {
                    updatableData[field] = {
                        ...(existing[field]?.toObject?.() || existing[field] || {}),
                        ...data[field],
                    };
                }
            });

            // 🖼️ If a new school logo is uploaded, delete the old one
            if (data.schoolLogo && existing.schoolLogo) {
                try {
                    const oldPath = path.join(__dirname, `../uploads${existing.schoolLogo}`);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                        console.log(`🗑️ Deleted old logo: ${oldPath}`);
                    }
                } catch (err) {
                    console.warn("⚠️ Failed to delete old logo:", err.message);
                }
                updatableData.schoolLogo = data.schoolLogo;
            }

            // 🏞️ Append new banner images (if any)
            if (Array.isArray(data.banner) && data.banner.length > 0) {
                pushOps.banner = { $each: data.banner };
            }

            // 🖼️ Append new gallery images (if any)
            if (Array.isArray(data.gallery) && data.gallery.length > 0) {
                pushOps.gallery = { $each: data.gallery };
            }

            // 🧾 Prepare final update object
            const updateOps = { $set: updatableData };
            if (Object.keys(pushOps).length > 0) updateOps.$push = pushOps;

            // 💾 Update settings document
            const updated = await SchoolSetting.findOneAndUpdate(
                { _id: existing._id },
                updateOps,
                { new: true, runValidators: true }
            );

            return { success: true, message: "SETTINGS_UPDATED", data: updated };
        } catch (err) {
            console.error("Error updating settings:", err);
            return { success: false, message: "UPDATE_FAILED", data: {} };
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
