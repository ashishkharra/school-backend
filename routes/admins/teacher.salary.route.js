const router = require('express').Router();
const teachersalaryController = require('../../controllers/admins/teacher.salary.controller.js');
const { verifyToken } = require('../../middlewares/verifyToken')


// router.post('/create-salary', teachersalaryController.createSalary);
router.put('/generate-salary', [verifyToken],teachersalaryController.generateSalary);
router.get('/getteachers-salary',[verifyToken], teachersalaryController.getTeahcerSalary);


module.exports = router
