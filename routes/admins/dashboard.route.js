const express = require('express')
const router = express.Router()
const dashboard = require('../../controllers/admins/dashboard.controller')
const { verifyToken } = require('../../middlewares/verifyToken')

router.get('/dashboard', [verifyToken], dashboard.dashboard)
module.exports = router
