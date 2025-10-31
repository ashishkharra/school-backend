const router = require('express').Router();
const teachersalaryController = require('../../controllers/admins/teacher.salary.controller.js');
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/auth')


// router.post('/create-salary', teachersalaryController.createSalary);
router.put('/generate-salary', [verifyToken],validationRule.validate('generateSalary'),teachersalaryController.generateSalary);
// router.get('/getteachers-salary',[verifyToken], teachersalaryController.getAllSalariesController  );
router.get("/salary-status", teachersalaryController.getTeacherSalaryStatusController);


module.exports = router
