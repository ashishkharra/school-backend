const router = require('express').Router();
const { verifyToken } = require('../../middlewares/verifyToken.js')
const validationRule = require('../../validations/student/auth.js')
const { uploadSubmission } = require('../../middlewares/multerFile.js')
const studentController = require('../../controllers/students/student.controller.js');

router.get(
  "/view/attendance/:studentId", [verifyToken],
  studentController.viewAttendanceByClass
);

router.get(
  "/view/profile/:studentId", [verifyToken],
  studentController.viewProfile
);

router.get("/:studentId/assignments/:assignmentId/download", [verifyToken],
  studentController.downloadAssignment
);

router.post('/update-profile-request/:studentId/', [verifyToken],
  studentController.requestUpdateProfile
);

router.post("/submit/:studentId/:assignmentId", validationRule.validate('submissions'), uploadSubmission.single("file"), studentController.submitAssignment);

// router.put("/grade/:submissionId", studentController.gradeSubmission);

router.get("/:submissionId", studentController.getSubmissionDetails);

router.post('/forgot-password', validationRule.validate('forgot-password'), studentController.studentForgotPassword)
router.post('/reset-password/:token', validationRule.validate('reset-password'), studentController.studentResetPassword)
router.post('/change-password', [verifyToken], validationRule.validate('change-password'), studentController.changePassword)

module.exports = router