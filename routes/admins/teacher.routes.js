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




router.post('/register' ,teacherController.registerTeacher);
router.put('/updateTeachers/:id',[verifyToken] ,validationRule.validate("updateTeacher"),teacherController.updateTeacher);
router.get('/getAllTeacher',teacherController.getAllTeachers);
router.put('/soft-delete/:id', teacherController.softDeleteTeacher);
router.get("/deletedTeachersHistory", teacherController.getDeletedTeachersHistory);


router.post('/class-teacherOf' ,teacherController.assignClassTeacher);
router.put('/update-classteacherOf' ,teacherController.updateClassTeacher);
router.get('/getAll-class-teacher', teacherController.getAllTeachersWithClassData);
router.delete('/delete-class-teacher/:classId', teacherController.removeClassTeacher);


// updateClassTeacher
router.post('/assign-teacher' , teacherController.assignTeacherToClassController);
router.put('/update-assign-teacher/:assignmentId',teacherController.updateAssignTeacherToController);
router.delete('/delete-assign-teacher/:assignmentId' ,teacherController.deleteAssignTeacherToController);
router.get("/get-teacher-assignments", teacherController.getAssignTeacherToController);
module.exports = router