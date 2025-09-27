const bcrypt = require('bcryptjs');
const Teacher = require('../../models/teacher/teacher.schema');
const { sendEmail } = require('../../helpers/helper'); // adjust path
// const teacherAssignBYClass = require('../../models/class/class.schema');
const Class = require('../../models/class/class.schema');
const assignTimeTable= require("../../models/class/teacher.timetable.schema")
const teacherSchema = require('../../models/teacher/teacher.schema');
const helper = require('../../helpers/helper');
const teacherTimetableSchema = require('../../models/class/teacher.timetable.schema');
const mongoose = require("mongoose");
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

    // 1. Validation
    if (!name || !email || !password) {
      return { success: false, message: "Name, email, and password are required" };
    }

    // 2. Check duplicate email
    const existing = await Teacher.findOne({ email: email.toLowerCase() });
    if (existing) {
      return { success: false, message: "Teacher with this email already exists" };
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Prepare teacher data
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
      role: "teacher"
    };

    // 5. Save teacher
    let result = await teacherSchema.create(newTeacher);

    // Convert to object and remove sensitive fields
    let safeResult = result.toObject();
    delete safeResult.password;

    // 6. Send email (optional, make sure helper.sendEmail is async/await)
    let dataBody = {
      email: email.toLowerCase(),
      PASSWORD: password,
      EMAIL: email,
      URL: "https://youtube.com"
    };
    const isMailSent = await helper.sendEmail("new-teacher-account", dataBody);
    if (!isMailSent) {
      return { success: false, message: "EMAIL_NOT_SENT" };
    }

    // 7. Return success
    return {
      success: true,
      message: "TEACHER_REGISTERED",
      data: safeResult
    };

  } catch (error) {
    console.log("Registration failed:", error.message);
    return { success: false, message: error.message || "SERVER_ERROR" };
  }
}
,
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
  // 1️⃣ Validate ObjectId
  if (!teacherId) throw new Error("Teacher ID required");
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return { success: false, message: "TEACHER_ID_NOT_VALID" };
  }

  // 2️⃣ Perform soft delete
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
  },

//--------------------assign teacher by admin

  convertToMinutes: function(timeStr) {
    const [time, ampm] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (ampm.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  },
assignTeacherToClass: async function({ classId, teacherId, section, subject, startTime, endTime }) {
    // Validation
    if (!classId || !teacherId || !section || !subject || !startTime || !endTime) {
      throw new Error("Missing required fields");
    }

    const startMinutes = this.convertToMinutes(startTime);
    const endMinutes = this.convertToMinutes(endTime);
    if (endMinutes <= startMinutes) {
      throw new Error("End time must be after start time");
    }

    // Fetch class and teacher info
    const classData = await Class.findById(classId);
    if (!classData) throw new Error("Class not found");

    const teacherData = await Teacher.findById(teacherId);
    if (!teacherData) throw new Error("Teacher not found");

    // Check overlapping slot for same teacher
    const overlapping = await TeacherTimeTable.findOne({
      teacher: teacherId,
      $and: [
        { startMinutes: { $lt: endMinutes } },
        { endMinutes: { $gt: startMinutes } }
      ]
    });

    if (overlapping) {
      throw new Error("Selected slot conflicts with existing booked slot. Please choose another slot.");
    }

    // Save assignment
    const newAssignment = new TeacherTimeTable({
      class: classId,
      section,
      subject,
      teacher: teacherId,
      startTime,
      endTime,
      startMinutes,
      endMinutes
    });

    return await newAssignment.save();
  }
}