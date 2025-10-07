const {responseData} = require("../../helpers/responseData");
const { generateZoomToken } = require('../../helpers/helper.js')
const adminParentService = require('../../services/admins/parent.service.js')

const adminParentController = {
    scheduleMeeting: async (req, res) => {
        try {
            const { studentId, hostId, reason, date, notes } = req.body;

            const result = await adminParentService.scheduleMeeting(studentId, hostId, { reason, date, notes });

            if (!result?.success) {
                return res.status(result?.status).json(responseData(result?.message, {}, req, result?.success || false))
            }

            return res
                .status(result?.status)
                .json(responseData(result?.message, result, req, true));
        } catch (error) {
            console.error("notify mail error:", error.message);
            res.status(500).json(responseData("SERVER_ERROR", {}, req, false));
        }
    },
    updateMeeting: async (req, res) => {
        try {
            const { meetingId } = req.params;
            const hostId = req.body.hostId;
            const updateData = {
                meetingDate: req.body.meetingDate,
                reason: req.body.reason,
                notes: req.body.notes
            };

            const result = await parentService.updateMeeting(meetingId, updateData, hostId);

            return res.status(result.status).json({
                success: result.success,
                message: result.message,
                data: result.data || {}
            });

        } catch (error) {
            console.error('Update Meeting Controller Error:', error);
            return res.status(500).json({ success: false, message: 'SERVER_ERROR' });
        }
    },

    removeMeeting: async (req, res) => {
        try {
            const { meetingId } = req.params;
            const { status, hostId } = req.body;

            const result = await adminParentService.removeMeeting(meetingId, status, hostId);

            if (!result?.success) {
                return res.status(result?.status).json(responseData(result?.message, {}, req, false));
            }

            return res.status(result.status).json(responseData(result.message, result.data || {}, req, true));

        } catch (error) {
            console.error('Remove meeting error:', error);
            res.status(500).json(responseData('SERVER_ERROR', {}, req, false));
        }
    }
}
module.exports = adminParentController