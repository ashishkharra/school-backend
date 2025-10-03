const bcrypt = require('bcryptjs')
const Teacher = require('../../models/teacher/teacher.schema')
const { sendEmail } = require('../../helpers/helper') // adjust path
// const teacherAssignBYClass = require('../../models/class/class.schema');
const subject = require('../../models/class/subjects.schema')
const Class = require('../../models/class/class.schema')
const TeacherTimeTable = require('../../models/class/teacher.timetable.schema')
const teacherSchema = require('../../models/teacher/teacher.schema')
const helper = require('../../helpers/helper')
const mongoose = require('mongoose')
const responseData = require('../../helpers/responseData')
const constant = require('../../helpers/constant')
const { getTeacherAssignByLookup } = require('../../helpers/commonAggregationPipeline')
const convertToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [time, ampm] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};
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
      } = data

      // 1. Validation
      if (!name || !email || !password) {
        return {
          success: false,
          message: 'Name, email, and password are required'
        }
      }

      // 2. Check duplicate email
      const existing = await Teacher.findOne({ email: email.toLowerCase() })
      if (existing) {
        return {
          success: false,
          message: 'Teacher with this email already exists'
        }
      }

      // 3. Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

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
        role: 'teacher'
      }

      // 5. Save teacher
      let result = await teacherSchema.create(newTeacher)

      // Convert to object and remove sensitive fields
      let safeResult = result.toObject()
      delete safeResult.password

      // 6. Send email (optional, make sure helper.sendEmail is async/await)
      let dataBody = {
        email: email.toLowerCase(),
        PASSWORD: password,
        EMAIL: email,
        URL: 'https://youtube.com'
      }
      const isMailSent = await helper.sendEmail('new-teacher-account', dataBody)
      if (!isMailSent) {
        return { success: false, message: 'EMAIL_NOT_SENT' }
      }

      // 7. Return success
      return {
        success: true,
        message: 'TEACHER_REGISTERED',
        data: safeResult
      }
    } catch (error) {
      console.log('Registration failed:', error.message)
      return { success: false, message: error.message || 'SERVER_ERROR' }
    }
  },

  updateTeacher: async (teacherId, updateData) => {
    try {
      if (!teacherId) {
        return { success: false, message: 'Teacher ID is required', data: {} }
      }

      if (updateData.password) {
        delete updateData.password
      }

      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase()
      }

      // 4. Update teacher
      const updatedTeacher = await Teacher.findByIdAndUpdate(
        teacherId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .select('-password -token -refreshToken')
        .lean()

      // 5. Handle not found
      if (!updatedTeacher) {
        return { success: false, message: 'Teacher not found', data: {} }
      }

      // 6. Return success in same format
      return {
        success: true,
        message: 'TEACHER_UPDATED',
        data: updatedTeacher
      }
    } catch (error) {
      console.error('Error updating teacher:', error.message)
      return {
        success: false,
        message: error.message || 'UPDATE_FAILED',
        data: {}
      }
    }
  },

 getAllTeachers: async (page = 1, limit = 10, status = 1) => {
    try {
      // Convert page and limit to numbers
      page = parseInt(page);
      limit = parseInt(limit);
     

        // 1️⃣ Build where condition
    let whereStatement = { isRemoved: { $ne: 1 } };

    // 2️⃣ Apply status filter using helper
    helper.filterByStatus(whereStatement, status);

    // 3️⃣ Total count
      // Total number of active teachers
     const totalTeachers = await Teacher.countDocuments(whereStatement);

      // Fetch paginated teachers
      const teachers = await Teacher.find({ isRemoved: { $ne: 1 } })
        .select('-password -token -refreshToken') // exclude sensitive fields
        .lean()
        .sort({ createdAt: -1 })
        .limit(limit);

      return {
        success: true,
        message: 'TEACHERS_FETCHED',
        data: teachers,
        pagination: {
          total: totalTeachers,
          page,
          limit,
          totalPages: Math.ceil(totalTeachers / limit)
        }
      };
    } catch (error) {
      console.error('Error in getAllTeachers:', error.message);
      return {
        success: false,
        message: error.message || 'FETCH_FAILED',
        data: [],
        pagination: {}
      };
    }
  },

  softDeleteTeacher: async (teacherId) => {
    try {
      // 1️⃣ Validate teacherId
      if (!teacherId) {
        return { success: false, message: 'Teacher ID required', data: {} }
      }

      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return { success: false, message: 'TEACHER_ID_NOT_VALID', data: {} }
      }

      // 2️⃣ Perform soft delete
      const teacher = await Teacher.findByIdAndUpdate(
        teacherId,
        { isRemoved: 1 ,
           status: 'inactive' 
        },
        { new: true }
      )
        .select('-password -token -refreshToken')
        .lean()

      // 3️⃣ Handle teacher not found
      if (!teacher) {
        return { success: false, message: 'Teacher not found', data: {} }
      }

      // 4️⃣ Return success
      return {
        success: true,
        message: 'TEACHER_SOFT_DELETED',
        data: teacher
      }
    } catch (error) {
      console.error('Error soft deleting teacher:', error.message)
      return {
        success: false,
        message: error.message || 'SOFT_DELETE_FAILED',
        data: {}
      }
    }
  },

  getDeletedTeachersHistory: async (keyword,  page = 1, limit = 10) => {
    try {
      let whereStatement = { isRemoved: 1 } // only soft deleted

      // Apply keyword search filter if keyword exists
      if (keyword) {
        helper.filterByKeyword(whereStatement, keyword)
      }

      // Fetch deleted teachers
       const pipeline = [
      { $match: whereStatement },
      { $sort: { updatedAt: -1 } },
      { $project: { password: 0, token: 0, refreshToken: 0 } }, // hide sensitive fields
      ...helper.getPaginationArray(page, limit), // use predefined pagination
    ];
 const queryResult = await Teacher.aggregate(pipeline);

      // Return in consistent format
    return queryResult
 
  } catch (error) {
    console.error('Error fetching deleted teachers:', error.message);
    return {
      docs: [],
      totalDocs: 0,
      limit,
      page,
      totalPages: 0,
      success: false,
      message: error.message || 'FETCH_FAILED'
    };
  }
  },

   assignClassTeacher: async ({ classId, teacherId }) => {
    try {
      
      if (!classId || !teacherId) {
        return { success: false, message: 'CLASS_ID_AND_TEACHER_ID_REQUIRED', data: {} };
      }

      const classData = await Class.findById(classId);
      if (!classData) {
        return { success: false, message: 'CLASS_NOT_FOUND', data: {} };
      }

      const teacherData = await Teacher.findById(teacherId);
      if (!teacherData) {
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} };
      }

     classData.teacherId = mongoose.Types.ObjectId(teacherId);
    classData.isClassTeacher = true;


      const savedClass = await classData.save();

      return {
        success: true,
        message: 'CLASS_TEACHER_ASSIGNED_SUCCESSFULLY',
        data: savedClass
      };
    } catch (error) {
      console.error('Error in assignClassTeacher:', error.message);
      return { success: false, message: error.message || 'CLASS_TEACHER_ASSIGNMENT_FAILED', data: {} };
    }
  },




  //--------------------assign teacher by admin

   assignTeacherToClass: async function ({
    classId,
    teacherId,
    section,
    subjectId,
    startTime,
    endTime
  }) {
    try {
      // 1️⃣ Validation
      if (!classId || !teacherId || !section || !subjectId || !startTime || !endTime) {
        return { success: false, message: 'Missing required fields', data: {} };
      }

      const startMinutes = convertToMinutes(startTime);
      const endMinutes = convertToMinutes(endTime);

      if (endMinutes <= startMinutes) {
        return { success: false, message: 'End time must be after start time', data: {} };
      }

      // 2️⃣ Fetch class, teacher, and subject info
      const classData = await Class.findById(classId);
      if (!classData) return { success: false, message: 'Class not found', data: {} };

      const teacherData = await Teacher.findById(teacherId);
      if (!teacherData) return { success: false, message: 'Teacher not found', data: {} };

      const subjectData = await subject.findById(subjectId);
if (!subjectData) {
  return { success: false, message: 'Subject not found', data: {} };
}
      // 3️⃣ Check overlapping slot for same teacher
      const overlapping = await TeacherTimeTable.findOne({
        teacherId: teacherId,
        $and: [
          { startMinutes: { $lt: endMinutes } },
          { endMinutes: { $gt: startMinutes } }
        ]
      });

      if (overlapping) {
        return {
          success: false,
          message: 'Selected slot conflicts with existing booked slot. Please choose another slot.',
          data: {}
        };
      }

      // 4️⃣ Save assignment
      const newAssignment = new TeacherTimeTable({
        classId,
        section,
        subjectId,
        teacherId,
        startTime,
        endTime,
        startMinutes,
        endMinutes
      });

      const savedAssignment = await newAssignment.save();

      // 5️⃣ Send email to teacher
      let dataBody = {
        email: teacherData.email,
        TeacherName: teacherData.name,
        ClassName: classData.name,
        Section: section,
        SubjectName: subjectData ? subjectData.name : "N/A",
        StartTime: startTime,
        EndTime: endTime,
        URL: 'https://your-school-portal.com'
      };
console.log('databody',dataBody )
      const isMailSent = await helper.sendEmail("teacher-class-assignment-notification", dataBody);
      if (!isMailSent) {
        return { success: false, message: 'EMAIL_NOT_SENT' };
      }

      return {
        success: true,
        message: 'TEACHER_ASSIGNED_TO_CLASS',
        data: savedAssignment
      };
    } catch (error) {
      console.error('Error assigning teacher to class:', error.message);
      return { success: false, message: error.message || 'ASSIGNMENT_FAILED', data: {} };
    }
  },


 updateTeacherAssignment : async ({
  assignmentId,
  classId,
  teacherId,
  section,
  subjectId,
  startTime,
  endTime
}) => {
  try {
    if (!assignmentId) {
      return { success: false, message: 'ASSIGNMENT_ID_REQUIRED', data: {} }
    }

    const assignment = await TeacherTimeTable.findById(assignmentId)
    if (!assignment) {
      return { success: false, message: 'ASSIGNMENT_NOT_FOUND', data: {} }
    }

   
  const startMinutes = startTime ? convertToMinutes(startTime) : assignment.startMinutes;
const endMinutes = endTime ? convertToMinutes(endTime) : assignment.endMinutes;

    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      return { success: false, message: 'END_TIME_MUST_BE_AFTER_START_TIME', data: {} };
    }

    // Optional: check overlapping slot
    if (teacherId || startTime || endTime) {
      const overlapping = await TeacherTimeTable.findOne({
        teacherId: teacherId || assignment.teacherId,
        _id: { $ne: assignmentId },
        $and: [
          { startMinutes: { $lt: endMinutes } },
          { endMinutes: { $gt: startMinutes } }
        ]
      });
      if (overlapping) {
        return {
          success: false,
          message: 'Selected slot conflicts with existing teacher assignment',
          data: {}
        };
      }
    }
    // Update fields
    if (classId) assignment.classId = classId
    if (teacherId) assignment.teacherId = teacherId
    if (section) assignment.section = section
    if (subjectId) assignment.subjectId = subjectId
    if (startTime) assignment.startTime = startTime
    if (endTime) assignment.endTime = endTime

    assignment.startMinutes = startMinutes
    assignment.endMinutes = endMinutes

    const saved = await assignment.save()



    return { success: true, message: 'TEACHER_ASSIGNMENT_UPDATED', data: saved }
  } catch (error) {
    console.error('Error updating assignment:', error.message)
    return { success: false, message: error.message, data: {} }
  }
}

,
// ✅ Delete
deleteTeacherAssignment: async function ({ assignmentId }) {
  try {
    if (!assignmentId) {
      return { success: false, message: 'Assignment ID required', data: {} }
    }

    const deleted = await TeacherTimeTable.findByIdAndDelete(assignmentId)
    if (!deleted) {
      return { success: false, message: 'Assignment not found', data: {} }
    }

    return { success: true, message: 'TEACHER_ASSIGNMENT_DELETED', data: deleted }
  } catch (error) {
    console.error('Error deleting assignment:', error.message)
    return { success: false, message: error.message, data: {} }
  }
}
,

 getTeacherAssignments : async ({ classId, teacherId }) => {
  try {
    const pipeline = getTeacherAssignByLookup(classId, teacherId);
    console.log("pipeline--",pipeline)
    const results = await TeacherTimeTable.aggregate(pipeline);

    return {
      success: true,
      message: "TEACHER_ASSIGNMENTS_FETCHED",
      data: results
    };
  } catch (error) {
    console.error("Error fetching teacher assignments:", error.message);
    return {
      success: false,
      message: error.message || "FETCH_FAILED",
      data: []
    };
  }
}
}
