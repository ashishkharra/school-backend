const Teacher = require('../../models/teacher/teacher.schema')
// const ProfileUpdateRequest = require('../../models/teacher/profileUpdateRequest.schema');
const { sendEmail } = require('../../helpers/helper')
const { default: mongoose } = require('mongoose')
const responseData = require('../../helpers/responseData')
module.exports = {

  
  requestProfileUpdate: async (teacherId, updateData) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return { success: false, message: 'TEACHER_ID_NOT_VALID' }
      }
      const teacher = await Teacher.findById(teacherId)
      if (!teacher) return { success: false, message: 'TEACHER_NOT_FOUND' }
      const updatedFieldsStr = Object.entries(updateData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')

      const dataBody = {
        email: 'dhanka801@gmail.com', 
        TEACHER_NAME: teacher.name,
        UPDATED_FIELDS: updatedFieldsStr,
        URL: 'https://your-school-portal.com'
      }
      const isMailSent = await sendEmail('teacher-profile-update', dataBody)
      if (!isMailSent) {
        return { success: false, message: 'EMAIL_ERROR' }
      }

      return { success: true, message: 'EMAIL_SUCCESSFULLY_SENT' }
    } catch (error) {
      return { success: false, message: 'SERVER_ERROR', error: error.message }
    }
  },

  teacherForgotPassword: async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const student = await Teacher.findOne({ email });
 
            if (student) {
                const resetToken = jwt.sign(
                    { id: student._id, email: student.email },  
                    process.env.JWT_SECRET,
                    { expiresIn: "15m" }
                );
                await Teacher.findOneAndUpdate(
                    { email },
                    { token: resetToken }
                );
 
                const link = `${process.env.RESET_PASSWORD_LINK}/${resetToken}`;
 
                const dataBody = {
                    email: email,
                    EMAIL: email,
                    LINK: link,
                    STUDENT_NAME: student.name
                };
 
                try {
                    await sendEmail("student-forgot-password", dataBody);
                    return res.json(responseData("EMAIL_SENT", {}, req, true));
                } catch (emailErr) {
                    return res.json(responseData("EMAIL_SEND_FAILED", {}, req, false));
                }
            } else {
                return res.json(responseData("STUDENT_EMAIL_NOT_FOUND", {}, req, false));
            }
        } catch (err) {
            return res.json(responseData("ERROR_OCCUR", {}, req, false));
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
            return res.json(responseData('ERROR_OCCUR', {}, req, false))
        }
    },
 
    changePassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body
            const { _id } = req.user
 
            const student = await Teacher.findOne({ _id })
            const isPasswordMatch = await bcrypt.compare(oldPassword, student.password)
 
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
            return res.json(responseData('ERROR_OCCUR', {}, req, false))
        }
    },
}
