// routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/verifyToken')
// const teacherController = require('../../controllers/teachers/teacher.controller');
const validationRule = require('../../validations/admins/auth');
// const { teacherLogin } = require('../../services/teachers/teachers.service');
const attendanceController = require('../../controllers/teachers/attendance.controller');



router.post('/mark-attendance',validationRule.validate("markOrUpdateAttendance"), attendanceController.markOrUpdateAttendance);
router.get('/getstudent-attendance',attendanceController.getAttendance)
router.delete('/delete-attendance', attendanceController.deleteAttendance);
router.put('/update-attendance', attendanceController.updateAttendanceController);
module.exports = router;
