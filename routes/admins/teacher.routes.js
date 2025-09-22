const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminController = require('../../controllers/admins/admin.controller.js')

// router
//     .post("/teachers",[verifyToken], validationRule.validate("addTeacher"), adminController.addTeacher)
//     .get("/teachers",[verifyToken], adminController.getAllTeachers)
//     .get("/teachers/:id",[verifyToken], adminController.getTeacherById)
//     .put("/teachers/:id",[verifyToken], adminController.updateTeacher)
//     .delete("/teachers/:id",[verifyToken], adminController.deleteTeacher)

module.exports = router