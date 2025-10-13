const router = require('express').Router();
const teachersalaryController = require('../../controllers/admins/teacher.salary.controller.js');




// router.post('/create-salary', teachersalaryController.createSalary);
router.put('/generate-salary', teachersalaryController.generateSalary);


module.exports = router
