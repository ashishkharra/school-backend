const uuidv4 = require('uuidv4')

const { getClassAggregationPipeline } = require('../../helpers/commonAggregationPipeline.js')
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

    getAllClasses: async (classId = null, section = null) => {
        try {
            let classIdentifier = null;

            if (classId && !section) {
                const cls = await Class.findById(classId);
                if (!cls) return { success: false, message: "CLASS_NOT_FOUND" };
                classIdentifier = cls.classIdentifier;
            }

            const pipeline = getClassAggregationPipeline(classIdentifier, section);
            const result = await Class.aggregate(pipeline);

            if (!result || result.length === 0) {
                return { success: false, message: "CLASSES_NOT_FOUND" };
            }

            return { success: true, message: "CLASSES_FETCHED_SUCCESSFULLY", data: result };
        } catch (error) {
            console.error("getAllClasses error:", error);
            return { success: false, message: "ERROR_WHILE_GETTING_ALL_CLASSES" };
        }
    }
}

module.exports = adminClassService