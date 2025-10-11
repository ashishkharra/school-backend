const router = require('express').Router();
const teachersalaryController = require('../../controllers/admins/teacher.salary.js');




router.post('/create-salary', teachersalaryController.createSalary);

module.exports = router
