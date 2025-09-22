const router = require('express').Router();
const validationRule = require('../validations/auth.role.validation.js')
const roleController = require('../controllers/auth.role.controller.js')

router.post('/login', validationRule.validate('roleLogin'), roleController.login)

module.exports = router