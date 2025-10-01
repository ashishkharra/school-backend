const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminClassController = require('../../controllers/admins/class.controller.js')

router
    .post('/reg', [verifyToken], validationRule.validate('registerClass'), adminClassController.addClass)
    .put('/update/class/:classId', [verifyToken], validationRule.validate('updateClass'), adminClassController.updateClass)
    .post('/subjects/reg', [verifyToken], adminClassController.addSubjects)

    .get('/get/all/:classId?/:section?', [verifyToken], adminClassController.getAllClasses)
    .get('/get/subjects', [verifyToken], adminClassController.getAllSubjects)

module.exports = router