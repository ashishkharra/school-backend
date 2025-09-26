const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminClassController = require('../../controllers/admins/class.controller.js')

router
    .post('/add', [verifyToken], validationRule.validate('registerClass'), adminClassController.addClass)

    .get('/get/all/:classId/:section', [verifyToken], adminClassController.getAllClasses)

module.exports = router