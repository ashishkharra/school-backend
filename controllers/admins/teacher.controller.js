const adminTeacherService = require('../../services/admins/teacher.service')
const { responseData } = require('../../helpers/responseData')
const constant = require('../../helpers/constant')
const path = require('path')
const { deleteFileIfExists } = require('../../helpers/helper.js')
const Teacher = require('../../models/teacher/teacher.schema')
const mongoose = require('mongoose')

const baseUploadDir = path.join(__dirname, '../../uploads')
const normalizeUploadPath = (filePath) => {
  const normalizedPath = path.normalize(filePath)
  if (!normalizedPath.startsWith(baseUploadDir)) {
    return { success: false, message: 'INVALID_PATH' }
  }
  return (
    '/uploads' + normalizedPath.replace(baseUploadDir, '').replace(/\\/g, '/')
  )
}
module.exports = {
  // registerTeacher: async (req, res) => {
  //   try {
  //     const result = await adminTeacherService.registerTeacher(req.body)
  //     if (!result.success) {
  //       return res
  //         .status(400)
  //         .json(responseData(result.message, {}, req, false))
  //     }
  //     return res
  //       .status(201)
  //       .json(responseData(result.message, result.data, req, true))
  //   } catch (error) {
  //     return res.status(500).json(responseData(error.message, {}, req, false))
  //   }
  // },

  registerTeacher: async (req, res) => {
    try {
      const data = req.body
      const files = req.files || {}
      console.log(files, 'files---')
      // 🔹 Attach uploaded file paths to req.body

      if (files) {
        if (files.profilePic?.[0]) {
          data.profilePic = {
            type: files.profilePic[0].mimetype,
            fileUrl: normalizeUploadPath(files.profilePic[0].path)
          }
        }

        if (files.aadharFront?.[0])
          data.aadharFront = {
            type: files.aadharFront[0].mimetype,
            fileUrl: normalizeUploadPath(files.aadharFront[0].path)
          }

        if (files.aadharBack?.[0])
          data.aadharBack = {
            type: files.aadharBack[0].mimetype,
            fileUrl: normalizeUploadPath(files.aadharBack[0].path)
          }
      }

      // 🔹 Convert classes array to ObjectId
      if (data.classes && Array.isArray(data.classes)) {
        data.classes = data.classes.map((id) => mongoose.Types.ObjectId(id))
      }
      if (data.specialization && Array.isArray(data.specialization)) {
        data.specialization = data.specialization.map((id) =>
          mongoose.Types.ObjectId(id)
        )
      }
      // 🔹 Convert subjectsHandled.classId to ObjectId
      if (data.subjectsHandled && Array.isArray(data.subjectsHandled)) {
        const mongoose = require('mongoose')
        data.subjectsHandled = data.subjectsHandled.map((sub) => ({
          ...sub,
          classId: mongoose.Types.ObjectId(sub.classId)
        }))
      }

      // data.frontAdhar = data.aadharFront

      // 🔹 Call service function (no changes needed here)
      const result = await adminTeacherService.registerTeacher(data)
      console.log('---------')
      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, {}, req, false))
      }
      return res
        .status(201)
        .json(responseData(result.message, result.data, req, true))
    } catch (error) {
      return res
        .status(500)
        .json(responseData(error.message || 'SERVER_ERROR', {}, req, false))
    }
  },

  updateTeacher: async (req, res) => {
    try {
      const { id } = req.params
      const files = req.files
      const updateData = req.body

      const existingTeacher = await Teacher.findById(id).lean()
      if (!existingTeacher) {
        return res
          .status(404)
          .json(responseData('TEACHER_NOT_FOUND', {}, req, false))
      }

      const getRelativePath = (filePath) =>
        filePath.replace(baseUploadDir, '').replace(/\\/g, '/')

      if (files) {
        if (files.profilePic?.[0]) {
          deleteFileIfExists(existingTeacher.profilePic?.fileUrl)
          updateData.profilePic = {
            type: files.profilePic[0].mimetype,
            fileUrl: getRelativePath(files.profilePic[0].path)
          }
        }

        if (files.aadharFront?.[0]) {
          deleteFileIfExists(existingTeacher.aadharFront?.fileUrl)
          updateData.aadharFront = {
            type: files.aadharFront[0].mimetype,
            fileUrl: getRelativePath(files.aadharFront[0].path)
          }
        }

        if (files.aadharBack?.[0]) {
          deleteFileIfExists(existingTeacher.aadharBack?.fileUrl)
          updateData.aadharBack = {
            type: files.aadharBack[0].mimetype,
            fileUrl: getRelativePath(files.aadharBack[0].path)
          }
        }

        // if (files.certificates?.length) {
        //   if (Array.isArray(existingTeacher.certificates)) {
        //     existingTeacher.certificates.forEach((c) =>
        //       deleteFileIfExists(c.fileUrl)
        //     )
        //   }
        //   updateData.certificates = files.certificates.map((f) => ({
        //     name: f.originalname,
        //     fileUrl: getRelativePath(f.path)
        //   }))
        // }

        // if (files.resume?.[0]) {
        //   deleteFileIfExists(existingTeacher.resume)
        //   updateData.resume = getRelativePath(files.resume[0].path)
        // }

        // if (files.joiningLetter?.[0]) {
        //   deleteFileIfExists(existingTeacher.joiningLetter)
        //   updateData.joiningLetter = getRelativePath(
        //     files.joiningLetter[0].path
        //   )
        // }
      }

      const updatedTeacher = await adminTeacherService.updateTeacher(
        id,
        updateData
      )

      if (!updatedTeacher.success) {
        return res
          .status(400)
          .json(responseData(updatedTeacher.message, {}, req, false))
      }

      return res
        .status(200)
        .json(responseData('TEACHER_UPDATED', updatedTeacher.data, req, true))
    } catch (error) {
      return res
        .status(500)
        .json(
          responseData('UPDATE_FAILED', { error: error.message }, req, false)
        )
    }
  },

  getAllTeachers: async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query

      const queryResult = await adminTeacherService.getAllTeachers(
        page,
        limit,
        status
      )
      console.log('queryResult', queryResult)
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.docs.length > 0
            ? queryResult
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      return res
        .status(500)
        .json(
          responseData(
            'FAILED_TO_FETCH_TEACHERS',
            { error: error.message },
            req,
            false
          )
        )
    }
  },

  softDeleteTeacher: async (req, res) => {
    try {
      const { id } = req.params
      const teacher = await adminTeacherService.softDeleteTeacher(id)
      return res
        .status(200)
        .json(responseData('TEACHER_SOFT_DELETED', teacher, req, true))
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'SOFT_DELETE_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },

  getDeletedTeachersHistory: async (req, res) => {
    try {
      const { keyword, page = 1, limit = 10 } = req.query
      const queryResult = await adminTeacherService.getDeletedTeachersHistory(
        keyword,
        parseInt(page),
        parseInt(limit)
      )
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0
            ? queryResult[0]
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'FETCH_HISTORY_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },

  assignClassTeacher: async (req, res) => {
    try {
      const { classId, teacherId } = req.body

      const result = await adminTeacherService.assignClassTeacher({
        classId,
        teacherId
      })

      return res
        .status(result.success ? 200 : 400)
        .json(responseData(result.message, result.data, req, result.success))
    } catch (error) {
      return res.status(500).json(responseData('SERVER_ERROR', {}, req, false))
    }
  },

  updateClassTeacher: async (req, res) => {
    try {
      const { classId, teacherId } = req.body

      const result = await adminTeacherService.updateClassTeacher({
        classId,
        teacherId
      })

      return res
        .status(result.success ? 200 : 400)
        .json(responseData(result.message, result.data, req, result.success))
    } catch (error) {
      return res.status(500).json(responseData('SERVER_ERROR', {}, req, false))
    }
  },

  getAllTeachersWithClassData: async (req, res) => {
    try {
      const { keyword, page = 1, limit = 10 } = req.query
      const queryResult = await adminTeacherService.getAllTeachersWithClassData(
        keyword,
        parseInt(page),
        parseInt(limit)
      )

      return res.json(
        responseData(
          'GET_LIST',
          queryResult.docs.length > 0
            ? queryResult
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      return res.status(500).json(responseData('SERVER_ERROR', {}, req, false))
    }
  },
  removeClassTeacher: async (req, res) => {
    try {
      const { classId } = req.params
      const result = await adminTeacherService.removeClassTeacher({ classId })

      return res
        .status(result.success ? 200 : 400)
        .json(responseData(result.message, result.data, req, result.success))
    } catch (error) {
      return res.status(500).json(responseData('SERVER_ERROR', {}, req, false))
    }
  },

  assignTeacherToClassController: async (req, res) => {
    try {
      const { classId, teacherId, section, subjectId, startTime, endTime } =
        req.body
      const savedAssignment = await adminTeacherService.assignTeacherToClass({
        classId,
        teacherId,
        section,
        subjectId,
        startTime,
        endTime
      })

      return res
        .status(200)
        .json(
          responseData('TEACHER_ASSIGNED_TO_CLASS', savedAssignment, req, true)
        )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'ASSIGN_TEACHER_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },

  updateAssignTeacherToController: async (req, res) => {
    try {
      const { assignmentId } = req.params
      const { classId, teacherId, section, subjectId, startTime, endTime } =
        req.body

      const updatedAssignment = await adminTeacherService.updateTeacherAssign({
        assignmentId,
        classId,
        teacherId,
        section,
        subjectId,
        startTime,
        endTime
      })

      return res
        .status(updatedAssignment.success ? 200 : 400)
        .json(
          responseData(
            updatedAssignment.message,
            updatedAssignment.data,
            req,
            updatedAssignment.success
          )
        )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'UPDATE_TEACHER_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },
  deleteAssignTeacherToController: async (req, res) => {
    try {
      const { assignmentId } = req.params
      const deletedAssignment = await adminTeacherService.deleteTeacherAssign({
        assignmentId
      })
      return res
        .status(deletedAssignment.success ? 200 : 400)
        .json(
          responseData(
            deletedAssignment.message,
            deletedAssignment.data,
            req,
            deletedAssignment.success
          )
        )
    } catch (error) {
      console.log('catch', error)
      return res
        .status(400)
        .json(
          responseData(
            'DELETE_TEACHER_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  },
  getAssignTeacherToController: async (req, res) => {
    try {
      const { classId, teacherId, page = 1, limit = 10 } = req.query
      const queryResult = await adminTeacherService.getTeacherAssign({
        classId,
        teacherId,

        page: parseInt(page),
        limit: parseInt(limit)
      })
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.docs.length > 0
            ? queryResult
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      return res
        .status(400)
        .json(
          responseData(
            'GET_TEACHER_ASSIGNMENTS_FAILED',
            { error: error.message },
            req,
            false
          )
        )
    }
  }
}
