const express = require('express')
const router = express.Router()
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const admin = require('../../controllers/admins/admin.controller')
const { createUploader } = require('../../middlewares/multerUpload.js')

const uploadProfilePics = createUploader({
  folderName: 'profilePics',
  subFolder: (req) => req.user?._id.toString() || 'others',
  allowedMime: ['image/jpeg', 'image/png', 'image/gif'],
  maxSize: 3 * 1024 * 1024
});

router
  .get('/', [verifyToken], admin.adminProfile)
  .post('/login', validationRule.validate('adminLogin'), admin.adminLogin)
  .post('/forgot-password', validationRule.validate('forgot-password'), admin.adminForgotPassword)
  .post('/reset-password/:token', validationRule.validate('reset-password'), admin.adminResetPassword)
  .post('/change-password', [verifyToken], validationRule.validate('change-password'), admin.changePassword)
  .post('/edit-profile', [verifyToken], uploadProfilePics.array('files', 1), admin.editAdmin)
  .put('/change-status/:id', [verifyToken], admin.changeStatus)
  .post('/generatePreSignedUrl', [verifyToken], admin.generatePresignedURL)
  .get('/country-list', [verifyToken], admin.countryList)
  .get('/profile', [verifyToken], admin.adminProfile)
  .post("/register", admin.registerAdmin);

module.exports = router
