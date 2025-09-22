// controllers/adminController.js
const adminStudent = require("../../services/admins/student.service.js");
const { responseData } = require("../../helpers/responseData.js");

module.exports = {
  // Add Student
  regStudent: async (req, res) => {
    try {
      const data = req.body
      const student = await adminStudent.addStudent(data)
      return res.status(201).json(responseData("STUDENT_REGISTERED", result, req, true));
    } catch (error) {
      console.log('Student register error : ', error.message)
      return res.status(400).json(responseData("REGISTRATION_FAILED", { error: error.message }, req, false));
    }
  }
};    