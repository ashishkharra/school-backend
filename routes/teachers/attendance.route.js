// routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/verifyToken')
// const teacherController = require('../../controllers/teachers/teacher.controller');
const validationRule = require('../../validations/admins/auth');
// const { teacherLogin } = require('../../services/teachers/teachers.service');
const attendanceController = require('../../controllers/teachers/attendance.controller');

router.post('/mark-attendance', [verifyToken], validationRule.validate('markOrUpdateAttendance'),attendanceController.markOrUpdateAttendance);
router.get('/getstudent-attendance', [verifyToken], attendanceController.getAttendance);
router.delete('/delete-attendance/:attendanceId', [verifyToken], attendanceController.deleteAttendance);
router.put('/update-attendance/:attendanceId', [verifyToken], validationRule.validate('updateAttendance'),attendanceController.updateAttendanceController);

module.exports = router;
