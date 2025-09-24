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
router.put('/updateTeachers/:id', validationRule.validate("registerTeacher"),teacherController.updateTeacher);
router.put('/soft-delete/:id', teacherController.softDeleteTeacher);
router.get("/history/deleted", teacherController.getDeletedTeachersHistory);
router.put('/assign-teacher/:classId', teacherController.assignTeacherToClassController);

module.exports = router