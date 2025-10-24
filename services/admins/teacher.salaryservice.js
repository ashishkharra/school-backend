const { sendEmail } = require('../../helpers/helper');
const Salary = require('../../models/admin/salary.schema');
const Teacher = require('../../models/teacher/teacher.schema');
const { generateInvoicePDF } = require("../../helpers/generateinvoice"); // ✅ Added import
const generateInvoice = require('../../helpers/generateinvoice');
const { default: mongoose } = require('mongoose');


module.exports ={
//  generateSalary: async ({ teacherId, month, leaves = 0 }) => {
//     if (!teacherId || !month) throw new Error('teacherId and month are required');

//     // 1️⃣ Fetch teacher info
//     const teacher = await Teacher.findById(teacherId);
//     if (!teacher) throw new Error('Teacher not found');

//     // 2️⃣ Get salary info from teacher
//     const salaryInfo = teacher.salaryInfo || {};
//     const basic = salaryInfo.basic || 0;
//     const allowances = salaryInfo.allowances || 0;
//     const deductions = salaryInfo.deductions || 0;

//     const totalSalary = basic + allowances - deductions;
//     const totalWorkingDays = teacher.totalWorkingDays || 30;

//     // 3️⃣ Calculate per day salary and deductions
//     const perDaySalary = totalSalary / totalWorkingDays;
//     const totalLeaves = leaves;
//     const leaveDeductions = perDaySalary * totalLeaves;
//     const finalSalary = totalSalary - leaveDeductions;

//     // 4️⃣ Save in Salary collection
//     const salaryRecord = await Salary.findOneAndUpdate(
//       { teacherId, month },
//       {
//         $set: {
//           baseSalary: totalSalary,
//           perDaySalary,
//           totalLeaves,
//           totalDeductions: leaveDeductions,
//           finalSalary,
//           status: 'Paid',
//         },
//       },
//       { upsert: true, new: true }
//     );

//     // 5️⃣ Email data body
//     const dataBody = {
//       TEACHER_NAME: teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
//       MONTH: month,
//       TEACHER_ID: teacher._id.toString(),
//       BASE_SALARY: `₹${totalSalary.toFixed(2)}`,
//       WORKING_DAYS: totalWorkingDays,
//       LEAVES: totalLeaves,
//       PER_DAY_SALARY: `₹${perDaySalary.toFixed(2)}`,
//       DEDUCTIONS: `₹${leaveDeductions.toFixed(2)}`,
//       FINAL_SALARY: `₹${finalSalary.toFixed(2)}`,
//       STATUS: 'Paid',
//       LOGIN_URL: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/teacher/login`,
//     };

//     const isMailSent = await sendEmail('salary-paid', dataBody);
//     if (!isMailSent) return { success: false, message: 'EMAIL_NOT_SENT' };

//     // ✅ 6️⃣ Generate Invoice PDF using Puppeteer
//     const fileName = `invoice_${teacher._id}_${month.replace(/\s+/g, "_")}.pdf`;
//     const pdfPath = await generateInvoicePDF(dataBody, fileName);

//     // Optionally save path in DB
//     salaryRecord.invoicePath = pdfPath;
//     await salaryRecord.save();

//     return {
//       success: true,
//       message: 'Salary and invoice generated successfully',
//       data: salaryRecord,
//       invoicePath: pdfPath, // return for frontend use
//     };
//   },


  generateSalary : async ({ teacherId, month, leaves = 0 }) => {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return { success : false, message : "TEACHER_ID_NOT_VALID"}
  }

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return { success : false, message : "TEACHER_NOT_FOUND"}
  }

  const salaryInfo = teacher.salaryInfo || {};
  const basic = salaryInfo.basic || 0;
  const allowances = salaryInfo.allowances || 0;
  const deductions = salaryInfo.deductions || 0;

  const totalSalary = basic + allowances - deductions;
  const totalWorkingDays = teacher.totalWorkingDays || 30;
  const perDaySalary = totalSalary / totalWorkingDays;
  const leaveDeductions = perDaySalary * leaves;
  const finalSalary = totalSalary - leaveDeductions;

  // Save in Salary collection
  const salaryRecord = await Salary.findOneAndUpdate(
    { teacherId, month },
    {
      $set: {
        baseSalary: totalSalary,
        perDaySalary,
        totalLeaves: leaves,
        totalDeductions: leaveDeductions,
        finalSalary,
        status: 'Paid',
      },
    },
    { upsert: true, new: true }
  );

  // Data for invoice
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
    LOGIN_URL: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/teacher/login`,
  };

  // 1️⃣ Generate PDF invoice
   const invoicePath = await generateInvoice(dataBody);

    // 4️⃣ Save invoice path in salary record
    salaryRecord.invoicePath = invoicePath;
    await salaryRecord.save();

    // 5️⃣ Optional: Send email
    await sendEmail('salary-paid', dataBody);

    return salaryRecord;
},

getAllSalaries: async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    // Fetch salary records with pagination
    const salaryRecords = await Salary.find().skip(skip).limit(limit);

    // Total count for pagination
    const total = await Salary.countDocuments();

    // Populate teacher info using for...of
    const result = [];
    for (const salary of salaryRecords) {
      const teacher = await Teacher.findById(salary.teacherId);
      result.push({
        TEACHER_NAME: teacher?.name || `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim(),
        MONTH: salary.month,
        TEACHER_ID: salary.teacherId.toString(),
        BASE_SALARY: `₹${salary.baseSalary.toFixed(2)}`,
        WORKING_DAYS: salary.totalWorkingDays,
        LEAVES: salary.totalLeaves,
        PER_DAY_SALARY: `₹${salary.perDaySalary.toFixed(2)}`,
        DEDUCTIONS: `₹${salary.totalDeductions.toFixed(2)}`,
        FINAL_SALARY: `₹${salary.finalSalary.toFixed(2)}`,
        STATUS: salary.status,
        LOGIN_URL: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/teacher/login`
      });
    }

    return {
      total,
      page,
      limit,
      salaries: result
    };
  }
}

