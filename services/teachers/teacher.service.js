const Teacher = require('../../models/teacher/teacher.schema.js')
const TeacherAttendance = require('../../models/teacher/teacherAttendance.schema.js')
// const ProfileUpdateRequest = require('../../models/teacher/profileUpdateRequest.schema');
const { sendEmail } = require('../../helpers/helper')
const {
  teacherProfilePipeline,
  teacherAttendancePipeline
} = require('../../helpers/commonAggregationPipeline.js')
const { default: mongoose } = require('mongoose')
const _ = require('lodash')
module.exports = {
  requestProfileUpdate: async (teacherId, requestedFields) => {
    try {
      // ✅ Validate teacherId
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return { success: false, message: 'TEACHER_ID_NOT_VALID' }
      }

      // ✅ Fetch teacher info
      const teacher = await Teacher.findById(teacherId).lean()
      if (!teacher) return { success: false, message: 'TEACHER_NOT_FOUND' }

      // ✅ Prepare requestedFields for email (handle nested objects)
      const requestedFieldsHtml = Object.entries(requestedFields || {})
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `${_.startCase(key)}: ${JSON.stringify(value, null, 2)}`
          }
          return `${_.startCase(key)}: ${value}`
        })
        .join('<br/>')

      // ✅ Prepare email body
      const emailData = {
        ADMIN_NAME: 'Admin',
        TEACHER_NAME: teacher.name,
        TEACHER_EMAIL: teacher.email || '',
        TEACHER_PHONE: teacher.phone || '',
        REQUESTED_FIELDS: requestedFieldsHtml,
        REQUEST_DATE: new Date().toLocaleString(),
        SCHOOL_NAME: process.env.SCHOOL_NAME || 'Your School'
      }

      // ✅ Send email
      const emailSent = await sendEmail(
        'teacher-profile-update-request',
        emailData
      )
      if (!emailSent) return { success: false, message: 'EMAIL_ERROR' }

      return { success: true, message: 'EMAIL_SUCCESSFULLY_SENT' }
    } catch (error) {
      console.error('Error in requestProfileUpdate service:', error)
      return {
        success: false,
        message: 'SERVER_ERROR',
        results: { error: error.message }
      }
    }
  },

  getProfile: async (teacherId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(teacherId))
        return { success: false, message: 'TEACHER_ID_NOT_VALID' }

      let [profile] = await Teacher.aggregate(teacherProfilePipeline(teacherId))
      if (!profile) return { success: false, message: 'ERROR_FETCHING_TEACHER' }

      const base = process.env.STATIC_URL || ''

      profile.profilePic = profile.profilePic ? base + profile.profilePic : null
      profile.aadharFront = profile.aadharFront
        ? base + profile.aadharFront
        : null
      profile.aadharBack = profile.aadharBack ? base + profile.aadharBack : null
      profile.resume = profile.resume ? base + profile.resume : null

      profile.certificates = Array.isArray(profile.certificates)
        ? profile.certificates.map((cert) => base + cert)
        : []

      console.log(profile.profilePic, '-------.')
      return {
        success: true,
        message: 'FETCHING_TEACHER_PROFILE_SUCCESSFULLY',
        profile
      }
    } catch (err) {
      console.error('Get Teacher Profile Error:', err.message)
      return { success: false, message: 'SERVER_ERROR' }
    }
  },

  teacherForgotPassword: async (req, res) => {
    try {
      const email = req.body.email.toLowerCase()
      const student = await Teacher.findOne({ email })

      if (student) {
        const resetToken = jwt.sign(
          { id: student._id, email: student.email },
          process.env.JWT_SECRET,
          { expiresIn: '15m' }
        )
        await Teacher.findOneAndUpdate({ email }, { token: resetToken })

        const link = `${process.env.RESET_PASSWORD_LINK}/${resetToken}`

        const dataBody = {
          email: email,
          EMAIL: email,
          LINK: link,
          TEACHER_NAME: Teacher.name
        }

        try {
          await sendEmail('student-forgot-password', dataBody)
          return res.json(responseData('EMAIL_SENT', {}, req, true))
        } catch (emailErr) {
          console.error('Email sending failed:', emailErr.message)
          return res.json(responseData('EMAIL_SEND_FAILED', {}, req, false))
        }
      } else {
        return res.json(responseData('STUDENT_EMAIL_NOT_FOUND', {}, req, false))
      }
    } catch (err) {
      console.error('Error:', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },

  teacherResetPassword: async (req, res) => {
    try {
      const { password } = req.body
      const token = req.params.token

      const resetToken = await Teacher.findOne({ token })
      const passwordMatch = await bcrypt.compare(password, resetToken?.password)
      if (passwordMatch) {
        return res.json(responseData('PASSWORD_SAME_ERORR', {}, req, false))
      }
      if (!isEmpty(resetToken)) {
        let salt = await genSalt(10)
        let hash = await genHash(password, salt)
        if (!isEmpty(hash)) {
          await Student.findOneAndUpdate(
            { _id: resetToken._id },
            { password: hash, token: null, forceLogout: true }
          )
          return res.json(responseData('PASSWORD_CHANGED', {}, req, true))
        } else {
          return res.json(responseData('ERROR_OCCUR', {}, req, false))
        }
      } else {
        return res.json(responseData('LINK_INVALID', {}, req, false))
      }
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },

  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body
      const { _id } = req.user

      const student = await Teacher.findOne({ _id })
      const isPasswordMatch = await bcrypt.compare(
        oldPassword,
        student.password
      )

      if (!isPasswordMatch) {
        return res.json(responseData('INVALID_OLD_PASSWORD', {}, req, false))
      }

      if (oldPassword === newPassword) {
        return res.json(responseData('PASSWORD_SAME_ERROR', {}, req, false))
      }

      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(newPassword, salt)

      if (!hash) {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }

      await Student.findOneAndUpdate(
        { _id },
        {
          password: hash,
          isPasswordSet: true,
          forceLogout: true
        }
      )

      return res.json(responseData('PASSWORD_CHANGED', {}, req, true))
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },

  getAttendance: async (month, year) => {
    try {
      const teacherId = req.user._id
      if (!mongoose.Types.ObjectId.isValid(teacherId))
        return { success: false, message: 'TEACHER_ID_NOT_VALID' }
      if (!month || month < 1 || month > 12)
        return { success: false, message: 'MONTH_NOT_VALID' }
      if (!year || year < 1970 || year > 2100)
        return { success: false, message: 'YEAR_NOT_VALID' }

      const attendanceRecords = await TeacherAttendance.aggregate(
        teacherAttendancePipeline(teacherId, month, year)
      )
      if (!attendanceRecords || attendanceRecords.length === 0) {
        return {
          success: true,
          message: 'NO_ATTENDANCE_RECORDS',
          attendance: []
        }
      }

      return {
        success: true,
        message: 'FETCHING_ATTENDANCE_SUCCESSFULLY',
        attendance: attendanceRecords
      }
    } catch (err) {
      console.error('Get Teacher Attendance Error:', err.message)
      return { success: false, message: 'SERVER_ERROR' }
    }
  }
}
