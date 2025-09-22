const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminController = require('../../controllers/admins/admin.controller.js')
const adminStudentController = require('../../controllers/admins/student.controller.js')

router
    .post('/student/reg', [verifyToken], validationRule.validate('registerStudent'), adminStudentController.regStudent)

module.exports = router