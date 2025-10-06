const Assignment = require('../../models/assignment/assignment.schema.js')
const Submission = require('../../models/assignment/submission.schema.js')
const { buildAssignmentPipeline, getSubmissionsPipeline } = require('../../helpers/commonAggregationPipeline.js');


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
                docs: data
            };
        } catch (err) {
            console.error('adminAssignment error:', err);
            return { success: false, message: 'SERVER_ERROR', data: [] };
        }
    },

    getSubmissions: async (classId, studentId, page = 1, limit = 10) => {
        try {
            if (studentId && !classId) {
                return {
                    success: false,
                    message: "CLASS_ID_NOT_PROVIDED",
                };
            }

            const pipeline = getSubmissionsPipeline(classId, studentId, page, limit);

            const submissions = await Submission.aggregate(pipeline);

            const countPipeline = getSubmissionsPipeline(classId, studentId);
            countPipeline.push({ $count: "total" });
            const totalResult = await Submission.aggregate(countPipeline);
            const total = totalResult.length > 0 ? totalResult[0].total : 0;

            return {
                success: true,
                message: "SUBMISSIONS_FETCHED_SUCCESSFULLY",
                docs: submissions,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error("Error while fetching submissions:", error.message);
            return { success: false, message: "SERVER_ERROR" };
        }
    },
}

module.exports = adminAssignmentService