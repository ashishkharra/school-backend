const { verifyToken } = require('../../middlewares/verifyToken')
const adminParentController = require('../../controllers/admins/parent.controller.js');
const validationRule = require('../../validations/admins/auth.js')

const router = require('express').Router()

router
    .post('/notify/mail', [verifyToken], validationRule.validate('meetingSchedule') ,adminParentController.scheduleMeeting)

    .patch('/meetings/:meetingId', [verifyToken], validationRule.validate('updateMeeting'), adminParentController.updateMeeting)

    .patch('/meetings/:meetingId/remove', [verifyToken], validationRule.validate('removeMeeting'), adminParentController.removeMeeting)


module.exports = router