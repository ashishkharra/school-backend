const { v4: uuidv4 } = require('uuid');

const { getAllClassesPipeline } = require('../../helpers/commonAggregationPipeline.js')
const Class = require('../../models/class/class.schema.js')
const Subject = require('../../models/class/subjects.schema.js')
const { formatClassName } = require('../../helpers/helper.js');
const { default: mongoose } = require('mongoose');

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

    updateClass: async (classData, classId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(classId)) return { success: false, message: 'CLASS_ID_NOT_VALID' }

            classData.name = formatClassName(classData.name)

            const update = {};
            if (classData.name) update.name = classData.name;
            if (classData.section) update.section = classData.section;
            if (classData.startTime) update.startTime = classData.startTime;
            if (classData.endTime) update.endTime = classData.endTime;

            const result = await Class.findOneAndUpdate(
                { _id: classId },
                { $set: update },
                { new: true }
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

    getAllClasses: async (className, page = 1, limit = 10) => {
        try {
            // filters for counting
            const match = {};
            if (className) match.name = { $regex: className, $options: "i" };

            // total count
            const total = await Class.countDocuments(match);

            // pipeline
            const pipeline = getAllClassesPipeline(className, page, limit);

            const result = await Class.aggregate(pipeline);

            return {
                success: true,
                message: "CLASSES_FETCHING_SUCCESSFULLY",
                docs: result,
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error("Error fetching classes:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    getSubjects: async (page = 1, limit = 10, name = "") => {
        try {
            page = Math.max(parseInt(page, 10) || 1, 1);
            limit = Math.max(parseInt(limit, 10) || 10, 1);

            // Build filter
            const filter = {};
            if (name) {
                filter.name = { $regex: name, $options: "i" }; // case-insensitive match
            }

            const total = await Subject.countDocuments(filter);
            console.log('total subjects : ', total);

            const subjects = await Subject.find(filter)
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit);

            console.log('subjects : ', subjects);

            return {
                success: true,
                message: "SUBJECTS_FETCHED_SUCCESSFULLY",
                subjects,
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
    },

    updateSubject: async (subjectData, _id) => {
        console.log('subject data : ', subjectData)
        try {
            if (!mongoose.Types.ObjectId.isValid(_id)) return { success: false, message: "SUBJECT_ID_NOT_VALID" };
            const update = {};
            if (subjectData.name) update.name = subjectData.name;
            if (subjectData.code) update.code = subjectData.code;
            if (subjectData.description) update.description = subjectData.description;
            if (subjectData.credits) update.credits = subjectData.credits;

            const result = await Subject.findOneAndUpdate(
                { _id },
                { $set: update },
                { new: true }
            );
            console.log('result : ', result)

            if (!result) {
                return { success: false, message: "SUBJECT_NOT_FOUND" };
            }

            return {
                success: true,
                message: "SUBJECT_UPDATED",
                data: result
            };
        } catch (error) {
            console.error("Error updating subject:", error);
            return {
                success: false,
                message: "SUBJECT_UPDATION_FAILED"
            };
        }
    },

    deleteSubject: async (_id) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(_id)) return { success: false, message: "SUBJECT_ID_NOT_VALID" };

            const result = await Subject.findByIdAndDelete(_id)
            if (!result) return { success: false, message: "SUBJECT_NOT_FOUND" };

            return { success: true, message: "SUBJECT_DELETED_SUCCESSFULLY" }
        } catch (error) {
            console.log('error while deleting subject : ', error.message);
            return { succes: false, message: "SUBJECT_DELETION_FAILED" }
        }
    }

}

module.exports = adminClassService