const router = require('express').Router()
const validationRule = require('../../validations/admins/auth')
const landingController = require('../../controllers/admins/landing.controller')

router
    .get('/home', landingController.homeGet)
    .get('/gallery', landingController.gallery)
    .get('/about', landingController.about)

    .post('/contact-us', validationRule.validate('contact-us'), landingController.contactUs)
    .post('/feedback', validationRule.validate('feedback'), landingController.feedback)

module.exports = router