const { verifyToken } = require('../../middlewares/verifyToken');
const adminAssignmentController = require('../../controllers/admins/admin.assignment.controller.js')

const router = require('express').Router();

router
    .get('/assignment', [verifyToken], adminAssignmentController.getAssignment)
    .get('/submission', [verifyToken], adminAssignmentController.getSubmissions)

module.exports = router