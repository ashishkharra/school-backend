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
        return res.status(400).json(responseData(result?.message, {}, req, result?.success || false));
      }
      return res.status(201).json(responseData(result?.message, result, req, result?.success || true));
    } catch (error) {
      console.log('Student register error : ', error.message)
      return res.status(500).json(responseData(result?.message, {}, req, result?.success || false));
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
        return res.status(400).json(responseData(result?.message, {}, req, false));
      }

      return res.status(200).json(
        responseData(result?.message, result?.student, req, true)
      );


    } catch (error) {
      console.error("Error in updateStudent:", error);
      return res.status(500).json(responseData(result?.message, {}, req, result?.success));
    }
  },

  updateStudentClass: async (req, res) => {
    try {
      const { studentId, classId } = req.params;

      const result = await adminStudent.updateStudentClass(studentId, classId);

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, {}, req, false));
      }

      return res
        .status(200)
        .json(responseData("STUDENT_CLASS_UPDATED_SUCCESSFULLY", result, req, true));
    } catch (error) {
      console.error("student class update error:", error.message);
      return res
        .status(500)
        .json(responseData("SERVER_ERROR", {}, req, false));
    }
  },

  udpateStudentSection: async (req, res) => {
    try {
      console.log('req body : ', req.body)
      const { classId, studentId, section } = req.params;

      const result = await adminStudent.updateStudentSection(classId, studentId, section);

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, {}, req, false));
      }

      return res
        .status(200)
        .json(responseData("STUDENT_SECTION_UPDATED_SUCCESSFULLY", result, req, true));
    } catch (error) {
      console.error("student section update error:", error.message);
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
      const { page = 1, limit = 10, classId, ...filters } = req.query; // extract classId separately

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      // Call service correctly
      const queryResult = await adminStudent.getStudentAccordingClass(
        classId || null, // ✅ pass classId
        filters,
        pageNumber,
        limitNumber
      );

      if (!queryResult.success) {
        return res
          .status(400)
          .json(responseData(queryResult.message, {}, req, false));
      }

      // Return full object (with students + pagination)
      return res.json(responseData("GET_LIST", queryResult, req, true));
    } catch (error) {
      console.error("getStudentAccordingClass controller error:", error);
      return res
        .status(500)
        .json(responseData("ERROR_WHILE_GETTING_STUDENTS", {}, req, false));
    }
  },

  getStudentById: async (req, res) => {
    try {
      const { studentId } = req.params;

      const student = await adminStudent.getStudentById(studentId);

      if (!student.success) {
        return res.status(400).json(
          responseData(student.message, null, req, student.success)
        );
      }

      return res.status(200).json(
        responseData(student.message, student.result, req, student.success)
      );
    } catch (error) {
      console.error("getStudentById controller error:", error);
      return res.status(500).json(
        responseData("SERVER_ERROR", null, req, false)
      );
    }
  }


};    