const jwt = require('jsonwebtoken')
const { responseData } = require('../helpers/responseData')
const { isEmpty } = require('lodash')
const Admin = require('../models/admin/admin.schema.js')
const Student = require('../models/students/student.schema.js')
const Teacher = require('../models/teacher/teacher.schema.js')
// const User = require('../models/user.model')
const constant = require('../helpers/constant')
const { default: mongoose } = require('mongoose')
// const UserNotificationModel = require('../models/userNotifications.model')


const getTokenFromHeaders = (headers) => {
  if (headers?.authorization && headers?.authorization.startsWith('Bearer')) {
    return headers.authorization.split(' ')[1]
  }
  return null
}

const handleAdminRole = async (user, req, res, next) => {
  const admin_data = await Admin.findOne({
    _id: mongoose.Types.ObjectId(user._id),
    status: user.status,
    forceLogout: false
  })
  if (!isEmpty(admin_data)) {
    next()
  } else {
    res.status(409).json(responseData('UNAUTHENTICATED', {}, req, false))
  }
}

const handleStudentRole = (user, req, res, next) => {
  Student.findOne({
    _id: user._id
  })
    .then((data) => {
      if (data) {
        if (data.status !== constant.status.active) {
          return res
            .status(409)
            .json(responseData('UNAUTHENTICATED', {}, req, false))
        }

        next()
      } else {
        res.status(409).json(responseData('USER_NOT_FOUND', {}, req, false))
      }
    })
    .catch((error) => {
      res
        .status(409)
        .json(responseData('UNAUTHENTICATED', error.message, req, false))
    })
}

const handleTeacherRole = (user, req, res, next) => {
  Student.findOne({
    _id: user._id
  })
    .then((data) => {
      if (data) {
        if (data.status !== constant.status.active) {
          return res
            .status(409)
            .json(responseData('UNAUTHENTICATED', {}, req, false))
        }

        next()
      } else {
        res.status(409).json(responseData('USER_NOT_FOUND', {}, req, false))
      }
    })
    .catch((error) => {
      res
        .status(409)
        .json(responseData('UNAUTHENTICATED', error.message, req, false))
    })
}

const handleVerification = async (req, res, next, token) => {
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Token is expired', data: {} })
    }

    req.user = user
    const role = (user.role || user.userType || "").toLowerCase();
    // console.log(user)
    switch (role) {
      case constant.type.admin:
      case constant.type.subAdmin:
        await handleAdminRole(user, req, res, next);
        break;

      case "teacher":
        handleTeacherRole(user, req, res, next);
        break;

      case "student": 
        handleStudentRole(user, req, res, next);
        break;

      default:
        res.status(409).json(responseData("UNAUTHENTICATED", {}, req, false));
    }

  } catch (error) {
    console.log('error', error)
    return res.status(401).json(responseData('NOT_AUTHORIZED', {}, req, false))
  }
}

exports.verifyToken = async (req, res, next) => {
  const token = getTokenFromHeaders(req.headers)
  if (!token) {
    return res.status(401).json(responseData('NOT_AUTHORIZED', {}, req, false))
  }
  handleVerification(req, res, next, token)
}

exports.withOptionalTokenMiddleware = async (req, res, next) => {
  const token = getTokenFromHeaders(req.headers)
  if (token) {
    handleVerification(req, res, next, token)
  } else {
    next()
  }
}
