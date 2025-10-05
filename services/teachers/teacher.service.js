const Teacher = require('../../models/teacher/teacher.schema')
// const ProfileUpdateRequest = require('../../models/teacher/profileUpdateRequest.schema');
const { sendEmail } = require('../../helpers/helper')
const { teacherProfilePipeline } = require('../../helpers/commonAggregationPipeline.js')
const { default: mongoose } = require('mongoose')
module.exports = {
  requestProfileUpdate: async (teacherId, updateData) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return { success: false, message: 'TEACHER_ID_NOT_VALID' }
      }

      // Fetch teacher info for email
      const teacher = await Teacher.findById(teacherId)
      if (!teacher) return { success: false, message: 'TEACHER_NOT_FOUND' }

      // Prepare email data
      const updatedFieldsStr = Object.entries(updateData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n') // or '<br/>' for HTML

      const dataBody = {
        email: 'dhanka801@gmail.com', // admin receives the email
        TEACHER_NAME: teacher.name,
        UPDATED_FIELDS: updatedFieldsStr, // dynamically generated from updateData
        URL: 'https://your-school-portal.com'
      }

      const isMailSent = await sendEmail('teacher-profile-update', dataBody)
      if (!isMailSent) {
        return { success: false, message: 'EMAIL_ERROR' }
      }

      return { success: true, message: 'EMAIL_SUCCESSFULLY_SENT' }
    } catch (error) {
      console.error(error)
      return { success: false, message: 'SERVER_ERROR', error: error.message }
    }
  },

    getProfile: async (teacherId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) return { success : false, message : 'TEACHER_ID_NOT_VALID'}

      const [profile] = await Teacher.aggregate(teacherProfilePipeline(teacherId));
      if (!profile) return { success : false, message : 'ERROR_FETCHING_TEACHER'};

      return { success : true, message : 'FETCHING_TEACHER_PROFILE_SUCCESSFULLY', profile }
    } catch (err) {
      console.error("Get Teacher Profile Error:", err.message);
      return { success : false, message : 'SERVER_ERROR'}
    }
  }
}
