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
const {
  getTeacherAssignByLookup,
  getTeachersWithClassesLookup,
  getAllTeachersWithClassLookup
} = require('../../helpers/commonAggregationPipeline')
const convertToMinutes = (timeStr) => {
  if (!timeStr) return null
  const [time, ampm] = timeStr.split(' ')
  let [hours, minutes] = time.split(':').map(Number)
  if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12
  if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}
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

      if (!name || !email || !password) {
        return {
          success: false,
          message: 'Name, email, and password are required'
        }
      }
      const existing = await Teacher.findOne({ email: email.toLowerCase() })
      if (existing) {
        return {
          success: false,
          message: 'Teacher with this email already exists'
        }
      }
      const hashedPassword = await bcrypt.hash(password, 10)
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

      let result = await teacherSchema.create(newTeacher)
      let safeResult = result.toObject()
      delete safeResult.password

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
      return {
        success: true,
        message: 'TEACHER_REGISTERED',
        data: safeResult
      }
    } catch (error) {
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
      const updatedTeacher = await Teacher.findByIdAndUpdate(
        teacherId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .select('-password -token -refreshToken')
        .lean()
      if (!updatedTeacher) {
        return { success: false, message: 'Teacher not found', data: {} }
      }
      return {
        success: true,
        message: 'TEACHER_UPDATED',
        data: updatedTeacher
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'UPDATE_FAILED',
        data: {}
      }
    }
  },

  getAllTeachers: async (page = 1, limit = 10, status = 1) => {
    try {
      page = parseInt(page)
      limit = parseInt(limit)

      let whereStatement = { isRemoved: { $ne: 1 } }

      helper.filterByStatus(whereStatement, status)
      const totalTeachers = await Teacher.countDocuments(whereStatement)
      const teachers = await Teacher.find({ whereStatement })
        .select('-password -token -refreshToken')
        .lean()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)

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
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'FETCH_FAILED',
        data: [],
        pagination: {}
      }
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
        { isRemoved: 1, status: 'inactive' },
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
      return {
        success: false,
        message: error.message || 'SOFT_DELETE_FAILED',
        data: {}
      }
    }
  },

  getDeletedTeachersHistory: async (keyword, page = 1, limit = 10) => {
    try {
      let whereStatement = { isRemoved: 1 }

      if (keyword) {
        helper.filterByKeyword(whereStatement, keyword)
      }
      const pipeline = [
        { $match: whereStatement },
        { $sort: { updatedAt: -1 } },
        { $project: { password: 0, token: 0, refreshToken: 0 } },
        ...helper.getPaginationArray(page, limit)
      ]
      const queryResult = await Teacher.aggregate(pipeline)
      return queryResult
    } catch (error) {
      return {
        docs: [],
        totalDocs: 0,
        limit,
        page,
        totalPages: 0,
        success: false,
        message: error.message || 'FETCH_FAILED'
      }
    }
  },

  //------------------

  assignClassTeacher: async ({ classId, teacherId }) => {
    try {
      if (!classId || !teacherId) {
        return {
          success: false,
          message: 'CLASS_ID_AND_TEACHER_ID_REQUIRED',
          data: {}
        }
      }
      const classData = await Class.findById(classId)
      if (!classData) {
        return { success: false, message: 'CLASS_NOT_FOUND', data: {} }
      }

      const teacherData = await Teacher.findById(teacherId)
      if (!teacherData) {
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }
      }

      classData.teacher = mongoose.Types.ObjectId(teacherId)
      classData.isClassTeacher = true
      const savedClass = await classData.save()

      return {
        success: true,
        message: 'CLASS_TEACHER_ASSIGNED_SUCCESSFULLY',
        data: savedClass
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'CLASS_TEACHER_ASSIGNMENT_FAILED',
        data: {}
      }
    }
  },

  updateClassTeacher: async ({ classId, teacherId }) => {
    try {
      if (!classId || !teacherId) {
        return {
          success: false,
          message: 'CLASS_ID_AND_TEACHER_ID_REQUIRED',
          data: {}
        }
      }
      const classData = await Class.findById(classId)
      if (!classData) {
        return { success: false, message: 'CLASS_NOT_FOUND', data: {} }
      }

      const teacherData = await Teacher.findById(teacherId)
      if (!teacherData) {
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }
      }
      if (classData.teacher) {
      }

      classData.teacher = mongoose.Types.ObjectId(teacherId)
      classData.isClassTeacher = true

      const updatedClass = await classData.save()

      return {
        success: true,
        message: 'CLASS_TEACHER_UPDATED_SUCCESSFULLY',
        data: updatedClass
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'CLASS_TEACHER_UPDATE_FAILED',
        data: {}
      }
    }
  },

  getAllTeachersWithClassData: async (keyword, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit

      // Base pipeline
      const pipeline = getAllTeachersWithClassLookup()

      // If keyword search is provided
      if (keyword && keyword.trim() !== '') {
        pipeline.unshift({
          $match: {
            $or: [
              { name: { $regex: keyword, $options: 'i' } },
              { email: { $regex: keyword, $options: 'i' } },
              { phone: { $regex: keyword, $options: 'i' } }
            ]
          }
        })
      }

      // Paginated result
      const teachers = await Teacher.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) }
      ])

      // Count total without pagination
      const totalCountResult = await Teacher.aggregate([
        ...pipeline,
        { $count: 'total' }
      ])
      const total = totalCountResult.length > 0 ? totalCountResult[0].total : 0

      return {
        success: true,
        message: 'ALL_TEACHERS_WITH_CLASSES_FETCHED_SUCCESSFULLY',
        data: teachers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'FAILED_TO_FETCH_TEACHER_CLASSES',
        data: []
      }
    }
  },

  removeClassTeacher: async ({ classId }) => {
    try {
      if (!classId) {
        return { success: false, message: 'CLASS_ID_REQUIRED', data: {} }
      }

      const classData = await Class.findById(classId)
      if (!classData) {
        return { success: false, message: 'CLASS_NOT_FOUND', data: {} }
      }
      classData.teacher = null
      classData.isClassTeacher = false

      const updatedClass = await classData.save()
      const populatedClass = await Class.findById(updatedClass._id).populate(
        'teacher',
        '_id name email'
      )

      return {
        success: true,
        message: 'CLASS_TEACHER_REMOVED_SUCCESSFULLY',
        data: populatedClass
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'FAILED_TO_REMOVE_CLASS_TEACHER',
        data: {}
      }
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
      if (
        !classId ||
        !teacherId ||
        !section ||
        !subjectId ||
        !startTime ||
        !endTime
      ) {
        return { success: false, message: 'Missing required fields', data: {} }
      }

      const startMinutes = convertToMinutes(startTime)
      const endMinutes = convertToMinutes(endTime)

      if (endMinutes <= startMinutes) {
        return {
          success: false,
          message: 'End time must be after start time',
          data: {}
        }
      }
      const classData = await Class.findById(classId)
      if (!classData)
        return { success: false, message: 'Class not found', data: {} }

      const teacherData = await Teacher.findById(teacherId)
      if (!teacherData)
        return { success: false, message: 'Teacher not found', data: {} }

      const subjectData = await subject.findById(subjectId)
      if (!subjectData) {
        return { success: false, message: 'Subject not found', data: {} }
      }
      const teacherConflict = await TeacherTimeTable.findOne({
        teacherId: teacherId,
        $and: [
          { startMinutes: { $lt: endMinutes } },
          { endMinutes: { $gt: startMinutes } }
        ]
      })

      if (teacherConflict) {
        return {
          success: false,
          message:
            'This teacher is already assigned to another class during this time slot.',
          data: {}
        }
      }

      const classConflict = await TeacherTimeTable.findOne({
        classId: classId,
        $and: [
          { startMinutes: { $lt: endMinutes } },
          { endMinutes: { $gt: startMinutes } }
        ]
      })

      if (classConflict) {
        return {
          success: false,
          message:
            'This class already has a teacher assigned during this time slot.',
          data: {}
        }
      }

      const newAssignment = new TeacherTimeTable({
        classId,
        section,
        subjectId,
        teacherId,
        startTime,
        endTime,
        startMinutes,
        endMinutes
      })

      const savedAssignment = await newAssignment.save()
      let dataBody = {
        email: teacherData.email,
        TeacherName: teacherData.name,
        ClassName: classData.name,
        Section: section,
        SubjectName: subjectData ? subjectData.name : 'N/A',
        StartTime: startTime,
        EndTime: endTime,
        URL: 'https://your-school-portal.com'
      }
      const isMailSent = await helper.sendEmail(
        'teacher-class-assignment-notification',
        dataBody
      )
      if (!isMailSent) {
        return { success: false, message: 'EMAIL_NOT_SENT' }
      }

      return {
        success: true,
        message: 'TEACHER_ASSIGNED_TO_CLASS',
        data: savedAssignment
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'ASSIGNMENT_FAILED',
        data: {}
      }
    }
  },

  updateTeacherAssignment: async ({
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

      const startMinutes = startTime
        ? convertToMinutes(startTime)
        : assignment.startMinutes
      const endMinutes = endTime
        ? convertToMinutes(endTime)
        : assignment.endMinutes
      if (
        startMinutes !== null &&
        endMinutes !== null &&
        endMinutes <= startMinutes
      ) {
        return {
          success: false,
          message: 'END_TIME_MUST_BE_AFTER_START_TIME',
          data: {}
        }
      }
      if (teacherId || startTime || endTime) {
        const overlapping = await TeacherTimeTable.findOne({
          teacherId: teacherId || assignment.teacherId,
          _id: { $ne: assignmentId },
          $and: [
            { startMinutes: { $lt: endMinutes } },
            { endMinutes: { $gt: startMinutes } }
          ]
        })
        if (overlapping) {
          return {
            success: false,
            message: 'Selected slot conflicts with existing teacher assignment',
            data: {}
          }
        }
      }
      if (classId) assignment.classId = classId
      if (teacherId) assignment.teacherId = teacherId
      if (section) assignment.section = section
      if (subjectId) assignment.subjectId = subjectId
      if (startTime) assignment.startTime = startTime
      if (endTime) assignment.endTime = endTime

      assignment.startMinutes = startMinutes
      assignment.endMinutes = endMinutes
      const saved = await assignment.save()
      return {
        success: true,
        message: 'TEACHER_ASSIGNMENT_UPDATED',
        data: saved
      }
    } catch (error) {
      return { success: false, message: error.message, data: {} }
    }
  },

  deleteTeacherAssignment: async function ({ assignmentId }) {
    try {
      if (!assignmentId) {
        return { success: false, message: 'Assignment ID required', data: {} }
      }

      const deleted = await TeacherTimeTable.findByIdAndDelete(assignmentId)
      if (!deleted) {
        return { success: false, message: 'Assignment not found', data: {} }
      }

      return {
        success: true,
        message: 'TEACHER_ASSIGNMENT_DELETED',
        data: deleted
      }
    } catch (error) {
      return { success: false, message: error.message, data: {} }
    }
  },
  getTeacherAssignments: async ({
    classId,
    teacherId,
    page = 1,
    limit = 10
  }) => {
    try {
      const skip = (page - 1) * limit
      const pipeline = getTeacherAssignByLookup(classId, teacherId)
      const results = await TeacherTimeTable.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) }
      ])

      const totalResult = await TeacherTimeTable.aggregate([
        ...getTeacherAssignByLookup(classId, teacherId),
        { $count: 'total' }
      ])
      const total = totalResult.length > 0 ? totalResult[0].total : 0

      return {
        success: true,
        message: 'TEACHER_ASSIGNMENTS_FETCHED',
        data: results,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'FETCH_FAILED',
        data: []
      }
    }
  }
}
