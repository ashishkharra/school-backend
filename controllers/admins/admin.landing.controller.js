const adminLandingService = require('../../services/admins/admin.landing.service.js')
const { responseData } = require('../../helpers/responseData.js')

const adminLandingController = {
    approve: async (req, res) => {
        try {
            const { testimonialId, status } = req.body;

            if (!testimonialId || !["approved", "rejected"].includes(status)) {
                return res.status(400).json(responseData("INVALID_INPUT", {}, req, false));
            }

            const result = await adminLandingService.approve(testimonialId, status);

            if (!result.success) {
                return res.status(404).json(responseData(result.message, {}, req, false));
            }

            return res.status(200).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.error("Error approving testimonial:", error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    getTestimonial: async (req, res) => {
        try {
            const result = await adminLandingService.getTestimonial();

            if (!result.success) {
                return res.status(404).json(responseData(result.message, {}, req, false));
            }

            return res.status(200).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.error("Error while fetching recent testimonials:", error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    makeAnnouncement: async (req, res) => {
        try {
            const data = { ...req.body };

            if (req.files && req.files.attachments && req.files.attachments.length > 0) {
                data.attachments = req.files.attachments.map(file => `/uploads/announcements/${file.filename}`);
            }

            const result = await adminLandingService.makeAnnouncement(data);

            if (!result.success) {
                return res.status(404).json(responseData(result.message, {}, req, false));
            }

            return res.status(200).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.error("Error while making announcement:", error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },
     getAnnouncements: async (req, res) => {
    try {
      const { audience, status, limit } = req.query;
      const result = await adminLandingService.getAnnouncements({ audience, status, limit });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Controller error (getAll):", error);
      res.status(500).json({ success: false, message: "SERVER_ERROR" });
    }
  },

}

module.exports = adminLandingController