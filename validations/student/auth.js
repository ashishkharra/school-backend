const { body, param } = require('express-validator')
const {responseData} = require('../../helpers/responseData')
const { validatorMiddleware } = require('../../helpers/helper')

module.exports.validate = (method) => {
    switch (method) {
        case 'forgot-password': {
            return [
                body('email')
                    .notEmpty()
                    .withMessage('EMAIL_EMPTY')
                    .isEmail()
                    .withMessage('EMAIL_VALID'),
                validatorMiddleware
            ]
        }
        case 'reset-password': {
            return [
                body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
                validatorMiddleware
            ]
        }
        case 'change-password': {
            return [
                body('oldPassword').notEmpty().withMessage('OLDPASSWORD_EMPTY'),
                body('newPassword').notEmpty().withMessage('NEWPASSWORD_EMPTY'),
                validatorMiddleware
            ]
        }

        case 'submissions': {
            return [
                body().custom((_, { req, res }) => {
                    const files = [];

                    if (req.file) files.push(req.file);
                    if (req.files && req.files.length > 0) files.push(...req.files);

                    if (!files.length) {
                        return res.json(responseData('NO_FILES_UPLOADED', {}, req, false))
                    }

                    files.forEach(file => {
                        if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("application/pdf")) {
                            return res.json(responseData('INVALID_FILE_TYPE', {}, req, false))
                        }

                        if (file.size > MAX_FILE_SIZE) {
                            return res.json(responseData('FILE_TOO_LARGE', {}, req, false))
                        }
                    });

                    return true;
                }),
                validatorMiddleware
            ]
        }
    }
}