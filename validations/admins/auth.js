const { body, param } = require('express-validator')
const FeeStructure = require('../../models/fees/feeStructure.schema.js')
const StudentFee = require('../../models/fees/studentFee.schema.js')
const { validatorMiddleware } = require('../../helpers/helper')
const responseData = require('../../helpers/responseData.js')
const mongoose = require('mongoose')

module.exports.validate = (method) => {
  switch (method) {
    case 'adminLogin': {
      return [
        body('email').trim().notEmpty().withMessage('EMAIL_EMPTY'),
        body('password').trim().notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'forgot-password': {
      return [
        body('email')
          .trim()
          .notEmpty()
          .withMessage('EMAIL_EMPTY')
          .isEmail()
          .withMessage('EMAIL_VALID'),
        validatorMiddleware
      ]
    }
    case 'reset-password': {
      return [
        body('password').trim().notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'change-password': {
      return [
        body('oldPassword').trim().notEmpty().withMessage('OLDPASSWORD_EMPTY'),
        body('newPassword').trim().notEmpty().withMessage('NEWPASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }

    case 'edit-profile': {
      return [
        body('firstName')
          .optional()
          .isString()
          .trim()
          .withMessage('First name must be a string')
          .notEmpty()
          .withMessage('First name is required'),

        body('lastName')
          .optional()
          .isString()
          .trim()
          .withMessage('Last name must be a string')
          .notEmpty()
          .withMessage('Last name is required'),

        body('contact')
          .optional()
          .trim()
          .isMobilePhone('any')
          .withMessage('Invalid contact number'),

        body('region')
          .optional()
          .isString()
          .trim()
          .withMessage('Region must be a string'),

        body('address')
          .optional()
          .isString()
          .trim()
          .withMessage('Address must be a string'),

        body('email')
          .optional()
          .isEmail()
          .trim()
          .withMessage('Invalid email address'),

        validatorMiddleware
      ];
    }
    case 'adminSetting': {
      return [
        body("schoolName")
          .optional()
          .isString()
          .trim()
          .withMessage("SCHOOL_NAME_MUST_BE_STRING")
          .isLength({ min: 2, max: 100 })
          .withMessage("SCHOOL_NAME_LENGTH_INVALID"),

        body("address")
          .optional()
          .isObject()
          .withMessage("ADDRESS_MUST_BE_OBJECT"),
        body("address.street").optional().isString().trim(),
        body("address.city").optional().isString().trim(),
        body("address.state").optional().isString().trim(),
        body("address.zip").optional().isString().trim(),
        body("address.country").optional().isString().trim(),

        body("contact")
          .optional()
          .isObject()
          .withMessage("CONTACT_MUST_BE_OBJECT"),
        body("contact.phone").optional().isString().trim(),
        body("contact.email").optional().isEmail().trim().withMessage("CONTACT_EMAIL_INVALID"),
        body("contact.website").optional().isString(),

        body("schoolTiming")
          .optional()
          .isObject()
          .withMessage("SCHOOL_TIMING_MUST_BE_OBJECT"),
        body("schoolTiming.startTime")
          .optional()
          .trim()
          .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .withMessage("SCHOOL_START_TIME_INVALID"),
        body("schoolTiming.endTime")
          .optional()
          .trim()
          .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .withMessage("SCHOOL_END_TIME_INVALID"),

        body("periods").optional().isObject().withMessage("PERIODS_MUST_BE_OBJECT"),
        body("periods.totalPeriods")
          .optional()
          .trim()
          .isInt({ min: 1 })
          .withMessage("TOTAL_PERIODS_INVALID"),
        body("periods.periodDuration")
          .optional()
          .trim()
          .isInt({ min: 1 })
          .withMessage("PERIOD_DURATION_INVALID"),
        body("periods.breakDuration")
          .optional()
          .trim()
          .isInt({ min: 0 })
          .withMessage("BREAK_DURATION_INVALID"),

        body("periods.lunchBreak").optional().isObject(),
        body("periods.lunchBreak.isEnabled").optional().isBoolean(),
        body("periods.lunchBreak.time")
          .optional()
          .trim()
          .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .withMessage("LUNCH_BREAK_TIME_INVALID"),
        body("periods.lunchBreak.duration")
          .optional()
          .trim()
          .isInt({ min: 0 })
          .withMessage("LUNCH_BREAK_DURATION_INVALID"),

        body("academicSession").optional().isObject().withMessage("ACADEMIC_SESSION_MUST_BE_OBJECT"),
        body("academicSession.startDate").optional().isISO8601().toDate().trim(),
        body("academicSession.endDate").optional().isISO8601().toDate().trim(),
        body("academicSession.currentSession").optional().isString().trim(),

        body("status")
          .optional()
          .trim()
          .isIn(["active", "inactive"])
          .withMessage("STATUS_INVALID"),

        body("socialUrl")
          .optional()
          .isArray()
          .withMessage("SOCIAL_URL_MUST_BE_ARRAY")
          .bail()
          .custom((arr) => {
            for (const url of arr) {
              if (typeof url !== "string") {
                throw new Error("EACH_SOCIAL_URL_MUST_BE_STRING");
              }

              try {
                new URL(url);
              } catch {
                throw new Error("INVALID_SOCIAL_URL_FORMAT");
              }

              const domainPattern = /\.[a-z]{2,}$/i;
              if (!domainPattern.test(url)) {
                throw new Error("SOCIAL_URL_MUST_HAVE_VALID_DOMAIN");
              }
            }
            return true;
          }),


        body('tollFree')
          .optional()
          .isString()
          .trim()
          .withMessage('TOLL_FREE_MUST_BE_STRING'),

        body("faqs")
          .optional()
          .isArray()
          .withMessage("FAQS_MUST_BE_ARRAY")
          .bail(),

        validatorMiddleware
      ]
    }
    case 'updateAdminSetting': {
      return [
        body('schoolName').optional().isString().withMessage('SCHOOL_NAME_STRING'),

        body('schoolLogo').optional().isString().withMessage('SCHOOL_LOGO_STRING'),

        body('address')
          .optional()
          .custom(value => value === null || (typeof value === 'object' && value !== null))
          .withMessage('ADDRESS_MUST_BE_OBJECT'),

        body('contact')
          .optional()
          .custom(value => value === null || (typeof value === 'object' && value !== null))
          .withMessage('CONTACT_MUST_BE_OBJECT'),

        body('schoolTiming')
          .optional()
          .custom(value => value === null || (typeof value === 'object' && value.startTime && value.endTime))
          .withMessage('SCHOOL_TIMING_MUST_BE_OBJECT'),

        body('periods')
          .optional()
          .custom(value => value === null || (typeof value === 'object' && value.totalPeriods && value.periodDuration))
          .withMessage('PERIODS_MUST_BE_OBJECT'),

        body('academicSession')
          .optional()
          .custom(value => value === null || (typeof value === 'object' && value.startDate && value.endDate && value.currentSession))
          .withMessage('ACADEMIC_SESSION_MUST_BE_OBJECT'),

        body('status')
          .optional()
          .trim()
          .isIn(['active', 'inactive'])
          .withMessage('STATUS_INVALID'),

        body("socialUrl")
          .optional()
          .isArray()
          .withMessage("SOCIAL_URL_MUST_BE_ARRAY")
          .bail()
          .custom((arr) => {
            for (const url of arr) {
              if (typeof url !== "string") {
                throw new Error("EACH_SOCIAL_URL_MUST_BE_STRING");
              }

              // ✅ Check if valid URL
              try {
                new URL(url);
              } catch {
                throw new Error("INVALID_SOCIAL_URL_FORMAT");
              }

              // ✅ Ensure domain has a TLD (.com, .in, .org, etc.)
              const domainPattern = /\.[a-z]{2,}$/i;
              if (!domainPattern.test(url)) {
                throw new Error("SOCIAL_URL_MUST_HAVE_VALID_DOMAIN");
              }
            }
            return true;
          }),


        validatorMiddleware
      ]
    }
    //---------------------
    case 'registerTeacher': {
      return [
        body('name').isString().notEmpty().trim().withMessage('NAME_REQUIRED'),
        body('email').isEmail().trim().withMessage('VALID_EMAIL_REQUIRED'),
        body('password').isString().notEmpty().trim().withMessage('PASSWORD_REQUIRED'),
        body('phone').optional().isString().trim(),
        body('dob').optional().isISO8601().toDate().trim(),
        body('gender').isIn(['Male', 'Female', 'Other']).trim().withMessage('GENDER_INVALID'),
        body('maritalStatus').optional().trim().isIn(['Single', 'Married', 'Divorced', 'Widowed']),
        body('bloodGroup').optional().trim().isString(),
        body('physicalDisability').optional().isBoolean(),
        body('disabilityDetails').optional().trim().isString(),
        body('qualifications').optional().isArray(),
        body('qualifications.*').optional().trim().isString(),

        // Email
        // body('email')
        //   .notEmpty()
        //   .withMessage('EMAIL_EMPTY')
        //   .isEmail()
        //   .withMessage('EMAIL_VALID'),

        // // Password
        // body('password')
        //   .notEmpty()
        //   .withMessage('PASSWORD_EMPTY')
        //   .isLength({ min: 6 })
        //   .withMessage('PASSWORD_MIN')
        //   .isLength({ max: 30 })
        //   .withMessage('PASSWORD_MAX'),

        // // Phone
        // body('phone')
        //   .notEmpty()
        //   .withMessage('PHONE_EMPTY')
        //   .isMobilePhone('any')
        //   .withMessage('PHONE_VALID'),

        // // Date of Birth
        // body('dob')
        //   .notEmpty()
        //   .withMessage('DOB_EMPTY')
        //   .isISO8601()
        //   .withMessage('DOB_VALID'),

        // // Gender
        // body('gender')
        //   .notEmpty()
        //   .withMessage('GENDER_EMPTY')
        //   .custom((value) =>
        //     ['male', 'female', 'other'].includes(value.toLowerCase())
        //   )
        //   .withMessage('GENDER_INVALID')
        //   .bail()
        //   .customSanitizer(
        //     (value) =>
        //       value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
        //   ),

        // Address (object)
        body('address')
          .notEmpty()
          .withMessage('ADDRESS_EMPTY')
          .isObject()
          .withMessage('ADDRESS_OBJECT_REQUIRED')
          .bail()
          .custom(
            (addr) => addr.street && addr.city && addr.state && addr.zip
          )
          .withMessage('ADDRESS_INCOMPLETE'),

        // Qualifications: array of strings, minimum 1
        body('qualifications')
          .isArray({ min: 1 })
          .withMessage('QUALIFICATIONS_ARRAY_REQUIRED')
          .custom((arr) => arr.every((q) => typeof q === 'string'))
          .withMessage('QUALIFICATIONS_STRING_ONLY'),

        // Classes: array of strings (ObjectIds as string)
        body('classes')
          .isArray({ min: 1 })
          .withMessage('CLASSES_ARRAY_REQUIRED')
          .custom((arr) => arr.every((c) => /^[0-9a-fA-F]{24}$/.test(c)))
          .withMessage('CLASSES_INVALID_OBJECTID'),

        // Specialization: array of strings (ObjectIds as string)
        body('specialization')
          .isArray({ min: 1 })
          .withMessage('SPECIALIZATION_ARRAY_REQUIRED')
          .custom(arr => arr.every(s => typeof s === 'string' && s.trim().length > 0))
          .withMessage('SPECIALIZATION_MUST_BE_STRING'),

        body('experience').optional().isNumeric(),
        body('dateOfJoining').optional().isISO8601().toDate(),

        // Classes: array of ObjectIds
        body('classes.*')
          .optional()
          .custom(value => mongoose.Types.ObjectId.isValid(value))
          .withMessage('INVALID_CLASS_ID'),

        // Subjects handled
        // body('subjectsHandled.*.classId')
        //   .optional()
        //   .custom(value => value.type === String)
        //   .withMessage('INVALID_CLASS_ID'),

        // Salary
        body('salaryInfo').optional().isObject(),
        body('salaryInfo.basic').optional().isNumeric().trim(),
        body('salaryInfo.allowances').optional().isNumeric().trim(),
        body('salaryInfo.deductions').optional().isNumeric().trim(),
        body('salaryInfo.netSalary').optional().isNumeric().trim(),

        // Emergency Contact
        body('emergencyContact').optional().isObject().trim(),
        body('emergencyContact.name').optional().isString().trim(),
        body('emergencyContact.relationship').optional().isString().trim(),
        body('emergencyContact.phone').optional().isString().trim(),
        validatorMiddleware
      ]
    }
    case 'updateTeacher': {
      return [
        // Name (optional)
        body('name')
          .optional()
          .trim()
          .isLength({ min: 2 })
          .withMessage('NAME_LENGTH_MIN')
          .isLength({ max: 50 })
          .withMessage('NAME_LENGTH_MAX'),

        // Email (optional)
        body('email').optional().isEmail().trim().withMessage('EMAIL_VALID'),

        // Phone (optional)
        body('phone').optional().isMobilePhone().trim().withMessage('PHONE_VALID'),

        // Date of Birth (optional)
        body('dateOfBirth').optional().isISO8601().trim().withMessage('DOB_VALID'),

        // Gender (optional)
        body('gender')
          .optional()
          .custom((value) =>
            ['male', 'female', 'other'].includes(value.toLowerCase())
          )
          .withMessage('GENDER_INVALID')
          .bail()
          .customSanitizer(
            (value) =>
              value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          ),

        // Address (optional, object)
        body('address')
          .optional()
          .isObject()
          .trim().withMessage('ADDRESS_OBJECT_REQUIRED')
          .bail()
          .custom(
            (addr) =>
              !addr || (addr.street && addr.city && addr.state && addr.zipCode)
          )
          .withMessage('ADDRESS_INCOMPLETE'),

        // Qualifications (optional, array of strings)
        body('qualifications')
          .optional()
          .isArray()
          .withMessage('QUALIFICATIONS_ARRAY_REQUIRED')
          .custom((arr) => arr.every((q) => typeof q === 'string'))
          .withMessage('QUALIFICATIONS_STRING_ONLY'),

        // Classes (optional, array of ObjectId strings)
        body('classes')
          .optional()
          .isArray()
          .withMessage('CLASSES_ARRAY_REQUIRED')
          .custom((arr) => arr.every((c) => /^[0-9a-fA-F]{24}$/.test(c)))
          .withMessage('CLASSES_INVALID_OBJECTID'),

        // Specialization (optional, array of ObjectId strings)
        body('specialization')
          .optional()
          .isArray()
          .withMessage('SPECIALIZATION_ARRAY_REQUIRED')
          .custom((arr) => arr.every((s) => /^[0-9a-fA-F]{24}$/.test(s)))
          .withMessage('SPECIALIZATION_INVALID_OBJECTID'),

        // SubjectsHandled (optional, array of objects with classId as ObjectId)
        body('subjectsHandled')
          .optional()
          .isArray()
          .withMessage('SUBJECTS_HANDLED_ARRAY_REQUIRED')
          .custom((arr) =>
            arr.every(
              (sub) =>
                sub.subjectName &&
                sub.subjectCode &&
                /^[0-9a-fA-F]{24}$/.test(sub.classId)
            )
          )
          .withMessage('SUBJECTS_HANDLED_INVALID'),

        // Emergency Contact (optional)
        body('emergencyContact')
          .optional()
          .isObject()
          .withMessage('EMERGENCY_CONTACT_OBJECT_REQUIRED'),

        body('emergencyContact.name')
          .optional()
          .notEmpty()
          .trim()
          .withMessage('EMERGENCY_CONTACT_NAME_EMPTY'),

        body('emergencyContact.phone')
          .optional()
          .isMobilePhone()
          .trim()
          .withMessage('EMERGENCY_CONTACT_PHONE_VALID'),

        validatorMiddleware
      ]
    }
    case 'classTeacherOf': {
      return [
        // classId is required and must be a valid ObjectId
        body('classId')
          .notEmpty()
          .trim()
          .withMessage('CLASS_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('CLASS_ID_INVALID'),

        body('teacherId')
          .notEmpty()
          .trim()
          .withMessage('TEACHER_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('TEACHER_ID_INVALID'),

        validatorMiddleware
      ]
    }
    case 'markAttendance': {
      return [
        body('status')
          .optional()
          .trim()
          .isIn(['Present', 'Absent'])
          .withMessage('INVALID_STATUS'),

        body('date').optional().isISO8601().trim().withMessage('INVALID_DATE_FORMAT'),

        validatorMiddleware
      ]
    }
    case 'updateClassTeacherOf': {
      return [
        // classId is required and must be a valid ObjectId
        body('classId')
          .notEmpty()
          .trim()
          .withMessage('CLASS_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('CLASS_ID_INVALID'),

        // teacherId is required and must be a valid ObjectId
        body('teacherId')
          .notEmpty()
          .trim()
          .withMessage('TEACHER_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('TEACHER_ID_INVALID'),

        validatorMiddleware
      ]
    }
    case 'assignTeachertoClass': {
      return [
        // classId (required, ObjectId)
        body('classId')
          .notEmpty()
          .trim()
          .withMessage('CLASS_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('CLASS_ID_INVALID'),

        // teacherId (required, ObjectId)
        body('teacherId')
          .notEmpty()
          .trim()
          .withMessage('TEACHER_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('TEACHER_ID_INVALID'),

        // section (required, string)
        body('section')
          .notEmpty()
          .trim()
          .withMessage('SECTION_REQUIRED')
          .isString()
          .withMessage('SECTION_MUST_BE_STRING'),

        // subjectId (required, ObjectId)
        body('subjectId')
          .notEmpty()
          .trim()
          .withMessage('SUBJECT_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('SUBJECT_ID_INVALID'),

        // startTime (required, string, basic format check e.g., HH:MM AM/PM)
        body('startTime')
          .notEmpty()
          .trim()
          .withMessage('START_TIME_REQUIRED')
          .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .withMessage('START_TIME_INVALID'),

        // endTime (required, string, basic format check)
        body('endTime')
          .notEmpty()
          .trim()
          .withMessage('END_TIME_REQUIRED')
          .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .withMessage('END_TIME_INVALID'),

        validatorMiddleware
      ]
    }
    case 'updateAssignTeachertoClass': {
      return [
        // assignmentId (required, in params, ObjectId)
        param('assignmentId')
          .notEmpty()
          .trim()
          .withMessage('ASSIGNMENT_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('ASSIGNMENT_ID_INVALID'),

        // classId (optional, ObjectId)
        body('classId')
          .optional()
          .trim()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('CLASS_ID_INVALID'),

        // teacherId (optional, ObjectId)
        body('teacherId')
          .optional()
          .trim()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('TEACHER_ID_INVALID'),

        // section (optional, string)
        body('section')
          .optional()
          .trim()
          .isString()
          .withMessage('SECTION_MUST_BE_STRING'),

        // subjectId (optional, ObjectId)
        body('subjectId')
          .optional()
          .trim()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('SUBJECT_ID_INVALID'),

        // startTime (optional, string, format HH:MM AM/PM)
        body('startTime')
          .optional()
          .trim()
          .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .withMessage('START_TIME_INVALID'),

        // endTime (optional, string, format HH:MM AM/PM)
        body('endTime')
          .optional()
          .trim()
          .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .withMessage('END_TIME_INVALID'),

        validatorMiddleware
      ]
    }
    case 'uploadAssignment': {
      return [
        // teacherId (required, ObjectId)
        body('teacherId')
          .notEmpty()
          .trim()
          .withMessage('TEACHER_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('TEACHER_ID_INVALID'),

        // classId (required, ObjectId)
        body('classId')
          .notEmpty()
          .trim()
          .withMessage('CLASS_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('CLASS_ID_INVALID'),

        // subjectId (required, ObjectId)
        // body('subjectId')
        //   .notEmpty()
        //   .withMessage('SUBJECT_ID_REQUIRED')
        //   .bail()
        //   .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
        //   .withMessage('SUBJECT_ID_INVALID'),

        // title (required, string)
        body('title')
          .notEmpty()
          .trim()
          .withMessage('TITLE_REQUIRED')
          .bail()
          .isString()
          .withMessage('TITLE_MUST_BE_STRING'),

        // description (optional, string)
        body('description')
          .optional()
          .trim()
          .isString()
          .withMessage('DESCRIPTION_MUST_BE_STRING'),

        // dueDate (required, valid date)
        body('dueDate')
          .notEmpty()
          .trim()
          .withMessage('DUE_DATE_REQUIRED')
          .bail()
          .custom((value) => !isNaN(new Date(value).getTime()))
          .withMessage('DUE_DATE_INVALID'),

        // file (optional, string filename, if using multer)
        body('file')
          .optional()
          .trim()
          .isString()
          .withMessage('FILE_MUST_BE_STRING'),

        validatorMiddleware
      ]
    }
    case 'updateAssignment': {
      return [
        // id (required, ObjectId in params)
        param('id')
          .notEmpty()
          .trim()
          .withMessage('ASSIGNMENT_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('ASSIGNMENT_ID_INVALID'),

        // title (optional, string)
        body('title')
          .optional()
          .trim()
          .isString()
          .withMessage('TITLE_MUST_BE_STRING'),

        // description (optional, string)
        body('description')
          .optional()
          .trim()
          .isString()
          .withMessage('DESCRIPTION_MUST_BE_STRING'),

        // file (optional, string filename if using multer)
        body('file')
          .optional()
          .trim()
          .isString()
          .withMessage('FILE_MUST_BE_STRING'),

        validatorMiddleware
      ];
    }
    case 'markOrUpdateAttendance': {
      return [
        // classId (required, ObjectId)
        body('classId')
          .notEmpty()
          .trim()
          .withMessage('CLASS_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('CLASS_ID_INVALID'),

        // date (required, valid date)
        // body('date')
        //   .notEmpty()
        //   .withMessage('DATE_REQUIRED')
        //   .bail()
        //   .custom((value) => !isNaN(new Date(value).getTime()))
        //   .withMessage('DATE_INVALID'),

        // session (required, number 1|2|3)
        body('session')
          .notEmpty()
          .trim()
          .withMessage('SESSION_REQUIRED')
          .bail()
          .isInt({ min: 1, max: 3 })
          .withMessage('SESSION_INVALID'),

        // takenBy (required, ObjectId)
        body('takenBy')
          .notEmpty()
          .trim()
          .withMessage('TAKENBY_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('TAKENBY_INVALID'),

        // records (required, array)
        body('records')
          .notEmpty()
          .withMessage('RECORDS_REQUIRED')
          .bail()
          .isArray({ min: 1 })
          .withMessage('RECORDS_MUST_BE_ARRAY'),

        // records[].student (required, ObjectId)
        body('records.*.student')
          .notEmpty()
          .trim()
          .withMessage('STUDENT_ID_REQUIRED')
          .bail()
          .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
          .withMessage('STUDENT_ID_INVALID'),

        // records[].status (required, string)
        body('records.*.status')
          .notEmpty()
          .trim()
          .withMessage('STATUS_REQUIRED')
          .bail()
          .isString()
          .withMessage('STATUS_MUST_BE_STRING'),

        // records[].remarks (optional, string)
        body('records.*.remarks')
          .optional()
          .trim()
          .isString()
          .withMessage('REMARKS_MUST_BE_STRING'),

        validatorMiddleware
      ];
    }
    case 'updateAttendance': {
      return [
        // classId (required, ObjectId)
        // body('classId')
        //   .notEmpty()
        //   .withMessage('CLASS_ID_REQUIRED')
        //   .bail()
        //   .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
        //   .withMessage('CLASS_ID_INVALID'),

        // date (required, valid date)
        // body('date')
        //   .notEmpty()
        //   .withMessage('DATE_REQUIRED')
        //   .bail()
        //   .custom((value) => !isNaN(new Date(value).getTime()))
        //   .withMessage('DATE_INVALID'),

        // session (required, number 1|2|3)
        // body('session')
        //   .notEmpty()
        //   .withMessage('SESSION_REQUIRED')
        //   .bail()
        //   .isInt({ min: 1, max: 3 })
        //   .withMessage('SESSION_INVALID'),

        // records (required, array)
        body('records')
          .notEmpty()
          .withMessage('RECORDS_REQUIRED')
          .bail()
          .isArray({ min: 1 })
          .withMessage('RECORDS_MUST_BE_ARRAY'),

        // records[].student (required, ObjectId)
        // body('records.*.student')
        //   .notEmpty()
        //   .withMessage('STUDENT_ID_REQUIRED')
        //   .bail()
        //   .custom((value) => /^[0-9a-fA-F]{24}$/.test(value))
        //   .withMessage('STUDENT_ID_INVALID'),

        // records[].status (required, string)
        body('records.*.status')
          .notEmpty()
          .trim()
          .withMessage('STATUS_REQUIRED')
          .bail()
          .isString()
          .withMessage('STATUS_MUST_BE_STRING'),

        // records[].remarks (optional, string)
        body('records.*.remarks')
          .optional()
          .trim()
          .isString()
          .withMessage('REMARKS_MUST_BE_STRING'),

        validatorMiddleware
      ];
    }
    case 'assignGradeOrMarks': {
      return [
        // ✅ classId: required, must be a valid MongoDB ObjectId
        body('classId')
          .notEmpty()
          .trim()
          .withMessage('CLASS_ID_EMPTY')
          .matches(/^[0-9a-fA-F]{24}$/)
          .withMessage('CLASS_ID_INVALID'),

        // ✅ gradesData: must be a non-empty array
        body('gradesData')
          .isArray({ min: 1 })
          .withMessage('GRADES_DATA_ARRAY_REQUIRED'),

        // ✅ Each element in gradesData should contain a valid studentId
        body('gradesData.*.studentId')
          .notEmpty()
          .trim()
          .withMessage('STUDENT_ID_EMPTY')
          .matches(/^[0-9a-fA-F]{24}$/)
          .withMessage('STUDENT_ID_INVALID'),

        // ✅ marks: optional but if present, must be a number between 0 and 100
        body('gradesData.*.marks')
          .optional()
          .trim()
          .isNumeric()
          .withMessage('MARKS_NUMERIC')
          .custom((value) => value >= 0 && value <= 100)
          .withMessage('MARKS_RANGE_INVALID'),

        // ✅ grade: optional but must be one of A, B, C, D, F
        body('gradesData.*.grade')
          .optional()
          .trim()
          .isString()
          .withMessage('GRADE_STRING')
          .isIn(['A', 'B', 'C', 'D', 'F'])
          .withMessage('GRADE_INVALID'),

        // ✅ remark: optional, should be a string (limit for length)
        body('gradesData.*.remark')
          .optional()
          .trim()
          .isString()
          .withMessage('REMARK_STRING')
          .isLength({ max: 200 })
          .withMessage('REMARK_MAX_LENGTH'),

        validatorMiddleware
      ]
    }
    case 'updateGrade': {
      return [
        // ✅ gradeId: must exist and be a valid ObjectId (from req.params)
        param('gradeId')
          .notEmpty()
          .trim()
          .withMessage('GRADE_ID_EMPTY')
          .matches(/^[0-9a-fA-F]{24}$/)
          .withMessage('GRADE_ID_INVALID'),

        // ✅ marks: optional but must be numeric and within range 0–100
        body('marks')
          .optional()
          .trim()
          .isNumeric()
          .withMessage('MARKS_NUMERIC')
          .custom((value) => value >= 0 && value <= 100)
          .withMessage('MARKS_RANGE_INVALID'),

        // ✅ grade: optional but must be one of A–F
        body('grade')
          .optional()
          .trim()
          .isString()
          .withMessage('GRADE_STRING')
          .isIn(['A', 'B', 'C', 'D', 'F'])
          .withMessage('GRADE_INVALID'),

        // ✅ remark: optional, must be a string with length limit
        body('remark')
          .optional()
          .trim()
          .isString()
          .withMessage('REMARK_STRING')
          .isLength({ max: 200 })
          .withMessage('REMARK_MAX_LENGTH'),

        validatorMiddleware
      ]
    }

    case 'assignClass': {
      return [
        body().isArray({ min: 1 }).withMessage("Body must be an array of slots"),
        body('*.teacherId').notEmpty().trim().withMessage('teacherId is required'),
        body('*.classId').notEmpty().trim().withMessage('classId is required'),
        body('*.subjectId').notEmpty().trim().withMessage('subjectId is required'),
        body('*.day').isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
          .withMessage('day must be a valid weekday'),
        body('*.period').isInt({ min: 1 }).trim().withMessage('period must be a number'),
        body('*.startTime').matches(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .trim().withMessage('startTime must be in hh:mm AM/PM format'),
        body('*.endTime').matches(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .trim().withMessage('endTime must be in hh:mm AM/PM format'),

        validatorMiddleware
      ]
    }

    case 'checkSlot': {
      return [
        body('teacherId').notEmpty().trim().withMessage('teacherId is required'),
        body('classId').notEmpty().trim().withMessage('classId is required'),
        body('day').isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
          .trim().withMessage('day must be a valid weekday'),
        body('startTime').matches(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .trim().withMessage('startTime must be in hh:mm AM/PM format'),
        body('endTime').matches(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .trim().withMessage('endTime must be in hh:mm AM/PM format'),

        validatorMiddleware
      ]
    }

    case 'updateAssign': {
      return [
        param('classId').notEmpty().trim().withMessage('classId is required'),
        body('slots').isArray({ min: 1 }).withMessage('slots must be an array'),
        body('slots.*.teacherId').optional().notEmpty().trim().withMessage('teacherId cannot be empty if provided'),
        body('slots.*.subjectId').optional().notEmpty().trim().withMessage('subjectId cannot be empty if provided'),
        body('slots.*.day').optional().isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
          .trim().withMessage('day must be a valid weekday if provided'),
        body('slots.*.period').optional().isInt({ min: 1 }).trim().withMessage('period must be a number if provided'),
        body('slots.*.startTime').optional().matches(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .trim().withMessage('startTime must be in hh:mm AM/PM format if provided'),
        body('slots.*.endTime').optional().matches(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
          .trim().withMessage('endTime must be in hh:mm AM/PM format if provided'),

        validatorMiddleware

      ]
    }
    //---------
    case 'registerStudent': {
      return [
        // Name
        body('name')
          .notEmpty()
          .trim()
          .withMessage('NAME_EMPTY')
          .isLength({ min: 2 })
          .withMessage('NAME_LENGTH_MIN')
          .isLength({ max: 50 })
          .withMessage('NAME_LENGTH_MAX'),

        // DOB
        body('dob')
          .notEmpty()
          .trim()
          .withMessage('DOB_EMPTY')
          .isISO8601()
          .withMessage('DOB_INVALID'),

        // Gender
        body('gender')
          .notEmpty()
          .trim()
          .withMessage('GENDER_EMPTY')
          .isIn(['Male', 'Female', 'Other'])
          .withMessage('GENDER_INVALID'),

        // Parents
        body('parents').isArray({ min: 1 }).withMessage('PARENT_REQUIRED'),
        body('parents.*.name').notEmpty().withMessage('PARENT_NAME_EMPTY'),
        body('parents.*.occupation')
          .optional()
          .trim()
          .isString()
          .withMessage('PARENT_OCCUPATION_INVALID'),
        // body('parents.*.phone')
        //   .optional()
        //   .isMobilePhone('any')
        //   .withMessage('PARENT_PHONE_INVALID'),
        body('parents.*.email')
          .optional()
          .trim()
          .isEmail()
          .withMessage('PARENT_EMAIL_INVALID'),

        // Emergency Contact
        body('emergencyContact')
          .optional()
          .trim()
          .isObject()
          .withMessage('EMERGENCY_CONTACT_INVALID'),
        body('emergencyContact.name')
          .optional()
          .trim()
          .isString()
          .withMessage('EMERGENCY_NAME_INVALID'),
        body('emergencyContact.relation')
          .optional()
          .trim()
          .isString()
          .withMessage('EMERGENCY_RELATION_INVALID'),
        // body('emergencyContact.phone')
        //   .optional()
        //   .isMobilePhone('any')
        //   .withMessage('EMERGENCY_PHONE_INVALID'),
        body('emergencyContact.address')
          .optional()
          .trim()
          .isString()
          .withMessage('EMERGENCY_ADDRESS_INVALID'),

        // Address
        body("address.street").optional().isString().trim().withMessage("STREET_INVALID"),
        body("address.city").optional().isString().trim().withMessage("CITY_INVALID"),
        body("address.state").optional().isString().trim().withMessage("STATE_INVALID"),
        body("address.zip").optional().isString().trim().withMessage("ZIP_INVALID"),
        body("address.country").optional().isString().trim().withMessage("COUNTRY_INVALID"),

        // Contact
        body('email').optional().isEmail().trim().withMessage('EMAIL_INVALID'),
        // body('phone')
        //   .optional()
        //   .isMobilePhone('any')
        //   .withMessage('PHONE_INVALID'),

        // Class & Academic Year
        body('classId').notEmpty().isMongoId().trim().withMessage('CLASS_ID_INVALID'),
        body('academicYear')
          .notEmpty()
          .trim()
          .isString()
          .withMessage('ACADEMIC_YEAR_INVALID'),
        body('section')
          .optional()
          .trim()
          .isIn(['A', 'B', 'C', 'D'])
          .withMessage('SECTION_INVALID'),

        body('aadharFront').custom((value, { req }) => {
          if (!req.files || !req.files.aadharFront) {
            return res.json(
              responseData('AADHAR_FRONT_REQUIRED', {}, req, false)
            )
          }
          const file = req.files.aadharFront[0]
          if (!file.mimetype.startsWith('image/')) {
            return res.json(
              responseData('AADHAR_MUST_BE_IMAGE', {}, req, false)
            )
          }
          return true
        }),

        body('aadharBack').custom((value, { req }) => {
          if (!req.files || !req.files.aadharBack) {
            return res.json(
              responseData('AADHAR_BACK_REQUIRED', {}, req, false)
            )
          }
          const file = req.files.aadharBack[0]
          if (!file.mimetype.startsWith('image/')) {
            return res.json(
              responseData('AADHAR_MUST_BE_IMAGE', {}, req, false)
            )
          }
          return true
        }),

        body('feeStructureId')
          .notEmpty()
          .trim()
          .withMessage('FEE_STRUCTURE_ID_REQUIRED')
          .isMongoId()
          .withMessage('FEE_STRUCTURE_ID_INVALID')
          .custom(async (feeStructureId, { req }) => {
            const feeStruct = await FeeStructure.findById(feeStructureId)
            if (!feeStruct) return Promise.reject('FEE_STRUCTURE_NOT_FOUND')

            const appliedHeads = req.body.appliedFeeHeads || []

            // Validate that each applied head exists in the fee structure
            for (let head of appliedHeads) {
              const matched = feeStruct.feeHeads.find(
                (f) => f.type === head.type
              )
              if (!matched)
                return Promise.reject(`INVALID_FEE_HEAD_${head.type}`)
            }

            // Check that all mandatory heads are included
            for (let f of feeStruct.feeHeads.filter((f) => !f.isOptional)) {
              if (!appliedHeads.some((a) => a.type === f.type)) {
                return Promise.reject(`MANDATORY_FEE_HEAD_MISSING_${f.type}`)
              }
            }

            return true
          }),

        body('appliedFeeHeads')
          .isArray({ min: 1 })
          .withMessage('APPLIED_FEEHEADS_ARRAY_REQUIRED')
          .custom((arr) =>
            arr.every(
              (f) =>
                f.type &&
                typeof f.type === 'string' &&
                typeof f.amount === 'number'
            )
          )
          .withMessage('APPLIED_FEEHEADS_INVALID'),

        body('discounts')
          .optional()
          .trim()
          .isNumeric()
          .withMessage('DISCOUNTS_INVALID'),

        validatorMiddleware
      ]
    }

    case 'registerClass': {
      return [
        // Class name
        body('name')
          .notEmpty()
          .trim()
          .withMessage('CLASS_NAME_REQUIRED')
          .isLength({ min: 3, max: 50 })
          .withMessage('CLASS_NAME_LENGTH'),

        body('section')
          .notEmpty()
          .trim()
          .withMessage('CLASS_SECTION_MUST_REQUIRED')
          .isLength({ min: 1, max: 3 })
          .withMessage('CLASS_SECTION_LENGTH'),

        validatorMiddleware
      ]
    }

    case 'updateClass': {
      return [
        body('name')
          .optional()
          .trim()
          .isLength({ min: 3, max: 50 })
          .withMessage('CLASS_NAME_LENGTH'),

        body('section')
          .optional()
          .trim()
          .isLength({ min: 1, max: 3 })
          .withMessage('CLASS_SECTION_LENGTH'),

        validatorMiddleware
      ]
    }

    case 'registerSubject': {
      return [
        // Subject name
        body('name')
          .notEmpty()
          .trim()
          .withMessage('SUBJECT_NAME_REQUIRED')
          .isLength({ min: 3, max: 100 })
          .withMessage('SUBJECT_NAME_LENGTH'),

        // Unique subject code
        body('code')
          .notEmpty()
          .trim()
          .withMessage('SUBJECT_CODE_REQUIRED')
          .isLength({ min: 2, max: 20 })
          .withMessage('SUBJECT_CODE_LENGTH'),

        // Optional description
        body('description')
          .optional()
          .trim()
          .isString()
          .withMessage('DESCRIPTION_MUST_BE_STRING')
          .isLength({ max: 300 })
          .withMessage('DESCRIPTION_MAX_300'),

        validatorMiddleware
      ]
    }

    case 'updateSubject': {
      return [
        // At least one field should be present
        body().custom((value, { req }) => {
          if (
            !req.body.name &&
            !req.body.code &&
            !req.body.description &&
            !req.body.credits
          ) {
            throw new Error('AT_LEAST_ONE_FIELD_REQUIRED')
          }
          return true
        }),

        body('name')
          .optional()
          .trim()
          .isLength({ min: 3, max: 100 })
          .withMessage('SUBJECT_NAME_LENGTH'),

        body('code')
          .optional()
          .trim()
          .customSanitizer((value) => value.toUpperCase()) // 🔑 auto-uppercase
          .isLength({ min: 3, max: 10 })
          .withMessage('SUBJECT_CODE_LENGTH')
          .matches(/^[A-Z0-9]+$/)
          .withMessage('SUBJECT_CODE_FORMAT'),

        body('description')
          .optional()
          .trim()
          .isLength({ min: 10, max: 500 })
          .withMessage('SUBJECT_DESCRIPTION_LENGTH'),

        body('credits')
          .optional()
          .trim()
          .isInt({ min: 3, max: 20 })
          .withMessage('SUBJECT_CREDITS_RANGE'),

        validatorMiddleware
      ]
    }

    case 'updateStudent': {
      return [
        body('name')
          .optional()
          .trim()
          .isString()
          .isLength({ min: 2 })
          .withMessage('NAME_TOO_SHORT'),

        body('dob').optional().isISO8601().toDate().trim().withMessage('DOB_INVALID'),

        body('gender')
          .optional()
          .trim()
          .isIn(['Male', 'Female', 'Other'])
          .withMessage('INVALID_GENDER'),

        body('email').optional().isEmail().trim().withMessage('INVALID_EMAIL'),

        body('phone').optional().isMobilePhone().trim().withMessage('INVALID_PHONE'),

        // // Address
        // body("address").optional().isObject().withMessage("INVALID_ADDRESS"),
        // body("address.street").optional().isString().withMessage("STREET_STRING"),
        // body("address.city").optional().isString().withMessage("CITY_STRING"),
        // body("address.state").optional().isString().withMessage("STATE_STRING"),
        // body("address.zip").optional().isString().withMessage("ZIP_STRING"),
        // body("address.country").optional().isString().withMessage("COUNTRY_STRING"),

        // Parents
        body('parents')
          .optional()
          .trim()
          .isArray()
          .withMessage('PARENTS_MUST_BE_ARRAY'),
        body('parents.*.name')
          .optional()
          .trim()
          .isString()
          .withMessage('PARENT_NAME_INVALID'),
        body('parents.*.occupation')
          .optional()
          .trim()
          .isString()
          .withMessage('PARENT_OCCUPATION_INVALID'),

        // Guardian & Emergency
        body('guardian').optional().isObject().trim().withMessage('GUARDIAN_INVALID'),
        body('guardian.name')
          .optional()
          .trim()
          .isString()
          .withMessage('GUARDIAN_NAME_INVALID'),
        body('guardian.phone')
          .optional()
          .trim()
          .isMobilePhone('any')
          .withMessage('GUARDIAN_PHONE_INVALID'),
        body('emergencyContact')
          .optional()
          .trim()
          .isObject()
          .withMessage('EMERGENCY_CONTACT_INVALID'),
        body('emergencyContact.name')
          .optional()
          .trim()
          .isString()
          .withMessage('EMERGENCY_NAME_INVALID'),
        body('emergencyContact.relationship')
          .optional()
          .trim()
          .isString()
          .withMessage('EMERGENCY_RELATION_INVALID'),
        body('emergencyContact.phone')
          .optional()
          .trim()
          .isMobilePhone('any')
          .withMessage('EMERGENCY_PHONE_INVALID'),

        // Class & Section
        body('classId').optional().isMongoId().trim().withMessage('CLASS_ID_INVALID'),
        body('year')
          .trim()
          .optional()
          .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
          .withMessage('INVALID_YEAR'),
        body('section')
          .optional()
          .trim()
          .isIn(['A', 'B', 'C', 'D'])
          .withMessage('INVALID_SECTION'),

        // Physical Disability
        body('physicalDisability')
          .optional()
          .trim()
          .isBoolean()
          .withMessage('INVALID_DISABILITY'),
        body('disabilityDetails')
          .optional()
          .trim()
          .isString()
          .withMessage('DISABILITY_DETAILS_INVALID'),

        validatorMiddleware
      ]
    }

    case 'createFeeStructure': {
      return [
        body('classIdentifier')
          .notEmpty()
          .trim()
          .withMessage('CLASSIDENTIFIER_REQUIRED')
          .isLength({ min: 2, max: 50 })
          .withMessage('CLASSIDENTIFIER_LENGTH'),

        body('academicYear')
          .notEmpty()
          .trim()
          .withMessage('ACADEMIC_YEAR_REQUIRED')
          .matches(/^\d{4}-\d{4}$/)
          .withMessage('ACADEMIC_YEAR_FORMAT_INVALID'),

        body('feeHeads')
          .isArray({ min: 1 })
          .withMessage('FEEHEADS_ARRAY_REQUIRED')
          .custom((feeHeads) => {
            const allValid = feeHeads.every(
              f => f.type && typeof f.type === 'string' && typeof f.amount === 'number'
            );
            if (!allValid) throw new Error('FEEHEADS_INVALID');
            return true;
          }),

        body('totalAmount')
          .notEmpty()
          .withMessage('TOTAL_AMOUNT_REQUIRED')
          .isNumeric()
          .withMessage('TOTAL_AMOUNT_INVALID')
          .custom((value, { req }) => {
            const sum = req.body.feeHeads.reduce((acc, head) => acc + head.amount, 0);
            if (Number(value) !== sum) throw new Error('TOTAL_AMOUNT_MISMATCH');
            return true;
          }),

        validatorMiddleware
      ];
    }


    case 'updateFeeStruture': {
      return [
        body('classIdentifier')
          .optional()
          .trim()
          .isLength({ min: 2, max: 50 })
          .withMessage('CLASSIDENTIFIER_LENGTH'),

        body('academicYear')
          .optional()
          .trim()
          .matches(/^\d{4}-\d{4}$/)
          .withMessage('ACADEMIC_YEAR_FORMAT_INVALID'),

        body('feeHeads')
          .isArray({ min: 1 })
          .withMessage('FEEHEADS_ARRAY_REQUIRED')
          .customSanitizer((arr) =>
            arr.map(f => ({
              ...f,
              amount: Number(f.amount)
            }))
          )
          .custom((arr) =>
            arr.every(
              (f) =>
                f.type &&
                typeof f.type === 'string' &&
                typeof f.amount === 'number' &&
                !isNaN(f.amount)
            )
          )
          .trim().withMessage('FEEHEADS_INVALID'),


        body('totalAmount')
          .optional()
          .isNumeric()
          .trim().withMessage('TOTAL_AMOUNT_INVALID')
          .custom((value, { req }) => {
            if (req.body.feeHeads) {
              const sum = req.body.feeHeads.reduce(
                (acc, head) => acc + head.amount,
                0
              );
              if (value !== sum) {
                throw new Error('TOTAL_AMOUNT_MISMATCH');
              }
            }
            return true;
          }),

        validatorMiddleware
      ];
    }

    case 'assignStudentFee': {
      return [
        body('studentId')
          .notEmpty()
          .trim()
          .withMessage('STUDENT_ID_REQUIRED')
          .isMongoId()
          .withMessage('STUDENT_ID_INVALID'),

        body('feeStructureId')
          .notEmpty()
          .trim()
          .withMessage('FEE_STRUCTURE_ID_REQUIRED')
          .isMongoId()
          .withMessage('FEE_STRUCTURE_ID_INVALID')
          .custom(async (feeStructureId, { req }) => {
            const feeStruct = await FeeStructure.findById(feeStructureId)
            if (!feeStruct) return Promise.reject('FEE_STRUCTURE_NOT_FOUND')

            const appliedHeads = req.body.appliedFeeHeads || []

            // Validate that each applied head exists in the fee structure
            for (let head of appliedHeads) {
              const matched = feeStruct.feeHeads.find(
                (f) => f.type === head.type
              )
              if (!matched)
                return Promise.reject(`INVALID_FEE_HEAD_${head.type}`)
            }

            // Check that all mandatory heads are included
            for (let f of feeStruct.feeHeads.filter((f) => !f.isOptional)) {
              if (!appliedHeads.some((a) => a.type === f.type)) {
                return Promise.reject(`MANDATORY_FEE_HEAD_MISSING_${f.type}`)
              }
            }

            return true
          }),

        body('appliedFeeHeads')
          .isArray({ min: 1 })
          .withMessage('APPLIED_FEEHEADS_ARRAY_REQUIRED')
          .custom((arr) =>
            arr.every(
              (f) =>
                f.type &&
                typeof f.type === 'string' &&
                typeof f.amount === 'number'
            )
          )
          .trim().withMessage('APPLIED_FEEHEADS_INVALID'),

        body('discounts')
          .optional()
          .isNumeric()
          .withMessage('DISCOUNTS_INVALID'),

        validatorMiddleware
      ]
    }

    case 'updateStudentFee': {
      return [
        param('id')
          .notEmpty()
          .trim()
          .withMessage('STUDENT_FEE_ID_REQUIRED')
          .isMongoId()
          .withMessage('STUDENT_FEE_ID_INVALID'),

        body('appliedFeeHeads')
          .optional()
          .isArray({ min: 1 })
          .trim().withMessage('APPLIED_FEEHEADS_ARRAY_REQUIRED')
          .custom((arr) =>
            arr.every(
              (f) =>
                f.type &&
                typeof f.type === 'string' &&
                typeof f.amount === 'number'
            )
          )
          .withMessage('APPLIED_FEEHEADS_INVALID'),

        body('discounts')
          .optional()
          .trim()
          .isNumeric()
          .withMessage('DISCOUNTS_INVALID'),

        body('paidTillNow')
          .optional()
          .trim()
          .isNumeric()
          .withMessage('PAID_TILL_NOW_INVALID'),

        validatorMiddleware
      ]
    }

    case 'addPayment': {
      return [
        body('amountPaid')
          .notEmpty()
          .trim()
          .withMessage('AMOUNT_PAID_REQUIRED')
          .isNumeric()
          .withMessage('AMOUNT_PAID_INVALID')
          .custom(async (amount, { req }) => {
            const studentFee = await StudentFee.findById(req.params.id)
            if (!studentFee) return Promise.reject('STUDENT_FEE_NOT_FOUND')

            const remaining = studentFee.payableAmount - studentFee.paidTillNow

            if (amount <= 0) return Promise.reject('AMOUNT_MUST_BE_POSITIVE')
            if (amount > remaining)
              return Promise.reject('PAYMENT_EXCEEDS_REMAINING')

            return true
          }),

        body('remarks')
          .optional()
          .trim()
          .isString()
          .withMessage('REMARKS_MUST_BE_STRING'),

        validatorMiddleware
      ]
    }

    case 'updateStudentFee': {
      return [
        body('appliedFeeHeads')
          .optional()
          .isArray({ min: 1 })
          .trim().withMessage('APPLIED_FEEHEADS_ARRAY_REQUIRED')
          .custom((arr) =>
            arr.every(
              (f) =>
                f.type &&
                typeof f.type === 'string' &&
                typeof f.amount === 'number'
            )
          )
          .withMessage('APPLIED_FEEHEADS_INVALID'),

        body('discounts')
          .optional()
          .trim()
          .isNumeric()
          .withMessage('DISCOUNTS_INVALID'),

        body('payableAmount')
          .optional()
          .isNumeric()
          .trim().withMessage('PAYABLE_AMOUNT_INVALID')
          .custom((value, { req }) => {
            const total =
              req.body.appliedFeeHeads?.reduce((acc, h) => acc + h.amount, 0) ||
              0
            const discounts = req.body.discounts || 0
            if (value !== total - discounts)
              return Promise.reject('PAYABLE_AMOUNT_MISMATCH')
            return true
          }),

        validatorMiddleware
      ]
    }

    case 'meetingSchedule': {
      return [
        body('studentId')
          .notEmpty()
          .trim()
          .withMessage('STUDENT_ID_REQUIRED')
          .isMongoId()
          .withMessage('STUDENT_ID_INVALID'),

        body('hostId')
          .notEmpty()
          .trim()
          .withMessage('HOST_ID_REQUIRED')
          .isMongoId()
          .withMessage('HOST_ID_INVALID'),

        body('date')
          .notEmpty()
          .trim()
          .withMessage('MEETING_DATE_REQUIRED')
          .isISO8601()
          .withMessage('MEETING_DATE_INVALID'),

        body('reason')
          .notEmpty()
          .trim()
          .withMessage('MEETING_REASON_REQUIRED')
          .isString()
          .withMessage('MEETING_REASON_INVALID'),

        body('notes').optional().isString().withMessage('NOTES_INVALID'),

        validatorMiddleware
      ]
    }

    case 'updateMeeting': {
      return [
        param('meetingId')
          .notEmpty()
          .trim()
          .withMessage('MEETING_ID_REQUIRED')
          .isMongoId()
          .withMessage('MEETING_ID_INVALID'),

        body('date').optional().isISO8601().trim().withMessage('MEETING_DATE_INVALID'),

        body('reason')
          .optional()
          .trim()
          .isString()
          .withMessage('MEETING_REASON_INVALID'),

        body('notes').optional().isString().withMessage('NOTES_INVALID'),

        body('hostId')
          .notEmpty()
          .trim()
          .withMessage('HOST_ID_REQUIRED')
          .isMongoId()
          .withMessage('HOST_ID_INVALID'),

        validatorMiddleware
      ]
    }

    case 'removeMeeting': {
      return [
        param('meetingId')
          .notEmpty()
          .trim()
          .withMessage('MEETING_ID_REQUIRED')
          .isMongoId()
          .withMessage('MEETING_ID_INVALID'),

        body('status')
          .notEmpty()
          .trim()
          .withMessage('STATUS_REQUIRED')
          .isIn(['cancelled'])
          .withMessage('STATUS_INVALID'),

        validatorMiddleware
      ]
    }

    // already covered validations
    case 'addFAQ': {
      return [
        body('title').notEmpty().trim().withMessage('TITLE_EMPTY'),
        body('content').notEmpty().trim().withMessage('CONTENT_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'verify-mobile': {
      return [
        body('country_code').notEmpty().trim().withMessage('COUNTRY_CODE_EMPTY'),
        body('mobile').notEmpty().trim().withMessage('MOBILE_EMPTY'),
        body('otp_phone').notEmpty().trim().withMessage('OTP_PHONE_EMPTY'),
        body('email').notEmpty().trim().withMessage('EMAIL_EMPTY'),
        body('otp_email').notEmpty().trim().withMessage('OTP_EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'resend-otp': {
      return [
        body('country_code').notEmpty().trim().withMessage('COUNTRY_CODE_EMPTY'),
        body('mobile').notEmpty().trim().withMessage('MOBILE_EMPTY'),
        body('email').notEmpty().trim().withMessage('EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'login': {
      return [
        body('login_type').notEmpty().trim().withMessage('LOGIN_TYPE_EMPTY'),
        body('login_input').notEmpty().trim().withMessage('LOGIN_INPUT_EMPTY'),
        body('password').notEmpty().trim().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'login-token': {
      return [
        body('input').notEmpty().trim().withMessage('LOGIN_INPUT_EMPTY'),
        body('password').notEmpty().trim().withMessage('PASSWORD_EMPTY'),
        body('device_id').notEmpty().trim().withMessage('DEVICE_ID_EMPTY'),
        body('device_type').notEmpty().trim().withMessage('DEVICE_TYPE_EMPTY'),
        body('device_token').notEmpty().trim().withMessage('DEVICE_TOKEN_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'permission': {
      return [
        body('permission').notEmpty().trim().withMessage('PERMISSION_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'change-status': {
      return [
        body('status').notEmpty().trim().withMessage('STATUS_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'set-security-pin': {
      return [
        body('pin').notEmpty().trim().withMessage('PIN_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'contact-us': {
      return [
        body('name').notEmpty().trim().withMessage('NAME_EMPTY'),
        body('email').notEmpty().trim().withMessage('EMAIL_EMPTY'),
        body('message').notEmpty().trim().withMessage('MESSAGE_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'reset-password-user': {
      return [
        body('otp').notEmpty().trim().withMessage('OTP_EMPTY'),
        body('password').notEmpty().trim().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'refund': {
      return [
        body('mobile').notEmpty().trim().withMessage('MOBILE_EMPTY'),
        body('amount').notEmpty().trim().withMessage('AMOUNT_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'reply': {
      return [
        body('message').notEmpty().trim().withMessage('MESSAGE_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'add-notification': {
      return [
        body('title').notEmpty().trim().withMessage('TITLE_EMPTY'),
        body('description').notEmpty().trim().withMessage('DESCRIPTION_EMPTY'),
        body('sendTo').notEmpty().trim().withMessage('SENDTO_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'EDIT-PROFILE': {
      return [
        body('name').notEmpty().trim().withMessage('NAME_EMPTY'),
        body('countryID').notEmpty().trim().withMessage('COUNTRY_EMPTY'),
        body('cityID').notEmpty().trim().withMessage('CITY_EMPTY'),
        body('address').notEmpty().trim().withMessage('ADDRESS_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'status-faq': {
      return [
        param('id').notEmpty().trim().withMessage('ID_EMPTY'),
        body('status')
          .notEmpty()
          .trim().withMessage('STATUS_EMPTY')
          .isIn(['active', 'inactive'])
          .withMessage('INVALID_STATUS'),
        validatorMiddleware
      ]
    }
    case 'add-category': {
      return [
        body('name').notEmpty().trim().withMessage('NAME_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'add-user': {
      return [
        body('fullName').notEmpty().trim().withMessage('NAME_EMPTY'),
        body('mobile').notEmpty().trim().withMessage('MOBILE_EMPTY'),
        body('countryCode').notEmpty().trim().withMessage('COUNTRY_CODE_EMPTY'),
        body('email').notEmpty().trim().withMessage('EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }

    case 'submissions': {
      return [
        body('assignmentId').notEmpty().trim().withMessage("ASSIGNMENT_ID_REQUIRED"),
        body('classId').notEmpty().trim().withMessage('CLASS_ID_REQUIRED'),

        validatorMiddleware
      ]
    }

    case 'contact-us': {
      return [
        body('name')
          .trim()
          .notEmpty()
          .withMessage('NAME_REQUIRED')
          .isLength({ min: 2 })
          .withMessage('NAME_TOO_SHORT'),

        body('email')
          .trim()
          .notEmpty()
          .withMessage('EMAIL_EMPTY')
          .isEmail()
          .withMessage('INVALID_EMAIL'),

        body('phone')
          .optional({ checkFalsy: true })
          .isString()
          .matches(/^[0-9+\-\s()]{7,20}$/)
          .withMessage('INVALID_PHONE_FORMAT'),

        body('message')
          .trim()
          .notEmpty()
          .withMessage('MESSAGE_REQUIRED')
          .isLength({ min: 10 })
          .withMessage('MESSAGE_TOO_SHORT'),

        body('subject')
          .optional()
          .isString()
          .isLength({ max: 150 })
          .withMessage('SUBJECT_TOO_LONG'),

        validatorMiddleware
      ];
    }

    case 'feedback': {
      return [
        body('name')
          .trim()
          .notEmpty()
          .withMessage('NAME_REQUIRED'),

        body('role')
          .optional()
          .isIn(['Student', 'Parent', 'Teacher', 'Visitor'])
          .withMessage('INVALID_ROLE'),

        body('message')
          .trim()
          .notEmpty()
          .withMessage('MESSAGE_REQUIRED')
          .isLength({ min: 10 })
          .withMessage('MESSAGE_TOO_SHORT'),

        body('rating')
          .optional()
          .isInt({ min: 1, max: 5 })
          .withMessage('RATING_MUST_BE_BETWEEN_1_AND_5'),

        validatorMiddleware
      ]
    }

    case 'make-announcement': {
      return [
        // 🏷️ Title is required
        body('title')
          .trim()
          .notEmpty()
          .withMessage('TITLE_REQUIRED')
          .isLength({ max: 150 })
          .withMessage('TITLE_TOO_LONG'),

        // 📝 Message is required
        body('message')
          .trim()
          .notEmpty()
          .withMessage('MESSAGE_REQUIRED')
          .isLength({ max: 2000 })
          .withMessage('MESSAGE_TOO_LONG'),

        // 👥 Audience (optional, but must be array if provided)
        body('audience')
          .optional()
          .isArray()
          .withMessage('AUDIENCE_MUST_BE_ARRAY'),

        // 📎 Attachments (optional array of strings)
        body('attachments')
          .optional()
          .isArray()
          .withMessage('ATTACHMENTS_MUST_BE_ARRAY'),

        // 📅 Dates
        body('startDate')
          .optional()
          .isISO8601()
          .withMessage('INVALID_START_DATE'),
        body('endDate')
          .optional()
          .isISO8601()
          .withMessage('INVALID_END_DATE'),

        // ⚠️ Priority
        body('priority')
          .optional()
          .isIn(['low', 'medium', 'high'])
          .withMessage('INVALID_PRIORITY'),

        // 🚦 Status
        body('status')
          .optional()
          .isIn(['active', 'inactive'])
          .withMessage('INVALID_STATUS'),

        validatorMiddleware
      ];
    }

    case 'testimonial-status': {
      return [
        body('status')
          .trim()
          .notEmpty()
          .withMessage('STATUS_REQUIRED')
          .isIn(['pending', 'approved', 'rejected'])
          .withMessage('INVALID_STATUS_VALUE'),

        validatorMiddleware
      ];
    }

  }
}
