const timetableService = require("../../services/timeTable/timeTable.service.js");
const { responseData } = require('../../helpers/responseData.js');
const { result } = require("lodash");

const timetableController = {
    
    getTimetable: async (req, res) => {
        try {
            const { classId } = req.params;

            const data = await timetableService.getTimetableForClass(classId);
            res.json({ success: true, timetable: data });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    assignSlot: async (req, res) => {
        try {
            console.log('before service body : ', req.body)
            // process.exit()
            const { classId, day, period, teacherId, subjectId, startTime, endTime } = req.body;

            const result = await timetableService.assignTeacherToSlot({
                classId,
                day,
                period,
                teacherId,
                subjectId,
                startTime,
                endTime
            });

            if (result?.success) {
                return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            }
            res.status(200).json(responseData(result?.message, result, req, result?.success || true));
        } catch (error) {
            console.error(error);
            res.status(400).json(responseData("SERVER_ERROR", { error : error.message }, req, false));
        }
    }
}

module.exports = timetableController;