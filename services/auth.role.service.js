const bcrypt = require('bcryptjs')
const {generateAuthToken} = require('../helpers/responseData.js')

const Teacher = require('../models/teacher/teacher.schema.js')
const Student = require('../models/students/student.schema.js');
const { token } = require('morgan');

module.exports = {
  login: async (email, password) => {
   
    try {
      let user = null;
      let role = null;

      if (!user) {
        user = await Teacher.findOne({ email });
   
        if (user) role = "teacher";
      }

      if (!user) {
        user = await Student.findOne({ email });
        if (user) role = "student";
      }
    
      if (!user || user.isRemoved === 1) {
        return { success: false, message: "USER_NOT_FOUND", results: {} };
      }
      const isMatch = await bcrypt.compare(password, user?.password);
      if (!isMatch) {
        return { success: false, message: "INVALID_CREDENTIALS", results: {} };
      }

      const safeData = user.toObject();
      delete safeData.password;
      safeData.role = role;
      const tokens = generateAuthToken(safeData);

      return { success: true, message: `${role.toUpperCase()}_LOGIN_SUCCESS`, results: { ...tokens, role : safeData.role } };

    } catch (err) {
      return { success: false, message: "SERVER_ERROR", results: {}};
    }
  }
};