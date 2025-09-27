const express = require('express');
const router = express.Router();
const assignmentController = require('../../controllers/teachers/assignment.controller');
const { uploadAssignment } = require("../../middlewares/multerFile");



router.post('/create/:teacherId/:classId',uploadAssignment.single("single"),assignmentController.createAssignment);


module.exports = router;
