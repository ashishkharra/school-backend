const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminController = require('../../controllers/admins/admin.controller.js')

// router
//     .post("/students", [verifyToken], adminController.addStudent)
//     .get("/students", [verifyToken], adminController.getAllStudents)
//     .get("/students/:id", [verifyToken], adminController.getStudentById)
//     .put("/students/:id", [verifyToken], adminController.updateStudent)
//     .delete("/students/:id", [verifyToken], adminController.deleteStudent)

module.exports = router