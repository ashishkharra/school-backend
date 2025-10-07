const { body, param } = require('express-validator')
const FeeStructure = require('../../models/fees/feeStructure.schema.js')
const StudentFee = require('../../models/fees/studentFee.schema.js')
const { validatorMiddleware } = require('../../helpers/helper')
const responseData = require('../../helpers/responseData.js')

module.exports.validate = (method) => {
  switch (method) {
    case 'adminLogin': {
      return [
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'forgot-password': {
      return [
        body('email')
          .notEmpty()
          .withMessage('EMAIL_EMPTY')
          .isEmail()
          .withMessage('EMAIL_VALID'),
        validatorMiddleware
      ]
    }
    case 'reset-password': {
      return [
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'change-password': {
      return [
        body('oldPassword').notEmpty().withMessage('OLDPASSWORD_EMPTY'),
        body('newPassword').notEmpty().withMessage('NEWPASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }

    case "registerTeacher": {
      return [
        // Name
        body("name")
          .notEmpty().withMessage("NAME_EMPTY")
          .isLength({ min: 2 }).withMessage("NAME_LENGTH_MIN")
          .isLength({ max: 50 }).withMessage("NAME_LENGTH_MAX"),

        // Email validations
        body("email")
          .notEmpty().withMessage("EMAIL_EMPTY")
          .isEmail().withMessage("EMAIL_VALID"),

        // Password validations
        body("password")
          .notEmpty().withMessage("PASSWORD_EMPTY")
          .isLength({ min: 8 }).withMessage("PASSWORD_MIN")
          .isLength({ max: 30 }).withMessage("PASSWORD_MAX"),

        // Phone validations
        body("phone")
          .notEmpty().withMessage("PHONE_EMPTY")
          .isMobilePhone().withMessage("PHONE_VALID"),

        // Date of Birth validations (ISO 8601 format)
        body("dateOfBirth")
          .notEmpty().withMessage("DOB_EMPTY")
          .isISO8601().withMessage("DOB_VALID"),

        // Gender validations (case-insensitive)
        body("gender")
          .notEmpty().withMessage("GENDER_EMPTY")
          .custom(value => ["male", "female", "other"].includes(value.toLowerCase()))
          .withMessage("GENDER_INVALID")
          .bail()
          .customSanitizer(value => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()),

        // Address validations
        body("address")
          .notEmpty().withMessage("ADDRESS_EMPTY")
          .isLength({ min: 5 }).withMessage("ADDRESS_MIN"),

        // Qualifications validations: array of strings, minimum 1
        body("qualifications")
          .isArray({ min: 1 }).withMessage("QUALIFICATIONS_ARRAY_REQUIRED")
          .custom(arr => arr.every(q => typeof q === "string")).withMessage("QUALIFICATIONS_STRING_ONLY"),

        // Classes validations: array of strings, minimum 1
        body("classes")
          .isArray({ min: 1 }).withMessage("CLASSES_ARRAY_REQUIRED")
          .custom(arr => arr.every(c => typeof c === "string")).withMessage("CLASSES_STRING_ONLY"),

        // Emergency Contact validations
        body("emergencyContact")
          .notEmpty().withMessage("EMERGENCY_CONTACT_EMPTY")
          .isObject().withMessage("EMERGENCY_CONTACT_OBJECT_REQUIRED"),

        body("emergencyContact.name")
          .notEmpty().withMessage("EMERGENCY_CONTACT_NAME_EMPTY"),

        body("emergencyContact.phone")
          .notEmpty().withMessage("EMERGENCY_CONTACT_PHONE_EMPTY")
          .isMobilePhone().withMessage("EMERGENCY_CONTACT_PHONE_VALID"),

        validatorMiddleware
      ];
    }
    case "updateTeacher": {
      return [
        // Name (optional)
        body("name")
          .optional()
          .isLength({ min: 2 }).withMessage("NAME_LENGTH_MIN")
          .isLength({ max: 50 }).withMessage("NAME_LENGTH_MAX"),

        // Email (optional)
        body("email")
          .optional()
          .isEmail().withMessage("EMAIL_VALID"),

        // Phone (optional)
        body("phone")
          .optional()
          .isMobilePhone().withMessage("PHONE_VALID"),

        // Date of Birth (optional)
        body("dateOfBirth")
          .optional()
          .isISO8601().withMessage("DOB_VALID"),

        // Gender (optional)
        body("gender")
          .optional()
          .custom(value => ["male", "female", "other"].includes(value.toLowerCase()))
          .withMessage("GENDER_INVALID")
          .bail()
          .customSanitizer(value => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()),

        // Address (optional)
        body("address")
          .optional()
          .isLength({ min: 5 }).withMessage("ADDRESS_MIN"),

        // Qualifications (optional)
        body("qualifications")
          .optional()
          .isArray().withMessage("QUALIFICATIONS_ARRAY_REQUIRED")
          .custom(arr => arr.every(q => typeof q === "string")).withMessage("QUALIFICATIONS_STRING_ONLY"),

        // Classes (optional)
        body("classes")
          .optional()
          .isArray().withMessage("CLASSES_ARRAY_REQUIRED")
          .custom(arr => arr.every(c => typeof c === "string")).withMessage("CLASSES_STRING_ONLY"),

        // Emergency Contact (optional)
        body("emergencyContact")
          .optional()
          .isObject().withMessage("EMERGENCY_CONTACT_OBJECT_REQUIRED"),

        body("emergencyContact.name")
          .optional()
          .notEmpty().withMessage("EMERGENCY_CONTACT_NAME_EMPTY"),

        body("emergencyContact.phone")
          .optional()
          .isMobilePhone().withMessage("EMERGENCY_CONTACT_PHONE_VALID"),

        validatorMiddleware
      ];
    }


    case "registerStudent": {
      return [
        // Name
        body("name")
          .notEmpty().withMessage("NAME_EMPTY")
          .isLength({ min: 2 }).withMessage("NAME_LENGTH_MIN")
          .isLength({ max: 50 }).withMessage("NAME_LENGTH_MAX"),

        // DOB
        body("dob")
          .notEmpty().withMessage("DOB_EMPTY")
          .isISO8601().withMessage("DOB_INVALID"),

        // Gender
        body("gender")
          .notEmpty().withMessage("GENDER_EMPTY")
          .isIn(["Male", "Female", "Other"]).withMessage("GENDER_INVALID"),


        // Parents
        body("parents").isArray({ min: 1 }).withMessage("PARENT_REQUIRED"),
        body("parents.*.name").notEmpty().withMessage("PARENT_NAME_EMPTY"),
        body("parents.*.occupation").optional().isString().withMessage("PARENT_OCCUPATION_INVALID"),
        body("parents.*.phone").optional().isMobilePhone("any").withMessage("PARENT_PHONE_INVALID"),
        body("parents.*.email").optional().isEmail().withMessage("PARENT_EMAIL_INVALID"),

        // Emergency Contact
        body("emergencyContact").optional().isObject().withMessage("EMERGENCY_CONTACT_INVALID"),
        body("emergencyContact.name").optional().isString().withMessage("EMERGENCY_NAME_INVALID"),
        body("emergencyContact.relation").optional().isString().withMessage("EMERGENCY_RELATION_INVALID"),
        body("emergencyContact.phone").optional().isMobilePhone("any").withMessage("EMERGENCY_PHONE_INVALID"),
        body("emergencyContact.address").optional().isString().withMessage("EMERGENCY_ADDRESS_INVALID"),

        // Address
        // body("address.street").optional().isString().withMessage("STREET_INVALID"),
        // body("address.city").optional().isString().withMessage("CITY_INVALID"),
        // body("address.state").optional().isString().withMessage("STATE_INVALID"),
        // body("address.zip").optional().isString().withMessage("ZIP_INVALID"),
        // body("address.country").optional().isString().withMessage("COUNTRY_INVALID"),

        // Contact
        body("email").optional().isEmail().withMessage("EMAIL_INVALID"),
        body("phone").optional().isMobilePhone("any").withMessage("PHONE_INVALID"),

        // Class & Academic Year
        body("classId").notEmpty().isMongoId().withMessage("CLASS_ID_INVALID"),
        body("academicYear").notEmpty().isString().withMessage("ACADEMIC_YEAR_INVALID"),
        body("section").optional().isIn(["A", "B", "C", "D"]).withMessage("SECTION_INVALID"),

        body('aadharFront')
          .custom((value, { req }) => {
            if (!req.files || !req.files.aadharFront) {
              return res.json(responseData("AADHAR_FRONT_REQUIRED", {}, req, false))
            }
            const file = req.files.aadharFront[0];
            if (!file.mimetype.startsWith("image/")) {
              return res.json(responseData("AADHAR_MUST_BE_IMAGE", {}, req, false))
            }
            return true;
          }),

        body('aadharBack')
          .custom((value, { req }) => {
            if (!req.files || !req.files.aadharBack) {
              return res.json(responseData("AADHAR_BACK_REQUIRED", {}, req, false))
            }
            const file = req.files.aadharBack[0];
            if (!file.mimetype.startsWith("image/")) {
              return res.json(responseData("AADHAR_MUST_BE_IMAGE", {}, req, false))
            }
            return true;
          }),

        validatorMiddleware,
      ];
    }

    case "registerClass": {
      return [
        // Class name
        body("name")
          .notEmpty()
          .withMessage("CLASS_NAME_REQUIRED")
          .isLength({ min: 3, max: 50 })
          .withMessage("CLASS_NAME_LENGTH"),

        body('section')
          .notEmpty()
          .withMessage("CLASS_SECTION_MUST_REQUIRED")
          .isLength({ min: 1, max: 3 })
          .withMessage("CLASS_SECTION_LENGTH"),

        validatorMiddleware,
      ]
    }

    case "updateClass": {
      return [
        body("name")
          .optional()
          .isLength({ min: 3, max: 50 })
          .withMessage("CLASS_NAME_LENGTH"),

        body("section")
          .optional()
          .isLength({ min: 1, max: 3 })
          .withMessage("CLASS_SECTION_LENGTH"),

        validatorMiddleware,
      ];
    }

    case "registerSubject": {
      return [
        // Subject name
        body("name")
          .notEmpty()
          .withMessage("SUBJECT_NAME_REQUIRED")
          .isLength({ min: 3, max: 100 })
          .withMessage("SUBJECT_NAME_LENGTH"),

        // Unique subject code
        body("code")
          .notEmpty()
          .withMessage("SUBJECT_CODE_REQUIRED")
          .isLength({ min: 2, max: 20 })
          .withMessage("SUBJECT_CODE_LENGTH"),

        // Optional description
        body("description")
          .optional()
          .isString()
          .withMessage("DESCRIPTION_MUST_BE_STRING")
          .isLength({ max: 300 })
          .withMessage("DESCRIPTION_MAX_300"),

        // Optional numeric credits
        body("credits")
          .optional()
          .isInt({ min: 0, max: 20 })
          .withMessage("CREDITS_MUST_BE_INT_0_20"),

        validatorMiddleware,
      ];
    }

    case "updateSubject": {
      return [
        // At least one field should be present
        body().custom((value, { req }) => {
          if (
            !req.body.name &&
            !req.body.code &&
            !req.body.description &&
            !req.body.credits
          ) {
            throw new Error("AT_LEAST_ONE_FIELD_REQUIRED");
          }
          return true;
        }),

        body("name")
          .optional()
          .isLength({ min: 3, max: 100 })
          .withMessage("SUBJECT_NAME_LENGTH"),

        body("code")
          .optional()
          .customSanitizer((value) => value.toUpperCase()) // 🔑 auto-uppercase
          .isLength({ min: 3, max: 10 })
          .withMessage("SUBJECT_CODE_LENGTH")
          .matches(/^[A-Z0-9]+$/)
          .withMessage("SUBJECT_CODE_FORMAT"),

        body("description")
          .optional()
          .isLength({ min: 10, max: 500 })
          .withMessage("SUBJECT_DESCRIPTION_LENGTH"),

        body("credits")
          .optional()
          .isInt({ min: 3, max: 20 })
          .withMessage("SUBJECT_CREDITS_RANGE"),

        validatorMiddleware,
      ];
    }

    case "updateStudent": {
      return [
        body("name").optional().isString().isLength({ min: 2 }).withMessage("NAME_TOO_SHORT"),

        body("dob").optional().isISO8601().toDate().withMessage("DOB_INVALID"),

        body("gender").optional().isIn(["Male", "Female", "Other"]).withMessage("INVALID_GENDER"),

        body("email").optional().isEmail().withMessage("INVALID_EMAIL"),

        body("phone").optional().isMobilePhone().withMessage("INVALID_PHONE"),

        // // Address
        // body("address").optional().isObject().withMessage("INVALID_ADDRESS"),
        // body("address.street").optional().isString().withMessage("STREET_STRING"),
        // body("address.city").optional().isString().withMessage("CITY_STRING"),
        // body("address.state").optional().isString().withMessage("STATE_STRING"),
        // body("address.zip").optional().isString().withMessage("ZIP_STRING"),
        // body("address.country").optional().isString().withMessage("COUNTRY_STRING"),

        // Parents
        body("parents").optional().isArray().withMessage("PARENTS_MUST_BE_ARRAY"),
        body("parents.*.name").optional().isString().withMessage("PARENT_NAME_INVALID"),
        body("parents.*.occupation").optional().isString().withMessage("PARENT_OCCUPATION_INVALID"),

        // Guardian & Emergency
        body("guardian").optional().isObject().withMessage("GUARDIAN_INVALID"),
        body("guardian.name").optional().isString().withMessage("GUARDIAN_NAME_INVALID"),
        body("guardian.phone").optional().isMobilePhone("any").withMessage("GUARDIAN_PHONE_INVALID"),
        body("emergencyContact").optional().isObject().withMessage("EMERGENCY_CONTACT_INVALID"),
        body("emergencyContact.name").optional().isString().withMessage("EMERGENCY_NAME_INVALID"),
        body("emergencyContact.relationship").optional().isString().withMessage("EMERGENCY_RELATION_INVALID"),
        body("emergencyContact.phone").optional().isMobilePhone("any").withMessage("EMERGENCY_PHONE_INVALID"),

        // Class & Section
        body("classId").optional().isMongoId().withMessage("CLASS_ID_INVALID"),
        body("year").optional().isInt({ min: 2000, max: new Date().getFullYear() + 1 }).withMessage("INVALID_YEAR"),
        body("section").optional().isIn(["A", "B", "C", "D"]).withMessage("INVALID_SECTION"),

        // Physical Disability
        body("physicalDisability").optional().isBoolean().withMessage("INVALID_DISABILITY"),
        body("disabilityDetails").optional().isString().withMessage("DISABILITY_DETAILS_INVALID"),

        validatorMiddleware,
      ];
    }

    case "createFeeStructure": {
      return [
        body("classIdentifier")
          .notEmpty().withMessage("CLASSIDENTIFIER_REQUIRED")
          .isLength({ min: 2, max: 50 }).withMessage("CLASSIDENTIFIER_LENGTH"),

        body("academicYear")
          .notEmpty().withMessage("ACADEMIC_YEAR_REQUIRED")
          .matches(/^\d{4}-\d{4}$/)
          .withMessage("ACADEMIC_YEAR_FORMAT_INVALID"),

        body("feeHeads")
          .isArray({ min: 1 }).withMessage("FEEHEADS_ARRAY_REQUIRED")
          .custom(arr => arr.every(f => f.type && typeof f.type === "string" && typeof f.amount === "number"))
          .withMessage("FEEHEADS_INVALID"),

        body("totalAmount")
          .notEmpty().withMessage("TOTAL_AMOUNT_REQUIRED")
          .isNumeric().withMessage("TOTAL_AMOUNT_INVALID")
          .custom((value, { req }) => {
            const sum = req.body.feeHeads.reduce((acc, head) => acc + head.amount, 0);
            if (value !== sum) return Promise.reject("TOTAL_AMOUNT_MISMATCH");
            return true;
          }),

        validatorMiddleware,
      ]
    }

    case "assignStudentFee": {
      return [
        body("studentId")
          .notEmpty().withMessage("STUDENT_ID_REQUIRED")
          .isMongoId().withMessage("STUDENT_ID_INVALID"),

        body("feeStructureId")
          .notEmpty()
          .withMessage("FEE_STRUCTURE_ID_REQUIRED")
          .isMongoId()
          .withMessage("FEE_STRUCTURE_ID_INVALID")
          .custom(async (feeStructureId, { req }) => {
            const feeStruct = await FeeStructure.findById(feeStructureId);
            if (!feeStruct) return Promise.reject("FEE_STRUCTURE_NOT_FOUND");

            const appliedHeads = req.body.appliedFeeHeads || [];

            // Validate that each applied head exists in the fee structure
            for (let head of appliedHeads) {
              const matched = feeStruct.feeHeads.find(f => f.type === head.type);
              if (!matched) return Promise.reject(`INVALID_FEE_HEAD_${head.type}`);
            }

            // Check that all mandatory heads are included
            for (let f of feeStruct.feeHeads.filter(f => !f.isOptional)) {
              if (!appliedHeads.some(a => a.type === f.type)) {
                return Promise.reject(`MANDATORY_FEE_HEAD_MISSING_${f.type}`);
              }
            }

            return true;
          }),

        body("appliedFeeHeads")
          .isArray({ min: 1 }).withMessage("APPLIED_FEEHEADS_ARRAY_REQUIRED")
          .custom(arr => arr.every(f => f.type && typeof f.type === "string" && typeof f.amount === "number"))
          .withMessage("APPLIED_FEEHEADS_INVALID"),

        body("discounts")
          .optional()
          .isNumeric().withMessage("DISCOUNTS_INVALID"),

        validatorMiddleware,
      ]
    }

    case "updateStudentFee": {
      return [
        param("id")
          .notEmpty().withMessage("STUDENT_FEE_ID_REQUIRED")
          .isMongoId().withMessage("STUDENT_FEE_ID_INVALID"),

        body("appliedFeeHeads")
          .optional()
          .isArray({ min: 1 }).withMessage("APPLIED_FEEHEADS_ARRAY_REQUIRED")
          .custom(arr => arr.every(f => f.type && typeof f.type === "string" && typeof f.amount === "number"))
          .withMessage("APPLIED_FEEHEADS_INVALID"),

        body("discounts")
          .optional()
          .isNumeric().withMessage("DISCOUNTS_INVALID"),

        body("paidTillNow")
          .optional()
          .isNumeric().withMessage("PAID_TILL_NOW_INVALID"),

        validatorMiddleware,
      ];
    }

    case "addPayment": {
      return [
        body("transactionId")
          .notEmpty().withMessage("TRANSACTION_ID_REQUIRED"),

        body("amountPaid")
          .notEmpty().withMessage("AMOUNT_PAID_REQUIRED")
          .isNumeric().withMessage("AMOUNT_PAID_INVALID")
          .custom(async (amount, { req }) => {
            const studentFee = await StudentFee.findById(req.params.id);
            if (!studentFee) return Promise.reject("STUDENT_FEE_NOT_FOUND");

            const remaining = studentFee.payableAmount - studentFee.paidTillNow;

            if (amount <= 0) return Promise.reject("AMOUNT_MUST_BE_POSITIVE");
            if (amount > remaining) return Promise.reject("PAYMENT_EXCEEDS_REMAINING");

            return true;
          }),

        body("mode")
          .notEmpty().withMessage("PAYMENT_MODE_REQUIRED")
          .isIn(["Cash", "Card", "UPI", "BankTransfer", "Cheque"]).withMessage("PAYMENT_MODE_INVALID"),

        body("status")
          .optional()
          .isIn(["Success", "Failed", "Pending"]).withMessage("PAYMENT_STATUS_INVALID"),

        body("remarks")
          .optional()
          .isString().withMessage("REMARKS_MUST_BE_STRING"),

        validatorMiddleware,
      ]
    }

    case "updateStudentFee": {
      return [
        body("appliedFeeHeads")
          .optional()
          .isArray({ min: 1 }).withMessage("APPLIED_FEEHEADS_ARRAY_REQUIRED")
          .custom(arr => arr.every(f => f.type && typeof f.type === "string" && typeof f.amount === "number"))
          .withMessage("APPLIED_FEEHEADS_INVALID"),

        body("discounts")
          .optional()
          .isNumeric().withMessage("DISCOUNTS_INVALID"),

        body("payableAmount")
          .optional()
          .isNumeric().withMessage("PAYABLE_AMOUNT_INVALID")
          .custom((value, { req }) => {
            const total = req.body.appliedFeeHeads?.reduce((acc, h) => acc + h.amount, 0) || 0;
            const discounts = req.body.discounts || 0;
            if (value !== total - discounts) return Promise.reject("PAYABLE_AMOUNT_MISMATCH");
            return true;
          }),

        validatorMiddleware,
      ]
    }

    case 'meetingSchedule': {
      return [
        body('studentId')
          .notEmpty().withMessage('STUDENT_ID_REQUIRED')
          .isMongoId().withMessage('STUDENT_ID_INVALID'),

        body('hostId')
          .notEmpty().withMessage('HOST_ID_REQUIRED')
          .isMongoId().withMessage('HOST_ID_INVALID'),

        body('date')
          .notEmpty().withMessage('MEETING_DATE_REQUIRED')
          .isISO8601().withMessage('MEETING_DATE_INVALID'),

        body('reason')
          .notEmpty().withMessage('MEETING_REASON_REQUIRED')
          .isString().withMessage('MEETING_REASON_INVALID'),

        body('notes')
          .optional()
          .isString().withMessage('NOTES_INVALID'),

        validatorMiddleware
      ]
    }

    case 'updateMeeting': {
      return [
        param('meetingId')
          .notEmpty().withMessage('MEETING_ID_REQUIRED')
          .isMongoId().withMessage('MEETING_ID_INVALID'),

        body('date')
          .optional()
          .isISO8601().withMessage('MEETING_DATE_INVALID'),

        body('reason')
          .optional()
          .isString().withMessage('MEETING_REASON_INVALID'),

        body('notes')
          .optional()
          .isString().withMessage('NOTES_INVALID'),

        body('hostId')
          .notEmpty().withMessage('HOST_ID_REQUIRED')
          .isMongoId().withMessage('HOST_ID_INVALID'),

        validatorMiddleware
      ]
    }

    case 'removeMeeting': {
      return [
        param('meetingId')
          .notEmpty().withMessage('MEETING_ID_REQUIRED')
          .isMongoId().withMessage('MEETING_ID_INVALID'),

        body('status')
          .notEmpty().withMessage('STATUS_REQUIRED')
          .isIn(['cancelled']).withMessage('STATUS_INVALID'),

        validatorMiddleware
      ]
    }

    // already covered validations
    case 'addFAQ': {
      return [
        body('title').notEmpty().withMessage('TITLE_EMPTY'),
        body('content').notEmpty().withMessage('CONTENT_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'verify-mobile': {
      return [
        body('country_code').notEmpty().withMessage('COUNTRY_CODE_EMPTY'),
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('otp_phone').notEmpty().withMessage('OTP_PHONE_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        body('otp_email').notEmpty().withMessage('OTP_EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'resend-otp': {
      return [
        body('country_code').notEmpty().withMessage('COUNTRY_CODE_EMPTY'),
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'login': {
      return [
        body('login_type').notEmpty().withMessage('LOGIN_TYPE_EMPTY'),
        body('login_input').notEmpty().withMessage('LOGIN_INPUT_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'login-token': {
      return [
        body('input').notEmpty().withMessage('LOGIN_INPUT_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        body('device_id').notEmpty().withMessage('DEVICE_ID_EMPTY'),
        body('device_type').notEmpty().withMessage('DEVICE_TYPE_EMPTY'),
        body('device_token').notEmpty().withMessage('DEVICE_TOKEN_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'permission': {
      return [
        body('permission').notEmpty().withMessage('PERMISSION_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'change-status': {
      return [
        body('status').notEmpty().withMessage('STATUS_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'set-security-pin': {
      return [
        body('pin').notEmpty().withMessage('PIN_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'contact-us': {
      return [
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        body('message').notEmpty().withMessage('MESSAGE_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'reset-password-user': {
      return [
        body('otp').notEmpty().withMessage('OTP_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'refund': {
      return [
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('amount').notEmpty().withMessage('AMOUNT_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'reply': {
      return [
        body('message').notEmpty().withMessage('MESSAGE_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'add-notification': {
      return [
        body('title').notEmpty().withMessage('TITLE_EMPTY'),
        body('description').notEmpty().withMessage('DESCRIPTION_EMPTY'),
        body('sendTo').notEmpty().withMessage('SENDTO_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'EDIT-PROFILE': {
      return [
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        body('countryID').notEmpty().withMessage('COUNTRY_EMPTY'),
        body('cityID').notEmpty().withMessage('CITY_EMPTY'),
        body('address').notEmpty().withMessage('ADDRESS_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'status-faq': {
      return [
        param('id').notEmpty().withMessage('ID_EMPTY'),
        body('status')
          .notEmpty()
          .withMessage('STATUS_EMPTY')
          .isIn(['active', 'inactive'])
          .withMessage('INVALID_STATUS'),
        validatorMiddleware
      ]
    }
    case 'add-category': {
      return [
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'add-user': {
      return [
        body('fullName').notEmpty().withMessage('NAME_EMPTY'),
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('countryCode').notEmpty().withMessage('COUNTRY_CODE_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
  }
}
