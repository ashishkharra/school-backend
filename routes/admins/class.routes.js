const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const adminClassController = require('../../controllers/admins/class.controller.js')

router
    .post('/add/class', [verifyToken], validationRule.validate('registerClass'), adminClassController.addClass)

module.exports = router