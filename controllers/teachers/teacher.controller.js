const teacherService = require('../../services/teachers/teacher.service')
const { responseData } = require('../../helpers/responseData') 
const { constant } = require('lodash')

module.exports = {
  getProfile: async (req, res) => {
    try {
      const teacherId = req.user._id
      const profile = await teacherService.getProfile(teacherId)
      return res
        .status(200)
        .json(
          responseData(profile?.message, profile, req, profile?.success || true)
        )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'FETCH_PROFILE_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },
  requestProfileUpdate: async (req, res) => {
    try {
      const { teacherId } = req.params
      const requestedFields = req.body.requestedFields 

      if (!requestedFields || Object.keys(requestedFields).length === 0) {
        return res
          .status(400)
          .json(responseData('REQUESTED_FIELDS_EMPTY', {}, req, false))
      }

      const result = await teacherService.requestProfileUpdate(
        teacherId,
        requestedFields
      )

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, {}, req, false))
      }

      return res.status(200).json(
        responseData(
          result.message,
          {
            teacherId,
            requestedFields 
          },
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
  teacherForgotPassword: async (req, res) => {
    try {
      await teacherService.teacherForgotPassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },

  teacherResetPassword: async (req, res) => {
    try {
      await teacherService.teacherResetPassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },

  changePassword: async (req, res) => {
    try {
      await teacherService.changePassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },

  getAttendance: async (req, res) => {
    try {
      const { month, year } = req.query
      const teacherId = req.user._id

      if (!month || !year) {
        return res
          .status(400)
          .json(responseData('MONTH_YEAR_REQUIRED', {}, req, false))
      }

      const attendance = await teacherService.getAttendance(
        teacherId,
        parseInt(month),
        parseInt(year)
      )

      return res
        .status(200)
        .json(responseData('ATTENDANCE_FETCHED', attendance, req, true))
    } catch (err) {
      return res
        .status(500)
        .json(responseData('ERROR_OCCUR', { error: err.message }, req, false))
    }
  },

  downloadMySalaryInvoice: async (req, res) => { 
    try {
      const teacherId = req.user?._id 
      const { month } = req.params

      if (!teacherId) {
        return res
          .status(401)
          .json({ success: false, message: 'UNAUTHORIZED_ACCESS' })
      }

      const response = await teacherService.downloadMySalaryInvoice(
        teacherId,
        month
      )

      if (!response.success) {
        return res
          .status(400)
          .json({ success: false, message: response.message })
      }

      res.download(response.filePath, `Salary_Invoice_${month}.pdf`, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ success: false, message: 'DOWNLOAD_FAILED' })
        }
      })
    } catch (error) {
      return res.status(500).json({ success: false, message: 'SERVER_ERROR' })
    }
  },

    getTeacherDashboard: async (req, res) => {
      try {
        const teacherId = req.user._id
    const { month } = req.query; 

        const result = await teacherService.getTeacherDashboardData(teacherId)

        if (!result.success) {
          return res
            .status(400)
            .json(responseData(result.message, {}, req, false))
        }

        return res
          .status(200)
          .json(responseData(result.message, result.data, req, true))
      } catch (error) {
        return res
          .status(500)
          .json(
            responseData(
              error.message || 'SERVER_ERROR',
              { error: error.message },
              req,
              false
            )
          )
      }
    },
     getTeacherClassAndAssignments: async (req, res) => {
    try {
      const teacherId = req.user._id 

      const result = await teacherService.getTeacherClassAndAssignments(teacherId)

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, {}, req, false))
      }

      return res
        .status(200)
        .json(responseData(result.message, result.data, req, true))
    } catch (error) {
      return res
        .status(500)
        .json(
          responseData(
            error.message || 'SERVER_ERROR',
            { error: error.message },
            req,
            false
          )
        )
    }
  }
}
