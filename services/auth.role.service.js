const bcrypt = require('bcryptjs')
const {generateAuthToken} = require('../helpers/responseData.js')

const Teacher = require('../models/teacher/teacher.schema.js')
const Student = require('../models/students/student.schema.js');
const { token } = require('morgan');

module.exports = {
  login: async (email, password) => {
    console.log(email, password)
    try {
      let user = null;
      let role = null;

      if (!user) {
        user = await Teacher.findOne({ email });
        console.log(user,"user")
        if (user) role = "teacher";
      }

      if (!user) {
        user = await Student.findOne({ email });
        if (user) role = "student";
      }
      console.log(user)

      if (!user || user.isRemoved === 1) {
        return { success: false, message: "USER_NOT_FOUND", results: {} };
      }
      console.log(user.name,user.email,user,"BEFORE MATVHVH",password, user.password)
      const isMatch = await bcrypt.compare(password, user?.password);
      console.log(isMatch)
      if (!isMatch) {
        console.log('isMatch', isMatch)
        return { success: false, message: "INVALID_CREDENTIALS", results: {} };
      }

      const safeData = user.toObject();
      console.log(safeData,"===")
      delete safeData.password;
      safeData.role = role;

      console.log("safe data : ", safeData)

      const tokens = generateAuthToken(safeData);
console.log(token,"token")
      return { success: true, message: `${role.toUpperCase()}_LOGIN_SUCCESS`, results: { ...safeData, ...tokens } };

    } catch (err) {
      console.error("Login service error:", err.message);
      return { success: false, message: "SERVER_ERROR", results: {}};
    }
  }
};