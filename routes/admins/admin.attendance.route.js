const adminAttendanceController = require('../../controllers/admins/admin.attendance.controller')
const { verifyToken } = require('../../middlewares/verifyToken')

const router = require('express').Router()


router
    .get('/:classId/:section?', [verifyToken], adminAttendanceController.getAttendances)

module.exports = router