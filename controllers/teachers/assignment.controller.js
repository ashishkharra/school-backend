// controllers/teachers/assignment.controller.js
const assignmentService = require('../../services/teachers/assignment.service')
const { responseData } = require('../../helpers/responseData')

module.exports = {
  uploadAssignmentController: async (req, res) => {
    try {
      const { teacherId, classId, subjectId, title, description } = req.body
      const file = req.file ? req.file.filename : ''

      console.log("---" ,file)

      const response = await assignmentService.uploadAssignment(
        teacherId,
        classId,
        subjectId,
        title,
        description,
        file
      )

      res.status(response.success ? 200 : 400).json(response)
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: 'Server error', error: err.message })
    }
  }
  // const getAssignmentsByClass = async (req, res) => {
  //   const { classId } = req.params;
  //   const result = await assignmentService.getAssignmentsByClass(classId);
  //   return res.status(result.success ? 200 : 404).json(responseData(result.message, result.results, req, result.success));
  // };

  // createAssignment: async (req, res) => {
  //   try {
  //     const { classId, teacherId } = req.params;
  //     const assignmentData = req.body;
  //     const file = req.file; // multer populates this automatically

  //     const result = await teacherService.createAssignment(
  //       teacherId,
  //       classId,
  //       assignmentData,
  //       file
  //     );

  //     return res.status(200).json(
  //       responseData('ASSIGNMENT_CREATED_SUCCESSFULLY', result, req, true)
  //     );

  //   } catch (error) {
  //     return res.status(400).json(
  //       responseData('ASSIGNMENT_CREATION_FAILED', { error: error.message }, req, false)
  //     );
  //   }
  // }
}
