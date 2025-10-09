
// routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/verifyToken')
// const teacherController = require('../../controllers/teachers/teacher.controller');
// const validationRule = require('../../validations/admins/auth');
// const { teacherLogin } = require('../../services/teachers/teachers.service');
const teacherController = require('../../controllers/teachers/teacher.controller');
const validationRule = require('../../validations/admins/auth.js')


//get student by class
router.post('/request-profile-update/:teacherId', [verifyToken], teacherController.requestProfileUpdate);

module.exports = router;
