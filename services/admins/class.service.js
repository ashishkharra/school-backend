const { v4: uuidv4 } = require('uuid');

const { getAllClassesPipeline } = require('../../helpers/commonAggregationPipeline.js')
const Class = require('../../models/class/class.schema.js')
const Subject = require('../../models/class/subjects.schema.js');
const { getPaginationArray } = require('../../helpers/helper.js');

const adminClassService = {
    addClass: async (classData) => {
        try {
            const { name, section } = classData;

            const classIdentifier = uuidv4();

            const newClass = await Class.create({
                name,
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

    updateClass: async (classData, classId) => {
        try {
            // Build an update object only with provided fields
            const update = {};
            if (classData.name) update.name = classData.name;
            if (classData.section) update.section = classData.section;

            const result = await Class.findOneAndUpdate(
                { _id: classId },    // filter: which class to update
                { $set: update },    // update: what to change
                { new: true }        // options: return the updated document
            );

            if (!result) {
                return { success: false, message: "CLASS_NOT_FOUND" };
            }

            return {
                success: true,
                message: "CLASS_UPDATED",
                data: result
            };
        } catch (error) {
            console.error("Error updating class:", error);
            return {
                success: false,
                message: "REGISTRATION_FAILED"
            };
        }
    },

    addSubjects: async (subjectData) => {
        try {
            const { name, code, description, credits } = subjectData;

            const existing = await Subject.findOne({
                $or: [{ name: name.trim() }, { code: code.trim() }]
            });
            if (existing) {
                return { success: false, message: "SUBJECT_ALREADY_EXISTS" };
            }

            const newSubject = await Subject.create({
                name: name.trim(),
                code: code.trim(),
                description: description?.trim() || "",
                credits: typeof credits === "number" ? credits : undefined,
            });

            return {
                success: true,
                message: "SUBJECT_REGISTERED_SUCCESSFULLY",
                data: newSubject,
            };
        } catch (error) {
            console.error("Error while registering subject:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    getAllClasses: async (classId, section, page = 1, limit = 10) => {
        try {
            const pipeline = getAllClassesPipeline(classId, section, page, limit);

            // Run pipeline for paginated data
            const result = await Class.aggregate(pipeline);

            // // Count total docs for the same filter (without skip/limit)
            // const total = await Class.countDocuments({
            //     ...(classId && { classIdentifier: classId }),
            //     ...(section && { section })
            // });
            return result
            // return {
            //     success: true,
            //     message: "CLASSES_FETCHING_SUCCESSFULLY",
            //     data: result,
            //     pagination: {
            //         page,
            //         limit,
            //         total,
            //         totalPages: Math.ceil(total / limit)
            //     }
            // };
        } catch (error) {
            console.error("Error fetching classes:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    getSubjects: async (page = 1, limit = 10) => {
        try {
            // Ensure page & limit are numbers and not negative
            page = Math.max(parseInt(page, 10) || 1, 1);
            limit = Math.max(parseInt(limit, 10) || 10, 1);

            // Count total subjects for pagination metadata
            const total = await Subject.countDocuments();
            console.log('total subjects : ', total)

            // Fetch paginated subjects, sorted by name
            const subjects = await Subject.aggregate(
                [
                    ...getPaginationArray(page, limit)
                ]
            )

            if (subjects.length === 0) {
                return { success: false, message: "NO_SUBJECTS_FOUND", docs: [], pagination: { page, limit, total: 0, totalPages: 0 } };
            }
            return subjects
         } catch (error) {
            console.error("Error while getting subjects:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    }

}

module.exports = adminClassService