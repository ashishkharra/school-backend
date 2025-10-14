const express = require('express')
const router = express.Router()
const assignmentController = require('../../controllers/teachers/assignment.controller')
const attendanceController = require('../../controllers/teachers/assignment.controller')
const { uploadAssignmanet } = require('../../middlewares/multerFile')
 const validationRule = require('../../validations/admins/auth');

// const { uploadAssignment: uploadAssignmentMiddleware } = require('../../middlewares/multerFile')

// router.get('/students/:classId', assignmentController.getStudentsByClass);

// router.post('/create/:teacherId/:classId',uploadAssignment.single("single"),assignmentController.createAssignment);

// router.post(
//   '/uplode-assigment',
//   uploadAssignmanet.single('file'),
//   assignmentController.uploadAssignment
// )

router.post('/upload-assignment',uploadAssignmanet.single('file'),validationRule.validate('uploadAssignment'),assignmentController.uploadAssignmentController)
router.get("/get-assignment", assignmentController.getAssignmentsController);
router.delete("/delete-assignment/:assignmentId", assignmentController.deleteAssignmentController);
router.put('/update-assignment/:id',uploadAssignmanet.single('file'), validationRule.validate('updateAssignment'),assignmentController.updateAssignmentController );


router.post('/generate-grades', assignmentController.assignGradeOrMarks);
router.put('/update-grades/:gradeId', assignmentController.updategrade);
router.delete('/delete-grades/:gradeId', assignmentController.deleteGrade);
router.get('/get-studedentsgrades', assignmentController.getGrades);


module.exports = router
