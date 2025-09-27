// controllers/teachers/assignment.controller.js
const teacherService = require('../../services/teachers/assignment.service');
const { responseData } = require('../../helpers/responseData');

module.exports = {

  createAssignment: async (req, res) => {
    try {
      const { classId, teacherId } = req.params;
      const assignmentData = req.body;
      const file = req.file; // multer populates this automatically

      const result = await teacherService.createAssignment(
        teacherId,
        classId,
        assignmentData,
        file
      );

      return res.status(200).json(
        responseData('ASSIGNMENT_CREATED_SUCCESSFULLY', result, req, true)
      );

    } catch (error) {
      return res.status(400).json(
        responseData('ASSIGNMENT_CREATION_FAILED', { error: error.message }, req, false)
      );
    }
  }

};

