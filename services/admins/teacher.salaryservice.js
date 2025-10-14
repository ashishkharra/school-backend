const Salary = require('../../models/admin/salary.schema');
const Teacher = require('../../models/teacher/teacher.schema');


module.exports ={
// createInitialSalary : async ({ teacherId, baseSalary, totalWorkingDays }) => {

//   if (!teacherId || !baseSalary) throw new Error('teacherId and baseSalary are required');

//   // Check if salary record already exists
//   const existing = await Salary.findOne({ teacherId });
//   if (existing) throw new Error('Salary record already exists for this teacher');

//   // Create initial salary record
//   const salaryRecord = new Salary({
//     teacherId,
//     baseSalary,
//     totalWorkingDays: totalWorkingDays || 30,
//     totalLeaves: 0,
//     perDaySalary: null,
//     totalDeductions: null,
//     finalSalary: null,
//     status: 'Pending'
//   });

//   await salaryRecord.save();
//   return salaryRecord;
// },
 generateSalary: async ({ teacherId, month, leaves = 0 }) => {
    if (!teacherId || !month) throw new Error('teacherId and month are required');

    // 1️⃣ Fetch teacher info
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    // 2️⃣ Get salary info from teacher
    const salaryInfo = teacher.salaryInfo || {};
    const basic = salaryInfo.basic || 0;
    const allowances = salaryInfo.allowances || 0;
    const deductions = salaryInfo.deductions || 0;

    const totalSalary = basic + allowances - deductions;

    // Assume totalWorkingDays in teacher object
    const totalWorkingDays = teacher.totalWorkingDays || 30;

    // 3️⃣ Calculate per day salary and deductions for leaves
    const perDaySalary = totalSalary / totalWorkingDays;
    const totalLeaves = leaves;
    const leaveDeductions = perDaySalary * totalLeaves;

    const finalSalary = totalSalary - leaveDeductions;

    // 4️⃣ Save in Salary collection
    const salaryRecord = await Salary.findOneAndUpdate(
      { teacherId, month },
      {
        $set: {
          baseSalary: totalSalary,
          perDaySalary,
          totalLeaves,
          totalDeductions: leaveDeductions,
          finalSalary,
          status: 'Paid'
        }
      },
      { upsert: true, new: true }
    );

    return salaryRecord;
  }
}

