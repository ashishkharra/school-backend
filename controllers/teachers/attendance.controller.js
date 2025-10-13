const attendanceService = require('../../services/teachers/attendance.service')
const { responseData } = require('../../helpers/responseData')
const { constant } = require('lodash')

module.exports = {
  // MARK OR UPDATE ATTENDANCE
  markOrUpdateAttendance: async (req, res) => {
    try {
      const { classId, session, takenBy, records } = req.body

      if (!classId || !session || !takenBy || !records) {
        return res
          .status(400)
          .json(responseData('MISSING_REQUIRED_FIELDS', {}, req, false))
      }

      if (!Array.isArray(records)) {
        return res
          .status(400)
          .json(responseData('RECORDS_MUST_BE_ARRAY', {}, req, false))
      }

      const result = await attendanceService.markOrUpdateAttendance({
        classId,
        session,
        takenBy,
        records
      })

      if (!result.success) {
        return res
          .status(400)
          .json(
            responseData(
              result.message || 'ATTENDANCE_UPDATE_FAILED',
              {},
              req,
              false
            )
          )
      }

      return res
        .status(200)
        .json(
          responseData(
            'ATTENDANCE_FETCHED_OR_UPDATED',
            result.results,
            req,
            true
          )
        )
    } catch (error) {
      console.error(error)
      return res
        .status(500)
        .json(
          responseData('SERVER_ERROR', { error: error.message }, req, false)
        )
    }
  },

  updateAttendanceController: async (req, res) => {
    try {
      const { attendanceId } = req.params
      const { records } = req.body

      if (!attendanceId) {
        return res
          .status(400)
          .json(responseData('MISSING_ATTENDANCE_ID', {}, req, false))
      }
      if (!records || !Array.isArray(records)) {
        return res
          .status(400)
          .json(responseData('RECORDS_MUST_BE_ARRAY', {}, req, false))
      }

      const updatedAttendance = await attendanceService.updateAttendanceById({
        attendanceId,
        records
      })

      if (!updatedAttendance || !updatedAttendance.success) {
        return res
          .status(404)
          .json(responseData('ATTENDANCE_RECORD_NOT_FOUND', {}, req, false))
      }

      // Only pass the actual attendance document, not the entire service response
      return res.status(200).json(
        responseData(
          'ATTENDANCE_UPDATED_SUCCESSFULLY',
          updatedAttendance.results, // <--- fixed here
          req,
          true
        )
      )
    } catch (error) {
      return res
        .status(500)
        .json(
          responseData('SERVER_ERROR', { error: error.message }, req, false)
        )
    }
  },
  getAttendance: async (req, res) => {
    const { date, page = 1, limit = 10 } = req.query
    try {
      const queryResult = await attendanceService.getAttendanceData(
        date,
        parseInt(page),
        parseInt(limit)
      )

      // check if docs exist
      if (!queryResult.results || queryResult.results.docs.length === 0) {
        return res
          .status(404)
          .json(responseData('NO_ATTENDANCE_RECORDS_FOUND', {}, req, false))
      }

      return res
        .status(200)
        .json(
          responseData(
            'ATTENDANCE_RECORDS_FETCHED_SUCCESSFULLY',
            queryResult.results,
            req,
            queryResult.success
          )
        )
    } catch (error) {
      if (error.message === 'Invalid date format') {
        return res
          .status(400)
          .json(responseData('INVALID_DATE_FORMAT', {}, req, false))
      }
      res
        .status(500)
        .json(
          responseData('SERVER_ERROR', { error: error.message }, req, false)
        )
    }
  },
  deleteAttendance: async (req, res) => {
    try {
      const { attendanceId } = req.params // get _id from URL

      if (!attendanceId) {
        return res
          .status(400)
          .json(responseData('MISSING_ATTENDANCE_ID', {}, req, false))
      }

      const deletedAttendance = await attendanceService.deleteAttendance(
        attendanceId
      )

      if (!deletedAttendance || !deletedAttendance.success) {
        return res
          .status(404)
          .json(responseData('ATTENDANCE_NOT_FOUND', {}, req, false))
      }

      // Only pass the actual deleted document to results
      return res
        .status(200)
        .json(
          responseData(
            'ATTENDANCE_DELETED_SUCCESSFULLY',
            deletedAttendance.results,
            req,
            true
          )
        )
    } catch (error) {
      return res
        .status(500)
        .json(
          responseData('SERVER_ERROR', { error: error.message }, req, false)
        )
    }
  }
}
