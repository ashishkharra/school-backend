// routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
// const { verifyToken } = require('../../middlewares/verifyToken')
// const teacherController = require('../../controllers/teachers/teacher.controller');
// const validationRule = require('../../validations/admins/auth');
// const { teacherLogin } = require('../../services/teachers/teachers.service');
const attendanceController = require('../../controllers/teachers/attendance.controller');


//get student by class
router.get('/students/class/:classId', attendanceController.getStudentsByClass);

// // POST request route jahan teacher attendance submit karega
// router.post('/mark-attendance', attendanceController.markAttendance);


module.exports = router;
