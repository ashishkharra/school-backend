
// const teacherService = require('../../models/admin/teacher.schema');
const adminTeacherService = require("../../services/admins/teacher.service");

const {responseData} = require('../../helpers/responseData');



module.exports = {
registerTeacher: async (req, res) => {
    try {
      const result = await adminTeacherService.registerTeacher(req.body);
      return res.status(201).json(responseData("TEACHER_REGISTERED", result, req, true));
    } catch (error) {
      console.error("Error registering teacher:", error.message);
      return res.status(400).json(responseData("REGISTRATION_FAILED", { error: error.message }, req, false));
    }
  }
};

