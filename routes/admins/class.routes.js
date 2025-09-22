const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminController = require('../../controllers/admins/admin.controller.js')

// router
//     .post("/classes", [verifyToken], adminController.createClass)
//     .get("/classes", [verifyToken], adminController.getAllClasses)
//     .get("/classes/:id", [verifyToken], adminController.getClassById)
//     .put("/classes/:id", [verifyToken], adminController.updateClass)
//     .delete("/classes/:id", [verifyToken], adminController.deleteClass)

module.exports = router