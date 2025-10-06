const adminClassService = require('../../services/admins/class.service.js')
const { responseData } = require('../../helpers/responseData.js');
const constant = require('../../helpers/constant.js');
const { formatClassName } = require('../../helpers/helper.js')

const adminClassController = {
    addClass: async (req, res) => {
        try {
            const data = req.body;
            const result = await adminClassService.addClass(data);
            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));
            }
            return res.status(201).json(responseData(result?.message, result, req, true));
        } catch (error) {
            console.log('Class register error : ', error.message)
            return res.status(500).json(responseData("REGISTRATION_FAILED", {}, req, false));
        }
    },

    updateClass: async (req, res) => {
        try {
            let data = req.body;
            const { classId } = req.params
            const result = await adminClassService.updateClass(data, classId);
            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));
            }
            return res.status(201).json(responseData(result?.message, result, req, true));
        } catch (error) {
            console.log('Class register error : ', error.message)
            return res.status(500).json(responseData("CLASS_UPDATE_FAILED", {}, req, false));
        }
    },

    addSubjects: async (req, res) => {
        try {
            const data = req.body;
            const result = await adminClassService.addSubjects(data);
            if (!result.success) {
                return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));
            }
            return res.status(201).json(responseData(result?.message, result, req, true));
        } catch (error) {
            console.log('Subject register error : ', error.message)
            return res.status(500).json(responseData("REGISTRATION_FAILED", {}, req, false));
        }
    },

    subjectStatus: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ success: false, message: "SUBJECT_ID_REQUIRED" });

            const result = await adminClassService.toggleSubjectStatus(id);

            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }

            return res.status(200).json({ success: true, message: result.message, subject: result.subject });
        } catch (err) {
            console.error("subjectStatus error:", err);
            return res.status(500).json({ success: false, message: "SERVER_ERROR" });
        }
    },

    classStatus: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ success: false, message: "CLASS_ID_REQUIRED" });

            const result = await adminClassService.toggleClassStatus(id);

            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }

            return res.status(200).json({ success: true, message: result.message, class: result.class });
        } catch (err) {
            console.error("classStatus error:", err);
            return res.status(500).json({ success: false, message: "SERVER_ERROR" });
        }
    },

    getAllClasses: async (req, res) => {
        try {
            let { name } = req.query;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;

            // normalize class name first
            if (name) {
                name = formatClassName(name);
            }

            const queryResult = await adminClassService.getAllClasses(name, page, limit);

            return res.json(
                responseData(
                    'GET_LIST',
                    queryResult.docs.length > 0
                        ? queryResult
                        : constant.staticResponseForEmptyResult,
                    req,
                    true
                )
            )
        } catch (error) {
            console.log("Get all class error :", error.message);
            return res
                .status(500)
                .json(responseData("ERROR_WHILE_GETTING_ALL_CLASSES", {}, req, false));
        }
    },

        getAllSubjects: async (req, res) => {
            try {
                const page = parseInt(req.query.page, 10) || 1;
                const limit = parseInt(req.query.limit, 10) || 10;
                const { name } = req.query;

                const queryResult = await adminClassService.getSubjects(page, limit, name);

                if (!queryResult.success) {
                    return res
                        .status(400)
                        .json(responseData(queryResult.message, {}, req, false));
                }

                return res.json(
                    responseData(
                        'GET_LIST',
                        {
                            docs: queryResult.subjects,
                            ...queryResult.pagination
                        },
                        req,
                        true
                    )
                );
            } catch (error) {
                console.log('Get all subjects error : ', error);
                return res
                    .status(500)
                    .json(responseData("ERROR_WHILE_GETTING_ALL_SUBJECTS", {}, req, false));
            }
        },

            updateSubject: async (req, res) => {
                try {
                    const data = req.body;
                    console.log(' update subject data : ', data)
                    const { subjectId } = req.params

                    const result = await adminClassService.updateSubject(data, subjectId);
                    if (!result.success) {
                        return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));
                    }
                    return res.status(201).json(responseData(result?.message, result, req, true));
                } catch (error) {
                    console.log('Subject update error : ', error.message)
                    return res.status(500).json(responseData("SUBJECT_UPDATE_FAILED", {}, req, false));
                }
            },

                deleteSubject: async (req, res) => {
                    try {
                        const { subjectId } = req.params
                        const result = await adminClassService.deleteSubject(data, subjectId);
                        if (!result.success) {
                            return res.status(401).json(responseData(result?.message, {}, req, result?.success || false));
                        }
                        return res.status(201).json(responseData(result?.message, result, req, true));
                    } catch (error) {
                        console.log('Subject delete error : ', error.message)
                        return res.status(500).json(responseData("SUBJECT_DELETE_FAILED", {}, req, false));
                    }
                }
}

module.exports = adminClassController