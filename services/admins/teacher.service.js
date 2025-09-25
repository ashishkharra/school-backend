const bcrypt = require('bcryptjs');
const Teacher = require('../../models/teacher/teacher.schema');
const { sendEmail } = require('../../helpers/helper'); // adjust path
const teacherSchema = require('../../models/teacher/teacher.schema');
const helper = require('../../helpers/helper');

module.exports = {
  registerTeacher: async (data) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        dateOfBirth,
        gender,
        maritalStatus,
        spouseName,
        children,
        address,
        bloodGroup,
        physicalDisability,
        disabilityDetails,
        department,
        designation,
        qualifications,
        specialization,
        experience,
        dateOfJoining,
        classes,
        subjectsHandled,
        salaryInfo,
        IDProof,
        certificates,
        resume,
        joiningLetter,
        emergencyContact
      } = data;
      // Validation for required fields
      if (!name || !email || !password) {
        throw new Error("Name, email, and password are required");
      }

      // Check if email already exists
      const existing = await Teacher.findOne({ email });
      if (existing) {
        throw new Error("Teacher with this email already exists");
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Prepare teacher data
      const newTeacher = {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        dateOfBirth,
        gender,
        maritalStatus,
        spouseName,
        children,
        address,
        bloodGroup,
        physicalDisability,
        disabilityDetails,
        department,
        designation,
        qualifications,
        specialization,
        experience,
        dateOfJoining,
        classes,
        subjectsHandled,
        salaryInfo,
        IDProof,
        certificates,
        resume,
        joiningLetter,
        emergencyContact,
        role: "teacher" //ated automatically by default in schema
      }

      let result = await teacherSchema.create(newTeacher)
      if (!result) {
        return {
          success: false,
          message: 'TEACHER_REGISTERED_FAILED'
        }
      }
      tempUser = result.toObject()
      let dataBody = {
        email: email.toLowerCase(),
        PASSWORD: password,
        EMAIL: email,
        URL: "https://youtube.com"
      }
      const isMailSent = helper.sendEmail("new-teacher-account", dataBody);
      if (!isMailSent) return {
        success: false,
        message: 'EMAIL_NOT_SENT',
      }

      // Return safe teacher info without password and tokens
      return {
        success: true,
        message: "TEACHER_REGISTERED",
        result
      };
    } catch (error) {
      console.log('registration failed : ', error.message)
      return {
        success: false,
        message: 'SERVER_ERROR',
      }
    }
  },
  getAllTeachers: async () => {
    // Fetch all teachers excluding sensitive fields like password
    return await Teacher.find().select('-password -token -refreshToken').lean();
  },
  updateTeacher: async (teacherId, updateData) => {
    if (!teacherId) {
      throw new Error("Teacher ID is required");
    }

    // Prevent updating password here — handle password change in separate flow
    if (updateData.password) {
      delete updateData.password;
    }

    // Normalize email if provided
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password -token -refreshToken")
      .lean();

    if (!updatedTeacher) {
      throw new Error("Teacher not found");
    }

    return updatedTeacher;
  },

  //   softDeleteTeacher :async (teacherId) => {
  //   if (!teacherId) throw new Error("Teacher ID required");
  //   const updatedTeacher = await Teacher.findByIdAndUpdate(
  //     teacherId,
  //     { isRemoved: 1 },
  //     { new: true }
  //   );
  //   if (!updatedTeacher) throw new Error("Teacher not found");
  //   return updatedTeacher;
  // }
  softDeleteTeacher: async (teacherId) => {
    if (!teacherId) throw new Error("Teacher ID required");

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { isRemoved: 1 },
      { new: true }
    );

    if (!teacher) throw new Error("Teacher not found");
    return teacher;
  },

  // fetch history (all teachers with isRemoved = 1)
  getDeletedTeachersHistory: async (keyword) => {
    let whereStatement = { isRemoved: 1 }; // only soft deleted

    // Apply keyword search filter if keyword exists
    if (keyword) {
      helper.filterByKeyword(whereStatement, keyword);
    }

    return await Teacher.find(whereStatement).sort({ updatedAt: -1 }).lean();
  }
}