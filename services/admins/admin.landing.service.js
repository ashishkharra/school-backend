const mongoose = require('mongoose')
const Testimonial = require('../../models/admin/testimonials.schema.js')
const Announcement = require('../../models/admin/announcement.schema.js')

const adminLandingService = {
    approve: async (testimonialId, status) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(testimonialId)) {
                return { success: false, message: "TESTIMONIAL_ID_NOT_VALID" }
            }
            const testimonial = await Testimonial.findById(testimonialId);

            if (!testimonial) {
                return { success: false, message: "TESTIMONIAL_NOT_FOUND" };
            }

            testimonial.status = status;
            testimonial.approvedAt = new Date();

            await testimonial.save();

            return {
                success: true,
                message: status === "approved" ? "TESTIMONIAL_APPROVED" : "TESTIMONIAL_REJECTED",
                data: testimonial,
            };
        } catch (error) {
            console.error("Error in approve service:", error);
            return { success: false, message: error.message };
        }
    },

    getTestimonial: async () => {
        try {
            const testimonials = await Testimonial.find({ status: "approved" })
                .sort({ createdAt: -1 }) // latest first
                .limit(5)
                .select("name message rating createdAt"); // pick only relevant fields

            if (!testimonials.length) {
                return { success: false, message: "NO_TESTIMONIALS_FOUND" };
            }

            return {
                success: true,
                message: "RECENT_TESTIMONIALS_FETCHED",
                data: testimonials,
            };
        } catch (error) {
            console.error("Error in getRecent service:", error);
            return { success: false, message: error.message };
        }
    },

    makeAnnouncement: async (data) => {
        try {
            const { title, message, audience, attachments, startDate, endDate, priority, status, createdBy } = data;

            if (!title || !message) {
                return { success: false, message: "TITLE_AND_MESSAGE_REQUIRED" };
            }

            let newAnnouncement = await Announcement.create({
                title,
                message,
                audience: audience?.length ? audience : ["all"],
                attachments: attachments || [],
                startDate: startDate || new Date(),
                endDate,
                priority: priority || "medium",
                status: status || "active",
                createdBy,
            });

            newAnnouncement?.attachments.map(aT => process.env.STATIC_URL + aT)

            return {
                success: true,
                message: "ANNOUNCEMENT_CREATED_SUCCESSFULLY",
                data: newAnnouncement,
            };
        } catch (error) {
            console.error("Error while creating announcement:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },
}

module.exports = adminLandingService