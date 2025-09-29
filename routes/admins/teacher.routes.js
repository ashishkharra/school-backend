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
router.get('/getAllTeacher', teacherController.getAllTeachers);
router.put('/updateTeachers/:id',[verifyToken], validationRule.validate("updateTeacher"),teacherController.updateTeacher);
router.put('/soft-delete/:id',[verifyToken], teacherController.softDeleteTeacher);
router.get("/deletedTeachersHistory",[verifyToken], teacherController.getDeletedTeachersHistory);
router.put('/assign-teacher',[verifyToken] ,teacherController.assignTeacherToClassController);

module.exports = router