const mongoose = require('mongoose')
const Attendance = require('../../models/students/attendance.schema.js')
const { buildAttendancePipeline } = require('../../helpers/commonAggregationPipeline.js')

const adminAttendanceService = {
    getAttendances: async (classId, skip, limit) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return { success: false, message: 'CLASS_ID_NOT_VALID' };
            }

            const pipeline = buildAttendancePipeline(classId, skip, limit);
            console.log('pipeline data : ', pipeline)

            const [data, totalCount] = await Promise.all([
                Attendance.aggregate(pipeline),
                Attendance.aggregate([
                    { $match: { class: new mongoose.Types.ObjectId(classId) } },
                    { $unwind: "$records" },
                    { $count: "count" }
                ])
            ]);
            console.log('data : ', data)

            const total = totalCount[0]?.count || 0;

            return {
                success: true,
                message: 'ATTENDANCE_FETCH_SUCCESS',
                data,
                pagination: {
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            console.error('Error while getting attendance:', err);
            return { success: false, message: 'SERVER_ERROR' };
        }
    }
}

module.exports = adminAttendanceService