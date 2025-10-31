const { sendEmail } = require('../../helpers/helper')
const Salary = require('../../models/admin/salary.schema')
const Teacher = require('../../models/teacher/teacher.schema')
const { generateInvoicePDF } = require('../../helpers/generateinvoice')
const generateInvoice = require('../../helpers/generateinvoice')
const { default: mongoose } = require('mongoose')
const adminTeacherService = require('../../services/admins/teacher.service');
const { teacherSalaryStatusLookup } = require('../../helpers/commonAggregationPipeline')
const walletService = require("../../services/admins/admin.wallet.service");

module.exports = {

// generateSalary : async ({ teacherId, month, leaves = 0, createdBy }) => {
//   try {
//     if (!teacherId || !month) throw new Error("teacherId and month are required");

//     const teacher = await Teacher.findById(teacherId);
//     if (!teacher) throw new Error("Teacher not found");

//     const { basic = 0, allowances = 0, deductions = 0 } = teacher.salaryInfo || {};

//     const totalSalary = Number(basic) + Number(allowances) - Number(deductions);
//     const totalWorkingDays = 30;
//     const perDaySalary = totalSalary / totalWorkingDays;
//     const leaveDeductions = perDaySalary * leaves;
//     const finalSalary = totalSalary - leaveDeductions;

//     if (isNaN(finalSalary)) throw new Error("Fill salaryInfo for this teacher");

//     const salaryRecord = await Salary.findOneAndUpdate(
//       { teacherId, month },
//       {
//         $set: {
//           baseSalary: totalSalary,
//           perDaySalary,
//           totalLeaves: leaves,
//           totalDeductions: leaveDeductions,
//           finalSalary,
//           status: "Paid",
//         },
//       },
//       { upsert: true, new: true }
//     );

//     // ✅ Credit salary to wallet (admin -> teacher)
//     await walletService.creditWallet({
//       userId: teacherId,     // receiver = teacher
//       role: "teacher",
//       amount: finalSalary,
//       description: `Salary for ${month}`,
//       referenceId: salaryRecord._id,
//       createdBy              // giver = admin
//     });

//     // ✅ Invoice data
//     const dataBody = {
//       TEACHER_NAME: teacher.name,
//       MONTH: month,
//       TEACHER_ID: teacher._id.toString(),
//       BASE_SALARY: `₹${totalSalary.toFixed(2)}`,
//       WORKING_DAYS: totalWorkingDays,
//       LEAVES: leaves,
//       PER_DAY_SALARY: `₹${perDaySalary.toFixed(2)}`,
//       DEDUCTIONS: `₹${leaveDeductions.toFixed(2)}`,
//       FINAL_SALARY: `₹${finalSalary.toFixed(2)}`,
//       STATUS: 'Paid',
//       LOGIN_URL: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/teacher/login`
//     };

//     const invoicePath = await generateInvoice(dataBody);
//     salaryRecord.invoicePath = invoicePath;
//     await salaryRecord.save();
//     await sendEmail('salary-paid', dataBody);

//     return { success: true, message: "Salary paid & wallet updated", data: salaryRecord };

//   } catch (error) {
//     return { success: false, message: error.message };
//   }
// }
generateSalary : async ({ teacherId, month, leaves = 0, createdBy }) => {
  try {
    if (!teacherId || !month) throw new Error("teacherId and month are required");

    // ✅ 1. Get Teacher details
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error("Teacher not found");

    // ✅ 2. Get Attendance Summary using your lookup
    const attendanceSummary = await adminTeacherService.getTeacherAttendanceSummary(
      null,
      month,
      teacherId
    );
console.log(attendanceSummary,"--------")
    if (!attendanceSummary.success)
      throw new Error("Unable to fetch attendance summary");

    const { totalAbsent = 0 } = attendanceSummary.results;

    // ✅ No leave from frontend — use attendance data
    leaves = totalAbsent;

    // ✅ 3. Salary Calculation
    const { basic = 0, allowances = 0, deductions = 0 } = teacher.salaryInfo || {};

    const totalSalary = Number(basic) + Number(allowances) - Number(deductions);
    const totalWorkingDays = 30;
    const perDaySalary = totalSalary / totalWorkingDays;
    const leaveDeductions = perDaySalary * leaves;
    const finalSalary = totalSalary - leaveDeductions;

    if (isNaN(finalSalary)) throw new Error("Fill salaryInfo for this teacher");

    // ✅ 4. Save salary record
    const salaryRecord = await Salary.findOneAndUpdate(
      { teacherId, month },
      {
        $set: {
          baseSalary: totalSalary,
          perDaySalary,
          totalLeaves: leaves, // ✅ auto leaves
          totalDeductions: leaveDeductions,
          finalSalary,
          status: "Paid",
        },
      },
      { upsert: true, new: true }
    );

    // ✅ 5. Credit to Wallet
    await walletService.creditWallet({
      userId: teacherId,
      role: "teacher",
      amount: finalSalary,
      description: `Salary for ${month}`,
      referenceId: salaryRecord._id,
      createdBy
    });

    // ✅ 6. Invoice + Email
    const dataBody = {
      TEACHER_NAME: teacher.name,
      MONTH: month,
      TEACHER_ID: teacher._id.toString(),
      BASE_SALARY: `₹${totalSalary.toFixed(2)}`,
      WORKING_DAYS: totalWorkingDays,
      LEAVES: leaves,
      PER_DAY_SALARY: `₹${perDaySalary.toFixed(2)}`,
      DEDUCTIONS: `₹${leaveDeductions.toFixed(2)}`,
      FINAL_SALARY: `₹${finalSalary.toFixed(2)}`,
      STATUS: 'Paid',
      LOGIN_URL: `${process.env.FRONTEND_URL}/teacher/login`
    };

    const invoicePath = await generateInvoice(dataBody);
    salaryRecord.invoicePath = invoicePath;
    await salaryRecord.save();
    await sendEmail('salary-paid', dataBody);

    return { success: true, message: "Salary paid & wallet updated", data: salaryRecord };

  } catch (error) {
    return { success: false, message: error.message };
  }
}

,

getTeacherSalaryStatusService : async (month) => {
  try {
    if (!month) {
      return { success: false, message: "MONTH_REQUIRED", results: [] };
    }

    const pipeline = teacherSalaryStatusLookup(month);
    console.log(pipeline,"pipeline=====")
    const results = await Teacher.aggregate(pipeline);

    if (!results.length) {
      return { success: false, message: "NO_TEACHERS_FOUND", results: [] };
    }

    return {
      success: true,
      message: "TEACHER_SALARY_STATUS_FETCHED",
      results
    };
  } catch (error) {
    console.error("Error in getTeacherSalaryStatusService:", error);
    return { success: false, message: "INTERNAL_SERVER_ERROR", results: [] };
  }
},
}
