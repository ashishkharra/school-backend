const router = require('express').Router();
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const teacherController = require('../../controllers/admins/teacher.controller.js');
const { teacherDocFields } = require('../../middlewares/multer.setup.js')
const { parseMultipartJSONFields } = require('../../helpers/helper.js')

// router
//     .post("/teachers",[verifyToken], validationRule.validate("addTeacher"), adminController.addTeacher)
//     .get("/teachers",[verifyToken], adminController.getAllTeachers)
//     .get("/teachers/:id",[verifyToken], adminController.getTeacherById)
//     .put("/teachers/:id",[verifyToken], adminController.updateTeacher)
//     .delete("/teachers/:id",[verifyToken], adminController.deleteTeacher)




const jsonFieldsForTeacher = [
  'address',
   'aadharFront',
    'aadharBack',
  'qualifications',
  'subjectsHandled',
  'classes',
  'specialization',
  'salaryInfo',
  'emergencyContact',
  
];


//   router.post('/reg', verifyToken, studentDocFields, parseMultipartJSONFields(jsonFieldsForTeacher), validationRule.validate('registerStudent'), adminStudentController.regStudent)

router.post('/register' ,[verifyToken],teacherDocFields, parseMultipartJSONFields(jsonFieldsForTeacher),validationRule.validate('registerTeacher'),teacherController.registerTeacher);
router.put('/updateTeachers/:id',[verifyToken],teacherDocFields, parseMultipartJSONFields(jsonFieldsForTeacher),validationRule.validate('updateTeacher'),teacherController.updateTeacher);
router.get('/getAllTeacher',[verifyToken],teacherController.getAllTeachers);
router.put('/soft-delete/:id',[verifyToken], teacherController.softDeleteTeacher);
router.get("/deletedTeachersHistory",[verifyToken], teacherController.getDeletedTeachersHistory);


router.post('/class-teacherOf' ,validationRule.validate('classTeacherOf'),teacherController.assignClassTeacher);
router.put('/update-classteacherOf' ,validationRule.validate('updateClassTeacherOf'),teacherController.updateClassTeacher);
router.get('/getAll-class-teacher', teacherController.getAllTeachersWithClassData);
router.delete('/delete-class-teacher/:classId', teacherController.removeClassTeacher);


// updateClassTeacher
router.post('/assign-teacher' , validationRule.validate('assignTeachertoClass'),teacherController.assignTeacherToClassController);
router.put('/update-assign-teacher/:assignmentId',validationRule.validate('updateAssignTeachertoClass'),teacherController.updateAssignTeacherToController);
router.delete('/delete-assign-teacher/:assignmentId' ,teacherController.deleteAssignTeacherToController);
router.get("/get-teacher-assignments", teacherController.getAssignTeacherToController);
module.exports = router
