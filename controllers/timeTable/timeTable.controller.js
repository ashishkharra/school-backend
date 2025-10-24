const timetableService = require("../../services/timeTable/timeTable.service.js");
const { responseData } = require('../../helpers/responseData.js');
const { result } = require("lodash");

const timetableController = {

    checkSlot: async (req, res) => {
        try {
            const { teacherId, classId, day, startTime, endTime } = req.body;

            const result = await timetableService.checkTeacherSlot({ teacherId, classId, day, startTime, endTime });

            if (!result?.success) {
                return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            }

            return res.status(200).json(responseData(result.message, result, req, result.success));
        } catch (error) {
            console.error("Error in checkSlot controller:", error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    getTimetable: async (req, res) => {
        try {
            const { classId } = req.params;

            const data = await timetableService.getTimetableForClass(classId);
            res.json({ success: data.success || true, message: data.message, timetable: data.timetable });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    assignSlot: async (req, res) => {
        try {
            const slots = req.body;
            if (!Array.isArray(slots) || slots.length === 0) {
                return res.status(400).json(responseData("INVALID_PAYLOAD", {}, req, false));
            }

            const results = await Promise.all(
                slots.map(slot => timetableService.assignTeacherToSlot(slot))
            );

            const successSlots = [];
            const failedSlots = [];

            results.forEach((result, idx) => {
                if (result.success) successSlots.push({ slot: slots[idx], data: result.data });
                else failedSlots.push({ slot: slots[idx], message: result.message });
            });

            res.status(200).json(responseData(
                "TIMETABLE_ASSIGNED_SUCCESSFULLY",
                { successSlots, failedSlots },
                req,
                true
            ));

        } catch (error) {
            console.error(error);
            res.status(400).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    updateTimeTable: async (req, res) => {
        try {
            const { classId } = req.params;
            const { timetable } = req.body;

            const result = await timetableService.updateClassTimeTable(classId, timetable);

            return res.status(200).json(responseData(result.message, result, req, result.success));
        } catch (error) {
            console.error('Error while updating timetable:', error);
            return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
        }
    },

    resetTimeTable: async (req, res) => {
        try {
            const { classId } = req.params;

            if (!classId) {
                return res.status(400).json(responseData("CLASS_ID_REQUIRED", {}, req, false));
            }

            const result = await timetableService.resetTimeTable(classId);

            return res.status(200).json(
                responseData(result?.message, result, req, result?.success || true)
            );
        } catch (error) {
            console.error('Error while resetting timetable:', error);
            return res.status(500).json(
                responseData("SERVER_ERROR", { error: error.message }, req, false)
            );
        }
    }


}

module.exports = timetableController;