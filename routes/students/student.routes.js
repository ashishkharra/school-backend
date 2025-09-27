const router = require('express').Router();
const studentController = require('../../controllers/students/student.controller.js');

router.get(
  "/view/attendance/:studentId",
  studentController.viewAttendanceByClass
);

router.get(
  "/view/profile/:studentId",
  studentController.viewProfile
);

router.get("/:studentId/assignments/:assignmentId/download", 
  studentController.downloadAssignment
);

router.post('/update-profile-request/:studentId/', 
  studentController.requestUpdateProfile
);

module.exports = router