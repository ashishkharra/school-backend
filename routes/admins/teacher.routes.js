const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const teacherController = require('../../controllers/admins/teacher.controller.js');

// router
//     .post("/teachers",[verifyToken], validationRule.validate("addTeacher"), adminController.addTeacher)
//     .get("/teachers",[verifyToken], adminController.getAllTeachers)
//     .get("/teachers/:id",[verifyToken], adminController.getTeacherById)
//     .put("/teachers/:id",[verifyToken], adminController.updateTeacher)
//     .delete("/teachers/:id",[verifyToken], adminController.deleteTeacher)




router.post('/register',validationRule.validate("registerTeacher") ,teacherController.registerTeacher);
router.put('/updateTeachers/:id',[verifyToken] ,validationRule.validate("updateTeacher"),teacherController.updateTeacher);
router.get('/getAllTeacher',teacherController.getAllTeachers);
router.put('/soft-delete/:id', teacherController.softDeleteTeacher);
router.get("/deletedTeachersHistory", teacherController.getDeletedTeachersHistory);

router.put('/class-teacherOf', teacherController.assignClassTeacher);



router.put('/assign-teacher' ,teacherController.assignTeacherToClassController);
router.put('/update-assign-teacher/:assignmentId' ,teacherController.updateTeacherAssignmentController);
router.delete('/delete-assign-teacher/:assignmentId' ,teacherController.deleteTeacherAssignmentController);
router.get("/get-teacher-assignments", teacherController.getTeacherAssignmentsController);
module.exports = router