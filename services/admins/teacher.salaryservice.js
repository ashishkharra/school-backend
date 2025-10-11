const Salary = require('../../models/admin/salary.schema');
const Teacher = require('../../models/teacher/teacher.schema');


module.exports ={
createInitialSalary : async ({ teacherId, baseSalary, totalWorkingDays }) => {

  if (!teacherId || !baseSalary) throw new Error('teacherId and baseSalary are required');

  // Check if salary record already exists
  const existing = await Salary.findOne({ teacherId });
  if (existing) throw new Error('Salary record already exists for this teacher');

  // Create initial salary record
  const salaryRecord = new Salary({
    teacherId,
    baseSalary,
    totalWorkingDays: totalWorkingDays || 30,
    totalLeaves: 0,
    perDaySalary: null,
    totalDeductions: null,
    finalSalary: null,
    status: 'Pending'
  });

  await salaryRecord.save();
  return salaryRecord;
}
}

