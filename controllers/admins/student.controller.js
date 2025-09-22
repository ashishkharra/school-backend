// controllers/adminController.js
const adminStudent = require("../../services/admins/student.service.js");
const { responseData } = require("../../helpers/responseData.js");

module.exports = {
  // Add Student
  addStudent: async (req, res) => {
    try {
      const student = await adminStudent.addStudent(req.body);
      return res.json(responseData("STUDENT_ADDED", student, req, true));
    } catch (error) {
      console.error("Add Student Error:", error.message);
      return res.json(responseData(error.message || "ERROR_OCCUR", {}, req, false));
    }
  },

  // Get All Students
  getAllStudents: async (req, res) => {
    try {
      const students = await adminStudent.getAllStudents();
      return res.json(responseData("ALL_STUDENTS", students, req, true));
    } catch (error) {
      console.error("Get All Students Error:", error.message);
      return res.json(responseData("ERROR_OCCUR", {}, req, false));
    }
  },

  // Get Student by ID
  getStudentById: async (req, res) => {
    try {
      const student = await adminStudent.getStudentById(req.params.id);
      if (!student) {
        return res.json(responseData("STUDENT_NOT_FOUND", {}, req, false));
      }
      return res.json(responseData("STUDENT_DETAILS", student, req, true));
    } catch (error) {
      console.error("Get Student Error:", error.message);
      return res.json(responseData("ERROR_OCCUR", {}, req, false));
    }
  },

  // Update Student
  updateStudent: async (req, res) => {
    try {
      const student = await adminStudent.updateStudent(req.params.id, req.body);
      if (!student) {
        return res.json(responseData("STUDENT_NOT_FOUND", {}, req, false));
      }
      return res.json(responseData("STUDENT_UPDATED", student, req, true));
    } catch (error) {
      console.error("Update Student Error:", error.message);
      return res.json(responseData("ERROR_OCCUR", {}, req, false));
    }
  },

  // Delete Student
  deleteStudent: async (req, res) => {
    try {
      const deleted = await adminStudent.deleteStudent(req.params.id);
      if (!deleted) {
        return res.json(responseData("STUDENT_NOT_FOUND", {}, req, false));
      }
      return res.json(responseData("STUDENT_DELETED", {}, req, true));
    } catch (error) {
      console.error("Delete Student Error:", error.message);
      return res.json(responseData("ERROR_OCCUR", {}, req, false));
    }
  },
};
