
// routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/verifyToken')
// const teacherController = require('../../controllers/teachers/teacher.controller');
const validationRule = require('../../validations/admins/auth');
// const { teacherLogin } = require('../../services/teachers/teachers.service');
const teacherController = require('../../controllers/teachers/teacher.controller');

router.post('/request-profile-update/:teacherId', teacherController.requestProfileUpdate);
router.get('/get-profile',[verifyToken],teacherController.getProfile);
router.post('/forgot-password', validationRule.validate('forgot-password'), teacherController.teacherForgotPassword)
router.post('/reset-password/:token', validationRule.validate('reset-password'), teacherController.teacherResetPassword)
router.post('/change-password', [verifyToken], validationRule.validate('change-password'), teacherController.changePassword)

router.get('/get-attendance', [verifyToken], teacherController.getAttendance);

module.exports = router;
