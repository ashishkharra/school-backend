const router = require('express').Router();
const { verifyToken } = require('../../middlewares/verifyToken.js')
const validationRule = require('../../validations/student/auth.js')
const { uploadSubmission } = require('../../middlewares/multerFile.js')
const studentController = require('../../controllers/students/student.controller.js');
const { parseMultipartJSONFields } = require('../../helpers/helper.js')

const submissionDoc = [
    'assignmentId',
    'classId'
]


router.get('/dashboard', [verifyToken], studentController.studentDashboard);

router.get("/view/attendance", [verifyToken],studentController.viewAttendanceByClass);

router.get("/view/profile", [verifyToken], studentController.viewProfile);

router.get("/assignments/:assignmentId/download", [verifyToken],studentController.downloadAssignment);

router.post('/update-profile-request', [verifyToken],studentController.requestUpdateProfile);

router.post("/submit", uploadSubmission.single("file"), parseMultipartJSONFields(submissionDoc), validationRule.validate('submissions'), studentController.submitAssignment);

// router.put("/grade/:submissionId", studentController.gradeSubmission);

router.get('/get-assignments/:classId', [verifyToken], studentController.getAssignmentOfClass)

router.get("/performance", [verifyToken], studentController.performance)


router.post('/forgot-password', validationRule.validate('forgot-password'), studentController.studentForgotPassword)
router.post('/reset-password/:token', validationRule.validate('reset-password'), studentController.studentResetPassword)
router.post('/change-password', [verifyToken], validationRule.validate('change-password'), studentController.changePassword)
router.get("/:submissionId",[verifyToken], studentController.getSubmissionDetails);

module.exports = router