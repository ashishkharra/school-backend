const { v4: uuidv4 } = require('uuid');

const { getAllClassesPipeline } = require('../../helpers/commonAggregationPipeline.js')
const Class = require('../../models/class/class.schema.js')

const adminClassService = {
    addClass: async (classData) => {
        try {
            const { name, subjects, section } = classData;

            const classIdentifier = uuidv4();

            const newClass = await Class.create({
                name,
                subjects,
                teacher: null,
                section,
                classIdentifier,
                studentCount: 0,
            });

            if (!newClass) return { success: false, message: "REGISTERATION_FAILED" }

            return {
                success: true,
                message: "CLASS_REGISTERED",
            };
        } catch (error) {
            console.error("Error adding class:", error);

            return {
                success: false,
                message: "REGISTERATION_FAILED",
            };
        }
    },

    getAllClasses: async (classId, section) => {
        try {
            const pipeline = getAllClassesPipeline(classId, section);
            console.log('pipeline : ', pipeline)
            
            const result = await Class.aggregate(pipeline);

            if (!result || result.length === 0) {
                return { success: false, message: "ERROR_WHILE_GETTING_ALL_CLASSES" };
            }

            return {
                success: true,
                message: "CLASSES_FETCHING_SUCCESSFULLY",
                data: result
            };
        } catch (error) {
            console.error("Error fetching classes:", error);
            return {
                success: false,
                message: "SERVER_ERROR"
            };
        }
    }
}

module.exports = adminClassService