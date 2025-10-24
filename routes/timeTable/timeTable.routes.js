const express = require("express");
const router = express.Router();
const {verifyToken} = require('../../middlewares/verifyToken.js')
const validationRule = require('../../validations/admins/auth.js')
const timetableController = require("../../controllers/timeTable/timeTable.controller.js");

router.get("/:classId",[verifyToken], timetableController.getTimetable);
router.post("/assign", [verifyToken], validationRule.validate('assignClass'), timetableController.assignSlot);

router.patch("/update/:classId", [verifyToken], validationRule.validate('updateAssign'), timetableController.updateTimeTable)
router.delete("/reset/:classId", [verifyToken], timetableController.resetTimeTable)

router.post('/check', [verifyToken], validationRule.validate('checkSlot'), timetableController.checkSlot)

module.exports = router;