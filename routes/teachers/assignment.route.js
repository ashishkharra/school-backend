const express = require('express')
const router = express.Router()
const assignmentController = require('../../controllers/teachers/assignment.controller')
const attendanceController = require('../../controllers/teachers/assignment.controller')
const { uploadAssignmanet } = require('../../middlewares/multerFile')
// const { uploadAssignment: uploadAssignmentMiddleware } = require('../../middlewares/multerFile')

// router.get('/students/:classId', assignmentController.getStudentsByClass);

// router.post('/create/:teacherId/:classId',uploadAssignment.single("single"),assignmentController.createAssignment);

// router.post(
//   '/uplode-assigment',
//   uploadAssignmanet.single('file'),
//   assignmentController.uploadAssignment
// )

router.post('/upload-assignment',uploadAssignmanet.single('file'),assignmentController.uploadAssignmentController)
router.get("/get-assignment", assignmentController.getAssignmentsController);
router.delete("/delete-assignment/:assignmentId", assignmentController.deleteAssignmentController);
router.put('/update-assignment/:id',uploadAssignmanet.single('file'), assignmentController. updateAssignmentController );



module.exports = router
