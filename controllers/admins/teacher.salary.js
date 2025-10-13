

    const salaryService = require('../../services/admins/teacher.salaryservice');

module.exports = {
 
createSalary : async (req, res) => {
  try {
    const { teacherId, baseSalary, totalWorkingDays } = req.body;

    if (!teacherId || !baseSalary) {
      return res.status(400).json({ success: false, message: 'teacherId and baseSalary are required' });
    }

    const salaryRecord = await salaryService.createInitialSalary({ teacherId, baseSalary, totalWorkingDays });

    res.status(201).json({
      success: true,
      message: 'Initial salary record created successfully',
      data: salaryRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
}