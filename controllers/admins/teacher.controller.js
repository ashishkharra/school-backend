const adminTeacherService = require('../../services/admins/teacher.service')
const { responseData } = require('../../helpers/responseData')
const constant = require('../../helpers/constant')

module.exports = {
  registerTeacher: async (req, res) => {

    console.log('teaher body : ', req.body);
    console.log('teacher files ; ', req.files)
    try {
      const result = await adminTeacherService.registerTeacher(req.body)
      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, {}, req, false))
      }
      return res
        .status(201)
        .json(responseData(result.message, result.data, req, true))
    } catch (error) {
      return res.status(500).json(responseData(error.message, { error: error.message }, req, false))
    }
  },

  updateTeacher: async (req, res) => {
    try {
      const { id } = req.params
      const updateData = req.body
      const updatedTeacher = await adminTeacherService.updateTeacher(
        id,
        updateData
      )

      return res
        .status(200)
        .json(responseData('TEACHER_UPDATED', updatedTeacher, req, true))
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData('UPDATE_FAILED', { error: error.message }, req, false)
        )
    }
  },

  getAllTeachers: async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const queryResult = await adminTeacherService.getAllTeachers(page, limit, status);
      console.log("queryResult", queryResult)
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.data.length > 0
            ? queryResult
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      );
    } catch (error) {
      return res.status(500).json(
        responseData(
          'FAILED_TO_FETCH_TEACHERS',
          { error: error.message },
          req,
          false
        )
      );
    }
  },

  softDeleteTeacher: async (req, res) => {
    try {
      const { id } = req.params
      const teacher = await adminTeacherService.softDeleteTeacher(id)
      return res
        .status(200)
        .json(responseData('TEACHER_SOFT_DELETED', teacher, req, true))
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'SOFT_DELETE_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },

  getDeletedTeachersHistory: async (req, res) => {
    try {
      const { keyword, page = 1, limit = 10 } = req.query
      const queryResult = await adminTeacherService.getDeletedTeachersHistory(
        keyword,
        parseInt(page),
        parseInt(limit)
      )
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0
            ? queryResult[0]
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'FETCH_HISTORY_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },

  assignClassTeacher: async (req, res) => {
    try {
      const { classId, teacherId } = req.body;

      const result = await adminTeacherService.assignClassTeacher({ classId, teacherId });

      return res
        .status(result.success ? 200 : 400)
        .json(responseData(result.message, result.data, req, result.success));
    } catch (error) {
      return res
        .status(500)
        .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
    }
  },

  updateClassTeacher: async (req, res) => {
    try {
      const { classId, teacherId } = req.body;

      const result = await adminTeacherService.updateClassTeacher({
        classId,
        teacherId
      });

      return res
        .status(result.success ? 200 : 400)
        .json(responseData(result.message, result.data, req, result.success));
    } catch (error) {
      return res
        .status(500)
        .json(responseData("SERVER_ERROR", { error: error.message }, req, false));
    }
  },

  getAllTeachersWithClassData: async (req, res) => {
    try {

      const { keyword, page = 1, limit = 10 } = req.query;
      const queryResult = await adminTeacherService.getAllTeachersWithClassData(
        keyword,
        parseInt(page),
        parseInt(limit)
      );

      return res.json(
        responseData(
          'GET_LIST',
          queryResult.data.length > 0
            ? queryResult
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      );
    } catch (error) {
      return res
        .status(500)
        .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
    }
  }
  ,
  removeClassTeacher: async (req, res) => {
    try {
      const { classId } = req.params;
      const result = await adminTeacherService.removeClassTeacher({ classId });

      return res
        .status(result.success ? 200 : 400)
        .json(responseData(result.message, result.data, req, result.success));
    } catch (error) {
      return res
        .status(500)
        .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
    }
  },


  assignTeacherToClassController: async (req, res) => {
    try {
      const { classId, teacherId, section, subjectId, startTime, endTime } = req.body
      const savedAssignment = await adminTeacherService.assignTeacherToClass({
        classId,
        teacherId,
        section,
        subjectId,
        startTime,
        endTime
      })

      return res
        .status(200)
        .json(
          responseData('TEACHER_ASSIGNED_TO_CLASS', savedAssignment, req, true)
        )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'ASSIGN_TEACHER_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },

  updateAssignTeacherToController: async (req, res) => {
    try {
      const { assignmentId } = req.params
      const { classId, teacherId, section, subjectId, startTime, endTime } = req.body

      const updatedAssignment = await adminTeacherService.updateTeacherAssign({
        assignmentId,
        classId,
        teacherId,
        section,
        subjectId,
        startTime,
        endTime
      })

      return res
        .status(updatedAssignment.success ? 200 : 400)
        .json(
          responseData(
            updatedAssignment.message,
            updatedAssignment.data,
            req,
            updatedAssignment.success
          )
        )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData('UPDATE_TEACHER_FAILED', { error: error.message }, req, false)
        )
    }
  },

  deleteAssignTeacherToController: async (req, res) => {
    try {
      const { assignmentId } = req.params
      console.log(req.params, "req.params----")
      const deletedAssignment = await adminTeacherService.deleteTeacherAssign({
        assignmentId
      })
      console.log(deletedAssignment, "deletedAssignment-----")
      return res
        .status(deletedAssignment.success ? 200 : 400)
        .json(
          responseData(
            deletedAssignment.message,
            deletedAssignment.data,
            req,
            deletedAssignment.success
          )
        )

    } catch (error) {
      console.log("catch", error)
      return res
        .status(400)
        .json(
          responseData('DELETE_TEACHER_FAILED', { error: error.message }, req, false)
        )
    }

  },

  getAssignTeacherToController: async (req, res) => {
    try {
      const { classId, teacherId, page = 1, limit = 10 } = req.query;
      console.log('req.query', req.query)
      const queryResult = await adminTeacherService.getTeacherAssign({
        classId, teacherId,

        page: parseInt(page),
        limit: parseInt(limit)
      });
      console.log(queryResult, "queryResult------");


      return res.json(
        responseData(
          'GET_LIST',
          queryResult.data.length > 0
            ? queryResult
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      );
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData("GET_TEACHER_ASSIGNMENTS_FAILED", { error: error.message }, req, false)
        );
    }
  },

  markAttendance: async (req, res) => {
    try {
      console.log('attendance data ; ', req.body)
      const { teacherId, status } = req.body;
      const result = await adminTeacherService.markAttendance(teacherId, status);

      if (!result.success) {
        return res.status(401).json(responseData(result?.message, {}, req, result?.success || false))
      }

      return res.status(result.success ? 200 : 400).json(responseData(result?.message, result, req, result?.success || true));
    } catch (error) {
      console.error("markAttendance error:", error);
      return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
    }
  },

  updateAttendance: async (req, res) => {
    try {
      const { teacherId, status } = req.body;
      const result = await adminTeacherService.updateAttendance(teacherId, status);

      if (!result.success) {
        return res.status(401).json(responseData(result?.message, {}, req, result?.success || false))
      }

      res.status(result.success ? 200 : 400).json(responseData(result?.message, result, req, result?.success || true));
    } catch (error) {
      console.error("updateAttendance error:", error);
      return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
    }
  },

  getAttendance: async (req, res) => {
    try {
      const { teacherId, month, year, date, page = 1, limit = 10, status } = req.query;

      if (!teacherId) {
        return res.status(400).json(responseData("TEACHER_ID_REQUIRED", {}, req, false));
      }

      if (!mongoose.isValidObjectId(teacherId)) {
        return res.status(400).json(responseData("INVALID_TEACHER_ID", {}, req, false));
      }

      const parsedMonth = month ? parseInt(month, 10) : null;
      const parsedYear = year ? parseInt(year, 10) : null;

      if (month && (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)) {
        return res.status(400).json(responseData("INVALID_MONTH", {}, req, false));
      }

      if (year && (isNaN(parsedYear) || parsedYear < 1900)) {
        return res.status(400).json(responseData("INVALID_YEAR", {}, req, false));
      }

      const validStatuses = ["Present", "Absent"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json(responseData("INVALID_STATUS", {}, req, false));
      }

      const result = await adminTeacherService.getAttendance(teacherId, {
        month: parsedMonth,
        year: parsedYear,
        date: date || null,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status: status || null
      });

      if (!result.success) {
        return res.status(400).json(responseData(result.message, {}, req, false));
      }

      return res.status(200).json(responseData("GET_TEACHER_ATTENDANCE", result, req, true));
    } catch (error) {
      console.error("Error in getAttendance:", error);
      return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
    }
  }
}
