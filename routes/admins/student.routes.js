const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminStudentController = require('../../controllers/admins/student.controller.js')

router
    .post('/reg', [verifyToken], validationRule.validate('registerStudent'), adminStudentController.regStudent)

    .put('/update/:studentId', [verifyToken], validationRule.validate('updateStudent'), adminStudentController.updateStudent)

    .put('/update/:classId/:studentId', [verifyToken], adminStudentController.updateStudentClass)

    .put('/update/section/:classId/:studentId/:section', [verifyToken], adminStudentController.udpateStudentSection)

    .put('/delete/:studentId', [verifyToken],adminStudentController.deleteStudent)

    .get('/get/all/:classId', [verifyToken], adminStudentController.getStudentAccordingClass)

    .get('/get/student/profile/:studentId', [verifyToken], adminStudentController.getStudentById)

module.exports = router