const adminLandingController = require('../../controllers/admins/admin.landing.controller.js')
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/auth.js')
const { parseMultipartJSONFields } = require('../../helpers/helper.js')
const { announcement } = require('../../middlewares/multer.setup.js')
const router = require('express').Router()

const announcementDoc = [
  "audience"
]

router
    .patch('/approve-testimonial/:testimonialId', [verifyToken], validationRule.validate('testimonial-status'), adminLandingController.approve)
    .get('/get-testimonials', [verifyToken], adminLandingController.getTestimonial)

    .post('/make-announcement', [verifyToken], announcement, parseMultipartJSONFields(announcementDoc), validationRule.validate('make-announcement'), adminLandingController.makeAnnouncement)

module.exports = router