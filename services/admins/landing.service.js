const SchoolSetting = require('../../models/admin/admin.setting.schema.js')
const { sendEmail } = require('../../helpers/helper.js')
const ContactUs = require('../../models/admin/contact_us.schema.js')
const Testimonial = require('../../models/admin/testimonials.schema.js')

const landingService = {

    homeGet: async () => {
        try {
            let result = await SchoolSetting.findOne().select(
                "schoolName schoolLogo socialUrl contact.address contact.phone contact.email contact.website address tollFree faqs banner"
            );

            if (!result) {
                return { success: false, message: "HOME_DATA_NOT_FOUND" };
            }

            result.schoolLogo = process.env.STATIC_URL + result.schoolLogo;
            result.banner = result.banner.map(b => process.env.STATIC_URL + b);

            const limitedFaqs = (result.faqs || []).slice(0, 3);

            const testimonials = await Testimonial.find({ status: "approved" })
                .sort({ createdAt: -1 })
                .limit(3)
                .select("name role message rating profileImage");

            const formattedTestimonials = testimonials.map(t => ({
                ...t.toObject(),
                profileImage: t.profileImage
                    ? process.env.STATIC_URL + t.profileImage
                    : null,
            }));

            return {
                success: true,
                message: "HOME_DATA_FETCHED",
                data: {
                    schoolName: result.schoolName,
                    schoolLogo: result.schoolLogo,
                    socialUrl: result.socialUrl || [],
                    contact: result.contact || {},
                    address: result.address || {},
                    tollFree: result.tollFree,
                    faqs: limitedFaqs,
                    banner: result.banner,
                    testimonials: formattedTestimonials,
                },
            };
        } catch (error) {
            console.error("Error while fetching home:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    gallery: async () => {
        try {
            let result = await SchoolSetting.findOne().select(
                "gallery"
            );

            if (!result) {
                return { success: false, message: "GALLERY_NOT_FOUND" };
            }

            result.gallery = result.gallery.map(g => process.env.STATIC_URL + g)

            return {
                success: true,
                message: "GALLERY_DATA_FETCHED",
                gallery: result.gallery,
            };
        } catch (error) {
            console.log("Error while fetching gallery: ", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    about: async () => {
        try {
            let result = await SchoolSetting.findOne().select(
                "about"
            );

            if (!result) {
                return { success: false, message: "ABOUT_DATA_NOT_FOUND" };
            }

            return {
                success: true,
                message: "ABOUT_DATA_FETCHED",
                about: result.about,
            };
        } catch (error) {
            console.log("Error while fetching about: ", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    contactUs: async (data) => {
        try {
            const { name, email, phone, message, subject } = data;

            const recentMessage = await ContactUs.findOne({
                email,
                createdAt: { $gte: new Date(Date.now() - process.env.RATE_LIMIT_MINUTES * 60 * 1000) }
            });

            if (recentMessage) {
                return {
                    success: false,
                    message: `Please wait ${RATE_LIMIT_MINUTES} minutes before sending another message.`,
                };
            }

            const savedContact = await ContactUs.create({
                name,
                email,
                phone,
                message,
                subject,
            });

            const dataBody = {
                NAME: name,
                EMAIL: email,
                PHONE: phone || "N/A",
                MESSAGE: message,
                DATE: new Date().toLocaleString(),
            };

            await sendEmail("contact-school-owner", dataBody);

            return { success: true, message: "YOUR_MESSAGE_HAS_BEEN_SENT!", data: savedContact };

        } catch (error) {
            console.error("Error in contactUs service:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    feedback: async (data) => {
        try {
            const { name, role, message, rating, ipAddress } = data;

            const existing = await Testimonial.findOne({
                ipAddress,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            if (existing) {
                return {
                    success: false,
                    message: "ALREADY_POSTED",
                };
            }

            const newFeedback = await Testimonial.create({
                name,
                role,
                message,
                rating,
                ipAddress,
                status: "pending"
            });

            const dataBody = {
                NAME: name,
                ROLE: role || "Visitor",
                RATING: rating ? rating.toString() : "N/A",
                MESSAGE: message,
                DATE: new Date().toLocaleString(),
            };

            await sendEmail("contact-school-owner", dataBody);
            return {
                success: true,
                message: "FEEDBACK_SENT",
                data: newFeedback,
            };

        } catch (error) {
            console.error("Error in feedback service:", error);
            return { success: false, message: error.message };
        }
    }

}

module.exports = landingService