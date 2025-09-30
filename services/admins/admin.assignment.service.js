const { buildAssignmentPipeline } = require('../../helpers/commonAggregationPipeline.js');


const adminAssignmentService = {
    adminAssignment: async (classId, page = 1, limit = 10) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return { success: false, message: 'CLASS_ID_NOT_VALID', data: [] };
            }

            const skip = (page - 1) * limit;
            const pipeline = buildAssignmentPipeline(classId, skip, limit);

            const data = await Assignment.aggregate(pipeline);

            return {
                success: true,
                message: 'ASSIGNMENTS_FETCHED',
                data
            };
        } catch (err) {
            console.error('adminAssignment error:', err);
            return { success: false, message: 'SERVER_ERROR', data: [] };
        }
    }
}

module.exports = adminAssignmentService