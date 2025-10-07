const express = require('express')
const router = express.Router()
const assignmentController = require('../../controllers/teachers/assignment.controller')
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
// const attendanceController = require('../../controllers/teachers/assignment.controller')
const { uploadAssignmanet } = require('../../middlewares/multerFile')


router.post('/upload-assignment',uploadAssignmanet.single('file'),validationRule.validate("uploadAssignment"),assignmentController.uploadAssignmentController)
router.get("/get-assignment", assignmentController.getAssignmentsController);
router.put('/update-assignment/:id',uploadAssignmanet.single('file'),validationRule.validate("updateAssignment"), assignmentController. updateAssignmentController );
router.delete("/delete-assignment/:assignmentId", assignmentController.deleteAssignmentController);


module.exports = router
