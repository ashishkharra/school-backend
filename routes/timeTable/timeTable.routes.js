const express = require("express");
const router = express.Router();
const timetableController = require("../../controllers/timeTable/timeTable.controller.js");

router.get("/:classId", timetableController.getTimetable);
router.post("/assign", timetableController.assignSlot);

module.exports = router;