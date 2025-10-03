
// routes/teacherRoutes.js
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../middlewares/verifyToken')
// const teacherController = require('../../controllers/teachers/teacher.controller');
const validationRule = require('../../validations/admins/auth');
// const { teacherLogin } = require('../../services/teachers/teachers.service');
const teacherController = require('../../controllers/teachers/teacher.controller');


//get student by class
router.post('/request-profile-update/:teacherId', teacherController.requestProfileUpdate);
router.post('/forgot-password', validationRule.validate('forgot-password'), teacherController.studentForgotPassword)
router.post('/reset-password/:token', validationRule.validate('reset-password'), teacherController.studentResetPassword)
router.post('/change-password', validationRule.validate('change-password'), teacherController.changePassword)


module.exports = router;
