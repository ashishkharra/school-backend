const bcrypt = require('bcryptjs')
const Teacher = require('../../models/teacher/teacher.schema')
const TeacherAttendance = require('../../models/teacher/teacherAttendance.schema.js')
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
        address,
        bloodGroup,
        physicalDisability,
        disabilityDetails,
        // department,
        designation,
        qualifications,
        specialization,
        experience,
        dateOfJoining,
        classes,
        subjectsHandled,
        salaryInfo,
        profilePic,
        aadharFront,
        aadharBack,
        // certificates,
        // resume,
        // joiningLetter,
        emergencyContact
      } = data

      if (!name || !email || !password) {
        return {
          success: false,
          message: 'NAME_EMAIL_PASSWORD_REQUIRED'
        }
      }

      const existing = await Teacher.findOne({ email: email.toLowerCase() })
      if (existing)
        return {
          success: false,
          message: 'TEACHER_WITH_THIS_EMAIL_ALREADY_EXISTS'
        }
      const existingPhone = await Teacher.findOne({ phone })
      if (existingPhone) {
        return {
          success: false,
          message: 'TEACHER_WITH_THIS_PHONE_ALREADY_EXISTS'
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
        address,
        bloodGroup,
        physicalDisability,
        disabilityDetails,
        // department,
        designation,
        qualifications,
        specialization,
        experience,
        dateOfJoining,
        classes,
        subjectsHandled,
        salaryInfo,
        profilePic,
        aadharFront,
        aadharBack,
        // certificates,
        // resume,
        // joiningLetter,
        emergencyContact,
        role: 'teacher'
      }

      let result = await Teacher.create(newTeacher)
      let safeResult = result.toObject()
      delete safeResult.password

      // 🔹 Send email
      const dataBody = {
        email: email.toLowerCase(),
        PASSWORD: password,
        EMAIL: email,
        URL: 'https://youtube.com'
      }
      const isMailSent = await helper.sendEmail('new-teacher-account', dataBody)
      if (!isMailSent) return { success: false, message: 'EMAIL_NOT_SENT' }
      return { success: true, message: 'TEACHER_REGISTERED', data: safeResult }
    } catch (error) {
      return { success: false, message: error.message || 'SERVER_ERROR' }
    }
  },
  updateTeacher: async (teacherId, updateData) => {
    try {
      if (!teacherId) {
        return { success: false, message: 'TEACHER_ID_REQUIRED', data: {} }
      }

      // if (updateData.password) delete updateData.password;
      if (updateData.email) updateData.email = updateData.email.toLowerCase()

      const updatedTeacher = await Teacher.findByIdAndUpdate(
        teacherId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .select('-password -token -refreshToken')
        .lean()

      if (!updatedTeacher) {
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }
      }

      return { success: true, message: 'TEACHER_UPDATED', data: updatedTeacher }
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
      page = parseInt(page) || 1
      limit = parseInt(limit) || 10
      helper.filterByStatus({ isRemoved: { $ne: 1 } }, status)
      const totalTeachers = await Teacher.countDocuments({
        isRemoved: { $ne: 1 }
      })
      console.log('total : ', totalTeachers)
      const teachers = await Teacher.find({ isRemoved: { $ne: 1 } })
        .select('-password -token -refreshToken')
        .lean()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)

      return {
        success: true,
        message: 'TEACHERS_FETCHED',
        docs: teachers,
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
        docs: [],
        pagination: {}
      }
    }
  },

  softDeleteTeacher: async (teacherId) => {
    try {
      // 1️⃣ Validate teacherId
      if (!teacherId) {
        return { success: false, message: 'TEACHER_ID_REQUIRED', data: {} }
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
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }
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
      const existingClassTeacher = await Class.findOne({
        teacher: teacherId,
        isClassTeacher: true,
        _id: { $ne: classId }
      })

      if (existingClassTeacher) {
        return {
          success: false,
          message: `TEACHER_ALREADY_CLASS_TEACHER_OF_CLASS_${existingClassTeacher.name}`,
          data: {}
        }
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
      await Class.updateMany(
        { teacher: mongoose.Types.ObjectId(teacherId), _id: { $ne: classId } },
        { $set: { teacher: null, isClassTeacher: false } }
      )
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
        docs: teachers,
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
        return { success: false, message: 'MISSING_REQUIRED_FIELDS', data: {} }
      }

      const startMinutes = convertToMinutes(startTime)
      const endMinutes = convertToMinutes(endTime)

      if (endMinutes <= startMinutes) {
        return {
          success: false,
          message: 'END_TIME_MUST_BE_AFTER_START_TIME',
          data: {}
        }
      }
      const classData = await Class.findById(classId)
      if (!classData)
        return { success: false, message: 'CLASS_NOT_FOUND', data: {} }

      const teacherData = await Teacher.findById(teacherId)
      if (!teacherData)
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }

      const subjectData = await subject.findById(subjectId)
      if (!subjectData) {
        return { success: false, message: 'SUBJECT_NOT_FOUND', data: {} }
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
            'TEACHER_ALREADY_ASSIGNED_TO_ANOTHER_CLASS_DURING_THIS_TIME_SLOT',
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
      console.log(classConflict, 'classConflict-------')
      if (classConflict) {
        return {
          success: false,
          message: 'CLASS_ALREADY_HAS_TEACHER_ASSIGNED_DURING_THIS_TIME_SLOT',
          data: {}
        }
      }

      const newAssignment = new TeacherTimeTable({
        class: classId,
        section,
        subject: subjectId,
        teacher: teacherId,
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

  updateTeacherAssign: async ({
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
            message: 'SELECTED_SLOT_CONFLICTS_WITH_EXISTING_TEACHER_ASSIGNMENT',
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

  deleteTeacherAssign: async function ({ assignmentId }) {
    try {
      if (!assignmentId) {
        return { success: false, message: 'ASSIGNMENT_IS_REQUIRED', data: {} }
      }

      const deleted = await TeacherTimeTable.findByIdAndDelete(assignmentId)
      console.log(deleted, 'deleted-----')
      if (!deleted) {
        return { success: false, message: 'ASSIGNMENT_NOT-FOUND', data: {} }
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

  getTeacherAssign: async ({ classId, teacherId, page = 1, limit = 10 }) => {
    try {
      const skip = (page - 1) * limit
      const pipeline = getTeacherAssignByLookup(classId, teacherId)
      console.log('pipeline-----', pipeline)
      const results = await TeacherTimeTable.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) }
      ])
      console.log('results-----', results)
      const totalResult = await TeacherTimeTable.aggregate([
        ...getTeacherAssignByLookup(classId, teacherId),
        { $count: 'total' }
      ])
      console.log(totalResult, 'totalResult----')
      const total = totalResult.length > 0 ? totalResult[0].total : 0

      return {
        success: true,
        message: 'TEACHER_ASSIGNMENTS_FETCHED',
        docs: results,
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
  },

  markAttendance: async (teacherId, status) => {
    // Check if already marked for today
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const existing = await TeacherAttendance.findOne({
        teacher: teacherId,
        date: today
      })

      if (existing) {
        return { success: false, message: 'ATTENDANCE_MARKED_ALREADY' }
      }

      const attendance = await TeacherAttendance.create({
        teacher: teacherId,
        date: today,
        status: status || 'Present'
      })

      return { success: true, message: 'ATTENDANCE_MARKED', attendance }
    } catch (error) {
      console.log('Error while marking attendance of teacher : ', error.message)
      return { success: false, message: 'SERVER_ERROR' }
    }
  },

  updateAttendance: async (teacherId, status) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const updated = await TeacherAttendance.findOneAndUpdate(
        { teacher: teacherId, date: today },
        { $set: { status } },
        { new: true }
      )

      if (!updated) {
        return { success: false, message: 'Attendance not found for today' }
      }

      return { success: true, message: 'ATTENDANCE_MARKED', updated }
    } catch (error) {
      console.log('Error while updating attedance : ', error.message)
      return { success: false, message: 'SERVER_ERROR' }
    }
  },

  getAttendance: async (teacherId, options) => {
    const { month, date, year, page = 1, limit = 10, statusFilter } = options
    try {
      const pipeline = teacherAttendancePipeline({
        teacherId,
        month,
        date,
        year,
        statusFilter,
        page,
        limit
      })

      const data = await TeacherAttendance.aggregate(pipeline)

      const totalCountQuery = {
        teacher: new mongoose.Types.ObjectId(teacherId)
      }

      if (year) totalCountQuery.$expr = { $eq: [{ $year: '$date' }, year] }
      if (month) {
        totalCountQuery.$expr = totalCountQuery.$expr
          ? {
              $and: [
                totalCountQuery.$expr,
                { $eq: [{ $month: '$date' }, month] }
              ]
            }
          : { $eq: [{ $month: '$date' }, month] }
      }

      if (statusFilter) totalCountQuery.status = statusFilter

      const totalDocs = await TeacherAttendance.countDocuments(totalCountQuery)

      return {
        success: true,
        jsonData: data,
        meta: {
          page,
          limit,
          totalDocs,
          totalPages: Math.ceil(totalDocs / limit)
        }
      }
    } catch (error) {
      console.error('Error fetching teacher attendance:', error)
      return { success: false, message: 'FAILED_TEACHER_ATTENDANCE_FAILED' }
    }
  }
}
