const router = require('express').Router()
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminController = require('../../controllers/admins/admin.controller.js')

// router
//     .get("/reports/attendance", [verifyToken], adminController.attendanceReport)
//     .get("/reports/grades", [verifyToken], adminController.gradeReport)
//     .get("/reports/fees", [verifyToken], adminController.feesReport)

module.exports = router