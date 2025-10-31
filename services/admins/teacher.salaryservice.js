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
//  generateSalary: async ({ teacherId, month, leaves = 0 }) => {
//   try {
//     if (!teacherId || !month)
//       throw new Error('teacherId and month are required')

//     const teacher = await Teacher.findById(teacherId)
//     if (!teacher) throw new Error('Teacher not found')

//     const salaryInfo = teacher.salaryInfo || {}
//     const basic = salaryInfo.basic || 0
//     const allowances = salaryInfo.allowances || 0
//     const deductions = salaryInfo.deductions || 0

//     const totalSalary = basic + allowances - deductions
//     const totalWorkingDays = teacher.totalWorkingDays || 30
//     const perDaySalary = totalSalary / totalWorkingDays
//     const leaveDeductions = perDaySalary * leaves
//     const finalSalary = totalSalary - leaveDeductions

//     const salaryRecord = await Salary.findOneAndUpdate(
//       { teacherId, month },
//       {
//         $set: {
//           baseSalary: totalSalary,
//           perDaySalary,
//           totalLeaves: leaves,
//           totalDeductions: leaveDeductions,
//           finalSalary,
//           status: 'Paid'
//         }
//       },
//       { upsert: true, new: true }
//     )

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
//       LOGIN_URL: `${
//         process.env.FRONTEND_URL || 'https://yourapp.com'
//       }/teacher/login`
//     }

//     const invoicePath = await generateInvoice(dataBody)
//     salaryRecord.invoicePath = invoicePath
//     await salaryRecord.save()
//     await sendEmail('salary-paid', dataBody)

//     return {
//       success: true,
//       message: 'SALARY_GENERATED_SUCCESSFULLY',
//       doc: salaryRecord
//     }
//   } catch (error) {
//     return {
//       success: false,
//       message: error.message || 'SALARY_GENERATION_FAILED',
//       doc: {}
//     }
//   }
// }

// generateSalary: async ({ teacherId, month, leaves = 0, createdBy }) => {
//   try {
//     if (!teacherId || !month) throw new Error("teacherId and month are required");

//     const teacher = await Teacher.findById(teacherId);
//     if (!teacher) throw new Error("Teacher not found");

//     const salaryInfo = teacher.salaryInfo || {};

//     const basic = Number(salaryInfo.basic) || 0;
//     const allowances = Number(salaryInfo.allowances) || 0;
//     const deductions = Number(salaryInfo.deductions) || 0;
//     const leavesCount = Number(leaves) || 0;

//     const totalSalary = basic + allowances - deductions;
//     const totalWorkingDays = 30;
//     const perDaySalary = totalSalary / totalWorkingDays;
//     const leaveDeductions = perDaySalary * leavesCount;

//     const finalSalary = Number(totalSalary - leaveDeductions);

//     // ✅ Handle NaN error safely
//     if (isNaN(finalSalary)) {
//       throw new Error("Salary calculation failed: Please fill salaryInfo values for teacher");
//     }

//     const salaryRecord = await Salary.findOneAndUpdate(
//       { teacherId, month },
//       {
//         $set: {
//           baseSalary: totalSalary,
//           perDaySalary,
//           totalLeaves: leavesCount,
//           totalDeductions: leaveDeductions,
//           finalSalary,
//           status: "Paid",
//         },
//       },
//       { upsert: true, new: true }
//     );

//     // ✅ Credit salary to wallet safely
//     await walletService.creditWallet({
//       userId: teacherId,
//       role: "teacher",
//        amount: finalSalary,
//     });

//     const dataBody = {
//       TEACHER_NAME: teacher.name,
//       MONTH: month,
//       FINAL_SALARY: `₹${finalSalary.toFixed(2)}`,
//       STATUS: "Paid",
//     };

//     const invoicePath = await generateInvoice(dataBody);
//     salaryRecord.invoicePath = invoicePath;
//     await salaryRecord.save();
//     await sendEmail("salary-paid", dataBody);

//     return { success: true, message: "SALARY_GENERATED_SUCCESSFULLY", doc: salaryRecord };

//   } catch (error) {
//     return { success: false, message: "Salary generation failed", error: error.message };
//   }
// }
generateSalary : async ({ teacherId, month, leaves = 0, createdBy }) => {
  try {
    if (!teacherId || !month) throw new Error("teacherId and month are required");

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error("Teacher not found");

    const { basic = 0, allowances = 0, deductions = 0 } = teacher.salaryInfo || {};

    const totalSalary = Number(basic) + Number(allowances) - Number(deductions);
    const totalWorkingDays = 30;
    const perDaySalary = totalSalary / totalWorkingDays;
    const leaveDeductions = perDaySalary * leaves;
    const finalSalary = totalSalary - leaveDeductions;

    if (isNaN(finalSalary)) throw new Error("Fill salaryInfo for this teacher");

    const salaryRecord = await Salary.findOneAndUpdate(
      { teacherId, month },
      {
        $set: {
          baseSalary: totalSalary,
          perDaySalary,
          totalLeaves: leaves,
          totalDeductions: leaveDeductions,
          finalSalary,
          status: "Paid",
        },
      },
      { upsert: true, new: true }
    );

    // ✅ Credit salary to wallet (admin -> teacher)
    await walletService.creditWallet({
      userId: teacherId,     // receiver = teacher
      role: "teacher",
      amount: finalSalary,
      description: `Salary for ${month}`,
      referenceId: salaryRecord._id,
      createdBy              // giver = admin
    });

    // ✅ Invoice data
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
      LOGIN_URL: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/teacher/login`
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
//  generateSalary: async ({ teacherId, month, leaves }) => {
//     try {
//       if (!teacherId || !month)
//         throw new Error('teacherId and month are required');

//       // ✅ 1️⃣ Fetch teacher's attendance summary for that month
//       const attendanceSummary = await adminTeacherService.getTeacherAttendanceSummary(
//         null, // date not needed
//         month,
//         teacherId
//       );

//       console.log('🟢 Attendance Summary:', attendanceSummary);

//       // ✅ 2️⃣ Extract totalAbsent (auto-calculated leaves)
//       let totalAbsent = 0;

//       if (attendanceSummary?.success && attendanceSummary?.results) {
//         const res = attendanceSummary.results;
//         totalAbsent = res.totalAbsent || 0;
//       }

//       // ✅ 3️⃣ Allow admin override if leaves are manually provided
//       if (typeof leaves === 'number') {
//         totalAbsent = leaves;
//       }

//       console.log('🟢 Total Absent (auto or manual):', totalAbsent);

//       // ✅ 4️⃣ Fetch teacher details
//       const teacher = await Teacher.findById(teacherId);
//       if (!teacher) throw new Error('Teacher not found');

//       const salaryInfo = teacher.salaryInfo || {};
//       const basic = salaryInfo.basic || 0;
//       const allowances = salaryInfo.allowances || 0;
//       const deductions = salaryInfo.deductions || 0;

//       const totalSalary = basic + allowances - deductions;
//       const totalWorkingDays = teacher.totalWorkingDays || 30;
//       const perDaySalary = totalSalary / totalWorkingDays;

//       // ✅ 5️⃣ Deduct salary for absents
//       const leaveDeductions = perDaySalary * totalAbsent;
//       const finalSalary = totalSalary - leaveDeductions;

//       // ✅ 6️⃣ Save or update salary record
//       const salaryRecord = await Salary.findOneAndUpdate(
//         { teacherId, month },
//         {
//           $set: {
//             baseSalary: totalSalary,
//             perDaySalary,
//             totalWorkingDays,
//             totalLeaves: totalAbsent,
//             totalDeductions: leaveDeductions,
//             finalSalary,
//             status: 'Paid'
//           }
//         },
//         { upsert: true, new: true }
//       );

//       // ✅ 7️⃣ Prepare invoice data
//       const dataBody = {
//         TEACHER_NAME: teacher.name,
//         MONTH: month,
//         TEACHER_ID: teacher._id.toString(),
//         BASE_SALARY: `₹${totalSalary.toFixed(2)}`,
//         WORKING_DAYS: totalWorkingDays,
//         LEAVES: totalAbsent,
//         PER_DAY_SALARY: `₹${perDaySalary.toFixed(2)}`,
//         DEDUCTIONS: `₹${leaveDeductions.toFixed(2)}`,
//         FINAL_SALARY: `₹${finalSalary.toFixed(2)}`,
//         STATUS: 'Paid',
//         LOGIN_URL: `${
//           process.env.FRONTEND_URL || 'https://yourapp.com'
//         }/teacher/login`
//       };

//       // ✅ 8️⃣ Generate invoice PDF and save path
//       const invoicePath = await generateInvoice(dataBody);
//       salaryRecord.invoicePath = invoicePath;
//       await salaryRecord.save();

//       // ✅ 9️⃣ Send email notification
//       await sendEmail('salary-paid', dataBody);

//       // ✅ 10️⃣ Return response
//       return {
//         success: true,
//         message: 'SALARY_GENERATED_SUCCESSFULLY',
//         doc: salaryRecord
//       };
//     } catch (error) {
//       console.error('❌ Error in generateSalary:', error);
//       return {
//         success: false,
//         message: error.message || 'SALARY_GENERATION_FAILED',
//         doc: {}
//       };
//     }
//   }

// getAllSalaries: async (page = 1, limit = 10, filters = {}) => {
//     try {
//       page = parseInt(page) || 1
//       limit = parseInt(limit) || 10
//       const skip = (page - 1) * limit

//       const query = {}

//       // ✅ Filter by Teacher ID
//       if (filters.teacherId && mongoose.Types.ObjectId.isValid(filters.teacherId)) {
//         query.teacherId = new mongoose.Types.ObjectId(filters.teacherId)
//       }

//       // ✅ Filter by month (case-insensitive)
//       if (filters.month) {
//         query.month = { $regex: new RegExp(filters.month, 'i') }
//       }

//       // ✅ Fetch salary records
//       const salaryRecords = await Salary.find(query)
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })

//       const total = await Salary.countDocuments(query)
//       const result = []

//       // ✅ Join with teacher details
//       for (const salary of salaryRecords) {
//         const teacher = await Teacher.findById(salary.teacherId)

//         result.push({
//           TEACHER_NAME:
//             teacher?.name ||
//             `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim(),
//           TEACHER_ID: salary.teacherId.toString(),
//           MONTH: salary.month,
//           BASE_SALARY: `₹${salary.baseSalary.toFixed(2)}`,
//           WORKING_DAYS: salary.totalWorkingDays,
//           LEAVES: salary.totalLeaves,
//           PER_DAY_SALARY: `₹${salary.perDaySalary.toFixed(2)}`,
//           DEDUCTIONS: `₹${salary.totalDeductions.toFixed(2)}`,
//           FINAL_SALARY: `₹${salary.finalSalary.toFixed(2)}`,
//           STATUS: salary.status,
//           LOGIN_URL: `${
//             process.env.FRONTEND_URL || 'https://yourapp.com'
//           }/teacher/login`
//         })
//       }

//       // ✅ Return structured data for controller
//       return {
//         success: true,
//         message: 'SALARIES_FETCHED_SUCCESSFULLY',
//         salaries: result,
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit)
//       }
//     } catch (error) {
//       console.error('Error in getAllSalaries:', error.message)
//       return {
//         success: false,
//         message: error.message || 'SALARIES_FETCH_FAILED',
//         salaries: [],
//         total: 0,
//         page,
//         limit,
//         totalPages: 0
//       }
//     }
//   },
 


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
