const express = require('express')
const router = express.Router()
const assignmentController = require('../../controllers/teachers/assignment.controller')
// const attendanceController = require('../../controllers/teachers/assignment.controller')
const { uploadAssignmanet } = require('../../middlewares/multerFile')
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const { parseMultipartJSONFields } = require('../../helpers/helper')

const assignmentDoc = ['title', 'subject', 'description', 'class', 'dueDate']

router.post(
  '/upload-assignment',
  [verifyToken],
  uploadAssignmanet.single('file'),
  parseMultipartJSONFields(assignmentDoc),
  validationRule.validate('uploadAssignment'),
  assignmentController.uploadAssignmentController
)

router.get(
  '/get-assignment',
  [verifyToken],
  assignmentController.getAssignmentsController
)
router.delete(
  '/delete-assignment/:assignmentId',
  [verifyToken],
  assignmentController.deleteAssignmentController
)
router.put(
  '/update-assignment/:id',
  uploadAssignmanet.single('file'),
  validationRule.validate('updateAssignment'),
  assignmentController.updateAssignmentController
)

router.post(
  '/generate-grades',
  [verifyToken],
  validationRule.validate('assignGradeOrMarks'),
  assignmentController.assignGradeOrMarks
)
router.put(
  '/update-grades/:gradeId',
  [verifyToken],
  validationRule.validate('updateGrade'),
  assignmentController.updateGrade
)
router.delete(
  '/delete-grades/:gradeId',
  [verifyToken],
  assignmentController.deleteGrade
)
router.get(
  '/get-studedentsgrades',
  [verifyToken],
  assignmentController.getGrades
)

module.exports = router
