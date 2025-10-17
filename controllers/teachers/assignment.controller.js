const assignmentService = require('../../services/teachers/assignment.service')
const { responseData } = require('../../helpers/responseData')
const mongoose = require('mongoose');
const { constant } = require('lodash');

module.exports = {

  uploadAssignmentController: async (req, res) => {
    try {
      const { teacherId, classId, subject, title, description, dueDate } = req.body;
      const file = req.file ? req.file.filename : '';
      if (!teacherId || !classId || !subject || !title || !dueDate) {
        return res
          .status(400)
          .json(responseData('INVALID_INPUT_DATA', {}, req, false));
      }

      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res
          .status(400)
          .json(responseData('INVALID_DATE_FORMAT', {}, req, false));
      }
      const response = await assignmentService.uploadAssignment(
        teacherId,
        classId,
        subject,
        title,
        description,
        parsedDueDate,
        file
      );
      if (!response.success) {
        return res
          .status(400)
          .json(
            responseData(
              typeof response.message === 'string' ? response.message : response.message,
              {},
              req,
              false
            )
          );
      }

      return res.status(200).json(
        responseData(
          'ASSIGNMENT_UPLOADED_SUCCESSFULLY',
          response.results,
          req,
          true
        )
      );
    } catch (error) {
      return res.status(500).json(
        responseData(
          'ASSIGNMENT_UPLOAD_FAILED',
          { error: error.message },
          req,
          false
        )
      );
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
    const { id } = req.params; 
    const { title, description } = req.body;
    const file = req.file ? req.file.filename : null; 
    if (!id) {
      return res
        .status(400)
        .json(responseData('ASSIGNMENT_ID_REQUIRED', {}, req, false));
    }
    const response = await assignmentService.updateAssignment(
      id,
      title,
      description,
      file
    );

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
  },


 assignGradeOrMarks: async (req, res) => {
    try {
      const { classId, gradesData } = req.body;

      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        return res
          .status(400)
          .json(responseData('VALID_CLASS_ID_REQUIRED', {}, req, false));
      }

      if (!gradesData || !Array.isArray(gradesData) || !gradesData.length) {
        return res
          .status(400)
          .json(responseData('GRADES_DATA_ARRAY_REQUIRED', {}, req, false));
      }

      const result = await assignmentService.assignGradesToClassPerStudent({
        classId,
        gradesData,
      });

      return res
        .status(200)
        .json(responseData('GRADES_ASSIGNED_SUCCESSFULLY', result, req, true));
    } catch (error) {
      return res
        .status(500)
        .json(responseData(error.message, {}, req, false));
    }
  }
,

updateGrade: async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { marks, grade, remark } = req.body;

    if (!gradeId || !mongoose.Types.ObjectId.isValid(gradeId)) {
      return res
        .status(400)
        .json(responseData('VALID_GRADE_ID_REQUIRED', {}, req, false));
    }

    const updatedGrade = await assignmentService.updateGradeById({
      gradeId,
      marks,
      grade,
      remark
    });

    if (!updatedGrade || !updatedGrade.success) {
      return res
        .status(404)
        .json(responseData('GRADE_NOT_FOUND', {}, req, false));
    }

    return res
      .status(200)
      .json(
        responseData('Grade updated successfully', updatedGrade.results, req, true)
      );
  } catch (error) {
    return res
      .status(500)
      .json(responseData(error.message, {}, req, false));
  }
},

deleteGrade: async (req, res) => {
  try {
    const { gradeId } = req.params;

    if (!gradeId || !mongoose.Types.ObjectId.isValid(gradeId)) {
      return res
        .status(400)
        .json(responseData('VALID_GRADE_ID_REQUIRED', {}, req, false));
    }

    const deletedGrade = await assignmentService.deleteGrade(gradeId);

    if (!deletedGrade || !deletedGrade.success) {
      return res
        .status(404)
        .json(responseData('GRADE_NOT_FOUND', {}, req, false));
    }

    return res
      .status(200)
      .json(responseData('GRADE_DELETED_SUCCESSFULLY', deletedGrade.results, req, true));
  } catch (error) {
    return res
      .status(500)
      .json(responseData(error.message, {}, req, false));
  }
},


//  getGrades: async (req, res) => {
//     try {
//       const { classId, keyword } = req.body;

//       const { page = 1, limit = 10 } = req.query;

//       const queryResult = await assignmentService.getGrades({
//         classId,
//         keyword,
//         page: parseInt(page),
//         limit: parseInt(limit)
//       });

//       return res.json(
//         responseData(
//           'GET_LIST',
//           queryResult.results && queryResult.results.docs.length > 0
//             ? queryResult.results
//             : constant.staticResponseForEmptyResult,
//           req,
//           queryResult.success
//         )
//       );
//     } catch (error) {
//       return res.status(500).json(
//         responseData(
//           'GET_GRADES_FAILED',
//           { error: error.message },
//           req,
//           false
//         )
//       );
//     }
//   }
getGrades: async (req, res) => {
  try {
    const { classId, keyword, status } = req.body;
    const { page = 1, limit = 10 } = req.query;

    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res
        .status(400)
        .json(responseData('VALID_CLASS_ID_REQUIRED', {}, req, false));
    }

    const queryResult = await assignmentService.getGrades({
      classId,
      keyword,
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    return res.status(200).json(
      responseData(
        queryResult.success ? 'GRADES_FETCHED_SUCCESSFULLY' : 'GET_LIST',
        queryResult.results && queryResult.results.docs.length > 0
          ? queryResult.results
          : constant.staticResponseForEmptyResult,
        req,
        queryResult.success
      )
    );
  } catch (error) {
    return res.status(500).json(
      responseData('GET_GRADES_FAILED', { error: error.message }, req, false)
    );
  }
}


};
