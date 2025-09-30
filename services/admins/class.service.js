const { v4: uuidv4 } = require('uuid');

const { getAllClassesPipeline } = require('../../helpers/commonAggregationPipeline.js')
const Class = require('../../models/class/class.schema.js')
const Subject = require('../../models/class/subjects.schema.js')
const { formatClassName } = require('../../helpers/helper.js')

const VALID_SECTIONS = ["A", "B", "C", "D"]

const adminClassService = {

    addClass: async (classData) => {
        try {
            let { name, section, startTime, endTime } = classData;
            name = formatClassName(name);
            section = section.toUpperCase();

            if (!VALID_SECTIONS.includes(section)) {
                return { success: false, message: "SECTION_INVALID" };
            }

            let existingClass = await Class.findOne({ name, section });
            if (existingClass) {
                return { success: false, message: "SECTION_ALREADY_EXIST" };
            }

            let classGroup = await Class.findOne({ name });

            let classIdentifier = classGroup
                ? classGroup.classIdentifier
                : new mongoose.Types.ObjectId();

            const newClass = await Class.create({
                name,
                teacher: null,
                section,
                classIdentifier,
                studentCount: 0,
                startTime,
                endTime,
            });

            if (!newClass) {
                return { success: false, message: "REGISTRATION_FAILED" };
            }

            return { success: true, message: "CLASS_REGISTERED" };
        } catch (error) {
            console.error("Error adding class:", error);
            return { success: false, message: "REGISTRATION_FAILED" };
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

            // Count total docs for the same filter (without skip/limit)
            const total = await Class.countDocuments({
                ...(classId && { classIdentifier: classId }),
                ...(section && { section })
            });

            return {
                success: true,
                message: "CLASSES_FETCHING_SUCCESSFULLY",
                data: result,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error("Error fetching classes:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    getSubjects: async (page = 1, limit = 10) => {
        try {
            page = Math.max(parseInt(page, 10) || 1, 1);
            limit = Math.max(parseInt(limit, 10) || 10, 1);

            const total = await Subject.countDocuments();
            console.log('total subjects : ', total)

            const subjects = await Subject.find()
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit);

            if (subjects.length === 0) {
                return { success: false, message: "NO_SUBJECTS_FOUND", data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
            }

            return {
                success: true,
                message: "SUBJECTS_FETCHED_SUCCESSFULLY",
                docs: subjects,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error("Error while getting subjects:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    }

}

module.exports = adminClassService