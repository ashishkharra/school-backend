const router = require('express').Router();
const { verifyToken } = require('../../middlewares/verifyToken.js')
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

router.post("/submit/:assignmentId", studentController.submitAssignment);

router.put("/grade/:submissionId",  studentController.gradeSubmission);

router.get("/:submissionId", studentController.getSubmissionDetails);

module.exports = router