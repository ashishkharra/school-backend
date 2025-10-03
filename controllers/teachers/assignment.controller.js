// controllers/teachers/assignment.controller.js
const assignmentService = require('../../services/teachers/assignment.service')
const { responseData } = require('../../helpers/responseData')
const constant = require('../../helpers/constant')

module.exports = {
  uploadAssignmentController: async (req, res) => {
    console.log('req , body : ', req.body)
    try {
      const { teacherId, classId, subjectId, title, description, dueDate } =
        req.body
      const file = req.file ? req.file.filename : ''
      // ✅ Basic validation
      if (!teacherId || !classId || !subjectId || !title || !dueDate) {
        return res
          .status(400)
          .json(responseData('INVALID_INPUT_DATA', {}, req, false))
      }

      // ✅ Date validation
      const parsedDueDate = new Date(dueDate)
      if (isNaN(parsedDueDate.getTime())) {
        return res
          .status(400)
          .json(responseData('INVALID_DATE_FORMAT', {}, req, false))
      }

      // ✅ Call service
      const response = await assignmentService.uploadAssignment(
        teacherId,
        classId,
        subjectId,
        title,
        description,
        parsedDueDate,
        file
      )

      if (!response.success) {
        return res
          .status(400)
          .json(responseData(response.message, {}, req, false))
      }

      return res
        .status(200)
        .json(
          responseData(
            'ASSIGNMENT_UPLOADED_SUCCESSFULLY',
            response.results,
            req,
            true
          )
        )
    } catch (error) {
      console.error('Controller error:', error)
      return res
        .status(500)
        .json(
          responseData(
            'ASSIGNMENT_UPLOAD_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },





  getAssignmentsController: async (req, res) => {
    try {
      const { classId, subject, uploadedBy } = req.body
      const { page = 1, limit = 10 } = req.query

      const queryResult = await assignmentService.getAssignments(
        classId,
        subject,
        uploadedBy,
        parseInt(page),
        parseInt(limit)
      )

      return res.json(
      responseData(
        'GET_LIST',
        (queryResult.results && queryResult.results.docs.length > 0)
          ? queryResult.results
          : constant.staticResponseForEmptyResult,
        req,
        queryResult.success
      )
    );
    } catch (error) {
      console.error('Get assignments controller error:', error)
      return res
        .status(500)
        .json(
          responseData(
            'GET_ASSIGNMENT_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },







 updateAssignmentController: async (req, res) => {
  try {
    const { id } = req.params; // Assignment ID
    const { title, description } = req.body;
    const file = req.file ? req.file.filename : null; // handle optional new file
     console.log('fil---',file)

    // ✅ Validate input
    if (!id) {
      return res
        .status(400)
        .json(responseData('ASSIGNMENT_ID_REQUIRED', {}, req, false));
    }

    // ✅ Call service
    const response = await assignmentService.updateAssignment(
      id,
      title,
      description,
      file
    );
    console.log("response---",response)

    if (!response.success) {
      return res
        .status(400)
        .json(responseData(response.message, {}, req, false));
    }

    return res
      .status(200)
      .json(
        responseData(
          'ASSIGNMENT_UPDATED',
          response.results,
          req,
          true
        )
      );
  } catch (err) {
    console.error('Update Assignment Controller Error:', err);
    return res
      .status(500)
      .json(responseData('ASSIGNMENT_UPDATE_FAILED', { error: err.message }, req, false));
  }
},








  deleteAssignmentController: async (req, res) => {
    try {
      const { assignmentId } = req.params

      const response = await assignmentService.deleteAssignment(assignmentId)

      return res
        .status(response.success ? 200 : 400)
        .json(
          responseData(
            response.success
              ? 'ASSIGNMENT_DELETED_SUCCESSFULLY'
              : 'DELETE_ASSIGNMENT_FAILED',
            response.success ? response.results : { error: response.message },
            req,
            response.success
          )
        )
    } catch (error) {
      console.error('Delete assignment controller error:', error)
      return res
        .status(500)
        .json(
          responseData(
            'DELETE_ASSIGNMENT_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  }
}
