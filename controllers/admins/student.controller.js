// controllers/adminController.js
const adminStudent = require("../../services/admins/student.service.js");
const { responseData } = require("../../helpers/responseData.js");
const { result } = require("lodash");

module.exports = {
  // Add Student
  regStudent: async (req, res) => {
    try {
      const data = req.body
      const result = await adminStudent.addStudent(data)
      if (!result?.success) {
        return res.status(400).json(responseData(result?.message, result, req, result?.success || false));
      }
      return res.status(201).json(responseData(result?.message, result?.message, req, result?.success || true));
    } catch (error) {
      console.log('Student register error : ', error.message)
      return res.status(500).json(responseData(result?.message, { error: error.message }, req, result?.success || false));
    }
  },

  updateStudent: async (req, res) => {
    try {
      const data = req.body;
      const { studentId } = req.params;
      const result = await adminStudent.updateStudent(data, studentId);

      console.log('result--------- : ', result)

      if (!result?.success) {
        console.log('this one running')
        return res.status(400).json(responseData(result?.message, result, req, false));
      }

      return res.status(200).json(
        responseData(result?.message, result?.student, req, true)
      );


    } catch (error) {
      console.error("Error in updateStudent:", error);
      return res.status(500).json(responseData(result?.message, error?.message, req, result?.success));
    }
  },

  updateStudentClass: async (req, res) => {
    try {
      const { studentId, classId } = req.params;
      const { section, year } = req.body; // optional payload

      const result = await adminStudent.updateStudentClass(studentId, classId, section, year);

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, result, req, false));
      }

      return res
        .status(200)
        .json(responseData("STUDENT_CLASS_UPDATED_SUCCESSFULLY", result, req, true));
    } catch (error) {
      console.error("student class update error:", error.message);
      return res
        .status(500)
        .json(responseData("SERVER_ERROR", error.message, req, false));
    }
  },

  deleteStudent: async (req, res) => {
    try {
      const { studentId } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      const result = await adminStudent.deleteStudent(studentId, adminId, reason);

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, null, req, result.success));
      }

      return res
        .status(200)
        .json(responseData(result.message, result.student, req, result.success));
    } catch (error) {
      console.error("deleteStudent Controller error:", error);
      return res
        .status(500)
        .json(responseData("SERVER_ERROR", error.message, req, false));
    }
  },

  getStudentAccordingClass: async (req, res) => {
    try {
      const { classId } = req.params;
      const { page = 1, limit = 10, ...filters } = req.query; // filters from query params

      // Convert page & limit to numbers
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      // Call service to get students
      const result = await ClassService.getStudentAccordingClass(
        classId,
        filters,
        pageNumber,
        limitNumber
      );

      if (!result.class) {
        return res.status(400).json(responseData(result?.message, null, req, result?.success || false));
      }

      // Return response
      return res.status(200).json(responseData(result?.message, result, req, result?.success || true));
    } catch (error) {
      console.error("getStudentAccordingClass controller error:", error);
      return res.status(500).json(responseData(result?.message, null, req, result?.success || false));
    }
  },

  getStudentById: async (req, res) => {
    try {
      const { studentId } = req.params;

      // 2. Get student data using service
      const student = await adminStudent.getStudentById(studentId)

      if (!student.success) {
        return res.status(400).json(responseData(result?.message, null, req, result?.success || false));
      }

      // 3. Return response
      return res.status(200).json(responseData(result?.message, result, req, result?.success || true));
    } catch (error) {
      console.error("getStudentById controller error:", error);
      return res.status(500).json(responseData(result?.message, null, req, result?.success || false));
    }
  }

};    