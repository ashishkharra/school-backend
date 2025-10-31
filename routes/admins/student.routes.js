const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const { studentDocFields } = require('../../middlewares/multer.setup.js')
const { parseMultipartJSONFields } = require('../../helpers/helper.js')
const adminStudentController = require('../../controllers/admins/student.controller.js')

  const jsonFieldsForStudent = [
    'emergencyContact',
    'siblings',
    'achievements',
    'aadharFront',
    'aadharBack',
    'extraCurricular',
    'certificates',
    'marksheets',
    'medicalRecords',
    'address',
    'transferCertificate',
    'parents',
    'appliedFeeHeads',
    'discounts'
  ];



router
  .post('/reg', verifyToken, studentDocFields, parseMultipartJSONFields(jsonFieldsForStudent), validationRule.validate('registerStudent'), adminStudentController.regStudent)

  .put('/update/:studentId', studentDocFields, parseMultipartJSONFields(jsonFieldsForStudent), validationRule.validate('updateStudent'), adminStudentController.updateStudent)
  // .put('/update/:studentId?', verifyToken, studentDocFields, validationRule.validate('updateStudent'), adminStudentController.updateStudent)

  // .put('/update/:classId/:studentId?', [verifyToken], adminStudentController.updateStudentClass)

  // .put('/update/section/:classId/:studentId/:section?', [verifyToken], adminStudentController.udpateStudentSection)

  // Merged route
  .put('/update/:classId/:studentId', [verifyToken], adminStudentController.updateStudentClassAndSection)

  .put('/delete/:studentId?', [verifyToken], adminStudentController.deleteStudent)

  .get('/get/all/:classId?', [verifyToken], adminStudentController.getStudentAccordingClass)

  .get('/get/student/profile/:studentId?', [verifyToken], adminStudentController.getStudentById)

module.exports = router