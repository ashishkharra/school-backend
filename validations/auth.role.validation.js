const { body, param } = require('express-validator')
const { validatorMiddleware } = require('../helpers/helper')

module.exports.validate = (method) => {
    switch (method) {
        case 'roleLogin': {
            return [
                body('email').notEmpty().withMessage('EMAIL_EMPTY'),
                body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
                validatorMiddleware
            ]
        }
    }
}
