const bcrypt = require('bcryptjs')
const Teacher = require('../../models/teacher/teacher.schema.js')
const TeacherAttendance = require('../../models/teacher/teacherAttendance.schema.js')
const { sendEmail } = require('../../helpers/helper')
const subject = require('../../models/class/subjects.schema')
const Class = require('../../models/class/class.schema')
const TeacherTimeTable = require('../../models/class/teacher.timetable.schema')
const teacherSchema = require('../../models/teacher/teacher.schema')
const SchoolSettings = require('../../models/admin/admin.setting.schema.js')
const helper = require('../../helpers/helper')
const mongoose = require('mongoose')
const { formatMinutesToTime } = require('../../helpers/helper.js')
const {
  getTeacherAssignByLookup,
  getTeachersWithClassesLookup,
  getAllTeachersWithClassLookup,
  teacherProfilePipeline,
  teacherAttendancePipeline,
  getTeachersAttendancesByMonth,
  getTeacherAttendanceSummaryLookup
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
        dob,
        gender,
        maritalStatus,
        address,
        bloodGroup,
        physicalDisability,
        disabilityDetails,

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
        dob,
        gender,
        maritalStatus,
        address,
        bloodGroup,
        physicalDisability,
        disabilityDetails,
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
        emergencyContact,
        role: 'teacher'
      }

      let result = await Teacher.create(newTeacher)
      let safeResult = result.toObject()
      delete safeResult.password
      const dataBody = {
        email: email.toLowerCase(),
        PASSWORD: password,
        EMAIL: email,
        URL: 'https://youtube.com'
      }
      const isMailSent = await sendEmail('new-teacher-account', dataBody)
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
      if (updateData.email) updateData.email = updateData.email.toLowerCase()

      let updatedTeacher = await Teacher.findByIdAndUpdate(
        teacherId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .select('-password -token -refreshToken')
        .lean()

      if (!updatedTeacher) {
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }
      }

      updatedTeacher.profilePic.fileUrl =
        process.env.STATIC_URL + updatedTeacher.profilePic.fileUrl
      updatedTeacher.aadharFront.fileUrl =
        process.env.STATIC_URL + updatedTeacher.aadharFront.fileUrl
      updatedTeacher.aadharBack.fileUrl =
        process.env.STATIC_URL + updatedTeacher.aadharBack.fileUrl
      const dataBody = {
        TEACHER_NAME: updatedTeacher.name || 'Teacher',
        TEACHER_ID: updatedTeacher._id.toString(),
        UPDATED_EMAIL: updatedTeacher.email || 'N/A',
        UPDATED_PHONE: updatedTeacher.phone || 'N/A',
        DEPARTMENT: updatedTeacher.department || 'N/A',
        UPDATED_AT: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata'
        }),
        LOGIN_URL:
          process.env.TEACHER_LOGIN_URL || 'https://yourapp.com/teacher/login'
      }
      const isMailSent = await sendEmail('teacher-profile-updated', dataBody)

      if (!isMailSent) {
        return {
          success: false,
          message: 'EMAIL_NOT_SENT',
          data: updatedTeacher
        }
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

getAllTeachers: async (page = 1, limit = 10, status = 1, search) => {
  try {
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    helper.filterByStatus({ isRemoved: { $ne: 1 } }, status);

    const totalTeachers = await Teacher.countDocuments({
      isRemoved: { $ne: 1 }
    });

    let filter = { isRemoved: { $ne: 1 } };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { 'contact.email': regex },
        { 'contact.phone': regex }
      ];
    }

    let teachers = await Teacher.find(filter)
      .select('-password -token -refreshToken')
      .lean()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const teacherIds = teachers.map((t) => t._id);

    const todaysAttendances = await TeacherAttendance.find({
      teacher: { $in: teacherIds },
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .select('teacher status date')
      .lean();

    const attendanceMap = todaysAttendances.reduce((acc, att) => {
      acc[att.teacher.toString()] = att;
      return acc;
    }, {});

    teachers = teachers.map((t) => ({
      ...t,
      profilePic: {
        ...t.profilePic,
        fileUrl: process.env.STATIC_URL_ + (t.profilePic?.fileUrl || '')
      },
      aadharFront: {
        ...t.aadharFront,
        fileUrl: process.env.STATIC_URL_ + (t.aadharFront?.fileUrl || '')
      },
      aadharBack: {
        ...t.aadharBack,
        fileUrl: process.env.STATIC_URL_ + (t.aadharBack?.fileUrl || '')
      },
      todayAttendance: attendanceMap[t._id.toString()] || {
        status: 'not_marked',
        date: startOfDay
      }
    }));

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
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'FETCH_FAILED',
      docs: [],
      pagination: {}
    };
  }
},


  softDeleteTeacher: async (teacherId) => {
    try {
      if (!teacherId) {
        return { success: false, message: 'TEACHER_ID_REQUIRED', data: {} }
      }

      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return { success: false, message: 'TEACHER_ID_NOT_VALID', data: {} }
      }
      const teacher = await Teacher.findByIdAndUpdate(
        teacherId,
        { isRemoved: 1, status: 'inactive' },
        { new: true }
      )
        .select('-password -token -refreshToken')
        .lean()
      if (!teacher) {
        return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }
      }
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

getTeacherProfile: async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: 'INVALID_TEACHER_ID' };
    }

    const _id = new mongoose.Types.ObjectId(id);

    const profile = await Teacher.aggregate(teacherProfilePipeline(_id));

    if (!profile || profile.length === 0) {
      return { success: false, message: 'TEACHER_NOT_FOUND' };
    }

    const teacher = profile[0];

    const base = process.env.STATIC_URL_?.replace(/\/+$/, '') || '';

    ['profilePic', 'aadharFront', 'aadharBack'].forEach(field => {
      teacher[field] = teacher[field] ? `${base}${teacher[field]}` : null;
    });

    return {
      success: true,
      message: 'TEACHER_PROFILE_FETCHED',
      data: teacher
    };

  } catch (error) {
    console.error("❌ getTeacherProfile error:", error);
    return { success: false, message: 'SERVER_ERROR' };
  }
},

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
          message: `TEACHER_ALREADY_CLASS_TEACHER_OF_CLASS ${existingClassTeacher.name}`,
          data: {}
        }
      }

      classData.teacher = mongoose.Types.ObjectId(teacherId)
      classData.isClassTeacher = true
      const savedClass = await classData.save()

      const dataBody = {
        TEACHER_NAME: teacherData.name,
        TEACHER_ID: teacherData._id.toString(),
        CLASS_NAME: classData.name || 'N/A',
        ASSIGNED_DATE: new Date().toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata'
        }),
        LOGIN_URL:
          process.env.TEACHER_LOGIN_URL || 'https://yourapp.com/teacher/login',
        TEACHER_EMAIL: teacherData.email
      }

      const mailSent = await sendEmail('assign-class-teacher', dataBody)
      if (!mailSent)
        return { success: false, message: 'EMAIL_NOT_SENT', data: savedClass }

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

      const pipeline = getAllTeachersWithClassLookup()

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

      const teachers = await Teacher.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) }
      ])

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

  // assignTeacherToClass: async function ({
  //   classId,
  //   teacherId,
  //   section,
  //   subjectId,
  //   startTime,
  //   endTime
  // }) {
  //   try {
  //     if (
  //       !classId ||
  //       !teacherId ||
  //       !section ||
  //       !subjectId ||
  //       !startTime ||
  //       !endTime
  //     ) {
  //       return { success: false, message: 'MISSING_REQUIRED_FIELDS', data: {} }
  //     }

  //     const startMinutes = convertToMinutes(startTime)
  //     const endMinutes = convertToMinutes(endTime)

  //     if (endMinutes <= startMinutes) {
  //       return {
  //         success: false,
  //         message: 'END_TIME_MUST_BE_AFTER_START_TIME',
  //         data: {}
  //       }
  //     }
  //     const classData = await Class.findById(classId)
  //     if (!classData)
  //       return { success: false, message: 'CLASS_NOT_FOUND', data: {} }

  //     const teacherData = await Teacher.findById(teacherId)
  //     if (!teacherData)
  //       return { success: false, message: 'TEACHER_NOT_FOUND', data: {} }

  //     const subjectData = await subject.findById(subjectId)
  //     if (!subjectData) {
  //       return { success: false, message: 'SUBJECT_NOT_FOUND', data: {} }
  //     }
  //     const teacherConflict = await TeacherTimeTable.findOne({
  //       teacherId: teacherId,
  //       $and: [
  //         { startMinutes: { $lt: endMinutes } },
  //         { endMinutes: { $gt: startMinutes } }
  //       ]
  //     })

  //     if (teacherConflict) {
  //       return {
  //         success: false,
  //         message:
  //           'TEACHER_ALREADY_ASSIGNED_TO_ANOTHER_CLASS_DURING_THIS_TIME_SLOT',
  //         data: {}
  //       }
  //     }

  //     const classConflict = await TeacherTimeTable.findOne({
  //       classId: classId,
  //       $and: [
  //         { startMinutes: { $lt: endMinutes } },
  //         { endMinutes: { $gt: startMinutes } }
  //       ]
  //     })
  //     if (classConflict) {
  //       return {
  //         success: false,
  //         message: 'CLASS_ALREADY_HAS_TEACHER_ASSIGNED_DURING_THIS_TIME_SLOT',
  //         data: {}
  //       }
  //     }

  //     const newAssignment = new TeacherTimeTable({
  //       class: classId,
  //       section,
  //       subject: subjectId,
  //       teacher: teacherId,
  //       startTime,
  //       endTime,
  //       startMinutes,
  //       endMinutes
  //     })

  //     const savedAssignment = await newAssignment.save()
  //     const dataBody = {
  //       TEACHER_NAME: teacherData.name,
  //       TEACHER_ID: teacherData._id.toString(),
  //       CLASS_NAME: classData.name || 'N/A',
  //       SECTION: section || assignment.section || 'N/A',
  //       SUBJECT: subjectData ? subjectData.name : 'N/A',
  //       OLD_START_TIME: assignment.startTime || 'N/A',
  //       OLD_END_TIME: assignment.endTime || 'N/A',
  //       NEW_START_TIME: startTime || assignment.startTime,
  //       NEW_END_TIME: endTime || assignment.endTime,
  //       UPDATED_DATE: new Date().toLocaleDateString('en-IN', {
  //         timeZone: 'Asia/Kolkata'
  //       }),
  //       LOGIN_URL:
  //         process.env.TEACHER_LOGIN_URL || 'https://yourapp.com/teacher/login'
  //     }

  //     const isMailSent = await sendEmail('teacher-profile-updated', dataBody)

  //     if (!isMailSent) {
  //       return {
  //         success: false,
  //         message: 'EMAIL_NOT_SENT',
  //         data: savedAssignment
  //       }
  //     }

  //     return {
  //       success: true,
  //       message: 'TEACHER_ASSIGNED_TO_CLASS',
  //       data: savedAssignment
  //     }
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: error.message || 'ASSIGNMENT_FAILED',
  //       data: {}
  //     }
  //   }
  // },

assignTeacherToClass: async function ({
    classId,
    teacherId,
    section,
    subjectId,
    startTime,
    endTime
  }) {
    try {
      // ✅ 1. Required field validation
      if (
        !classId ||
        !teacherId ||
        !section ||
        !subjectId ||
        !startTime ||
        !endTime
      ) {
        return { success: false, message: "MISSING_REQUIRED_FIELDS", data: {} };
      }

      // ✅ 2. Validate start/end times
      const startMinutes = convertToMinutes(startTime);
      const endMinutes = convertToMinutes(endTime);
      if (endMinutes <= startMinutes) {
        return {
          success: false,
          message: "END_TIME_MUST_BE_AFTER_START_TIME",
          data: {}
        };
      }

      // ✅ 3. Validate school settings
      const schoolSettings = await SchoolSettings.findOne();
      if (!schoolSettings) {
        return {
          success: false,
          message: "SCHOOL_SETTINGS_NOT_FOUND",
          data: {}
        };
      }

      const schoolStartMinutes = convertToMinutes(schoolSettings.schoolTiming.startTime);
      const schoolEndMinutes = convertToMinutes(schoolSettings.schoolTiming.endTime);

      if (startMinutes < schoolStartMinutes || endMinutes > schoolEndMinutes) {
        return {
          success: false,
          message: `CLASS_TIME_MUST_BE_WITHIN_SCHOOL_TIMINGS (${schoolSettings.schoolTiming.startTime} - ${schoolSettings.schoolTiming.endTime})`,
          data: {}
        };
      }

      // ✅ 4. Check for lunch break overlap
      if (
        schoolSettings.periods?.lunchBreak?.isEnabled &&
        schoolSettings.periods.lunchBreak.time
      ) {
        const lunchStartMinutes = convertToMinutes(schoolSettings.periods.lunchBreak.time);
        const lunchEndMinutes = lunchStartMinutes + (schoolSettings.periods.lunchBreak.duration || 0);

        const isOverlapWithLunch =
          startMinutes < lunchEndMinutes && endMinutes > lunchStartMinutes;

        if (isOverlapWithLunch) {
          return {
            success: false,
            message: `CLASS_TIME_OVERLAPS_LUNCH_BREAK (${schoolSettings.periods.lunchBreak.time} - ${formatMinutesToTime(lunchEndMinutes)})`,
            data: {}
          };
        }
      }

      // ✅ 5. Validate class, teacher, subject existence
      const classData = await Class.findById(classId);
      if (!classData)
        return { success: false, message: "CLASS_NOT_FOUND", data: {} };

      const teacherData = await Teacher.findById(teacherId);
      if (!teacherData)
        return { success: false, message: "TEACHER_NOT_FOUND", data: {} };

      const subjectData = await Subject.findById(subjectId);
      if (!subjectData)
        return { success: false, message: "SUBJECT_NOT_FOUND", data: {} };

      // ✅ 6. Check for teacher conflict (same time)
      const teacherConflict = await TeacherTimeTable.findOne({
        teacher: teacherId,
        $and: [
          { startMinutes: { $lt: endMinutes } },
          { endMinutes: { $gt: startMinutes } }
        ]
      });

      if (teacherConflict) {
        return {
          success: false,
          message:
            "TEACHER_ALREADY_ASSIGNED_TO_ANOTHER_CLASS_DURING_THIS_TIME_SLOT",
          data: {}
        };
      }

      // ✅ 7. Check for class conflict (same time)
      const classConflict = await TeacherTimeTable.findOne({
        class: classId,
        $and: [
          { startMinutes: { $lt: endMinutes } },
          { endMinutes: { $gt: startMinutes } }
        ]
      });

      if (classConflict) {
        return {
          success: false,
          message:
            "CLASS_ALREADY_HAS_TEACHER_ASSIGNED_DURING_THIS_TIME_SLOT",
          data: {}
        };
      }

      // ✅ 8. Save new assignment
      const newAssignment = new TeacherTimeTable({
        class: classId,
        section,
        subject: subjectId,
        teacher: teacherId,
        startTime,
        endTime,
        startMinutes,
        endMinutes
      });

      const savedAssignment = await newAssignment.save();

      // ✅ 9. Success response
      return {
        success: true,
        message: "TEACHER_ASSIGNED_TO_CLASS",
        data: savedAssignment
      };
    } catch (error) {
      console.error("Error assigning teacher to class:", error);
      return {
        success: false,
        message: error.message || "ASSIGNMENT_FAILED",
        data: {}
      };
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

      const dataBody = {
        TEACHER_NAME: teacherData.name,
        TEACHER_ID: teacherData._id.toString(),
        CLASS_NAME: classData.name || 'N/A',
        SECTION: section || assignment.section || 'N/A',
        SUBJECT: subjectData ? subjectData.name : 'N/A',
        OLD_START_TIME: assignment.startTime || 'N/A',
        OLD_END_TIME: assignment.endTime || 'N/A',
        NEW_START_TIME: startTime || assignment.startTime,
        NEW_END_TIME: endTime || assignment.endTime,
        UPDATED_DATE: new Date().toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata'
        }),
        LOGIN_URL:
          process.env.TEACHER_LOGIN_URL || 'https://yourapp.com/teacher/login'
      }
      const isMailSent = await sendEmail('update-assigned-to-class', dataBody)

      if (!isMailSent) {
        return { success: false, message: 'EMAIL_NOT_SENT', data: saved }
      }
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
    try {
      const today = new Date()
      const utcStart = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
      )
      const existing = await TeacherAttendance.findOne({
        teacher: teacherId,
        date: utcStart
      })

      if (existing) {
        return { success: false, message: 'ATTENDANCE_MARKED_ALREADY' }
      }

      const attendance = await TeacherAttendance.create({
        teacher: teacherId,
        date: utcStart,
        status: status || 'Present'
      })

      return { success: true, message: 'ATTENDANCE_MARKED', attendance }
    } catch (error) {
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
      const docs = data[0]

      return {
        success: true,
        message: 'TEACHER_ATTENDANCE_FETCHED',
        data
      }
    } catch (error) {
      return { success: false, message: 'FAILED_TEACHER_ATTENDANCE_FAILED' }
    }
  },

  getAllAttendance: async (month, search) => {
    try {
      const now = new Date()
      const targetMonth = month
        ? new Date(month + '-01')
        : new Date(now.getFullYear(), now.getMonth(), 1)

      const monthStart = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        1
      )
      const monthEnd = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      )

      // Build pipeline
      const pipeline = getTeachersAttendancesByMonth(
        monthStart,
        monthEnd,
        search
      )

      const teachersWithAttendance = await Teacher.aggregate(pipeline)

      // Build all dates in the month
      const datesInMonth = []
      for (
        let d = new Date(monthStart);
        d <= monthEnd;
        d.setDate(d.getDate() + 1)
      ) {
        datesInMonth.push(new Date(d))
      }

      const formatted = teachersWithAttendance.map((teacher) => {
        const attendanceMap = {}
        teacher.attendance.forEach((a) => {
          const dateKey = new Date(a.date).toISOString().split('T')[0]
          attendanceMap[dateKey] = a.status
        })

        const fullMonthAttendance = datesInMonth.map((d) => {
          const dateKey = d.toISOString().split('T')[0]
          return {
            date: dateKey,
            status: attendanceMap[dateKey] || null
          }
        })

        return {
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          attendance: fullMonthAttendance
        }
      })

      return {
        success: true,
        message: 'Teacher attendance fetched successfully',
        formatted
      }
    } catch (error) {
      console.error('Error while fetching attendance:', error)
      return { success: false, message: 'SERVER_ERROR', error: error.message }
    }
  },
  getTeacherAttendanceSummary: async (date, month, teacherId) => {
    try {
      if (!teacherId) {
        return { success: false, message: 'TEACHER_ID_REQUIRED', results: {} }
      }

      const pipeline = getTeacherAttendanceSummaryLookup(date, month, teacherId)
      const result = await TeacherAttendance.aggregate(pipeline)

      if (!result || result.length === 0) {
        return {
          success: true,
          message: 'NO_ATTENDANCE_FOUND',
          results: { totalPresent: 0, totalAbsent: 0, totalLate: 0 }
        }
      }

      return {
        success: true,
        message: 'TEACHER_ATTENDANCE_SUMMARY_FETCHED_SUCCESSFULLY',
        results: result[0]
      }
    } catch (error) {
      console.error('Error in getTeacherAttendanceSummary:', error)
      return { success: false, message: 'SERVER_ERROR', results: {} }
    }
  }
}
