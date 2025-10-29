const { sendEmail } = require('../../helpers/helper')
const Salary = require('../../models/admin/salary.schema')
const Teacher = require('../../models/teacher/teacher.schema')
const { generateInvoicePDF } = require('../../helpers/generateinvoice')
const generateInvoice = require('../../helpers/generateinvoice')
const { default: mongoose } = require('mongoose')

module.exports = {
 generateSalary: async ({ teacherId, month, leaves = 0 }) => {
  try {
    if (!teacherId || !month)
      throw new Error('teacherId and month are required')

    const teacher = await Teacher.findById(teacherId)
    if (!teacher) throw new Error('Teacher not found')

    const salaryInfo = teacher.salaryInfo || {}
    const basic = salaryInfo.basic || 0
    const allowances = salaryInfo.allowances || 0
    const deductions = salaryInfo.deductions || 0

    const totalSalary = basic + allowances - deductions
    const totalWorkingDays = teacher.totalWorkingDays || 30
    const perDaySalary = totalSalary / totalWorkingDays
    const leaveDeductions = perDaySalary * leaves
    const finalSalary = totalSalary - leaveDeductions

    const salaryRecord = await Salary.findOneAndUpdate(
      { teacherId, month },
      {
        $set: {
          baseSalary: totalSalary,
          perDaySalary,
          totalLeaves: leaves,
          totalDeductions: leaveDeductions,
          finalSalary,
          status: 'Paid'
        }
      },
      { upsert: true, new: true }
    )

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
      LOGIN_URL: `${
        process.env.FRONTEND_URL || 'https://yourapp.com'
      }/teacher/login`
    }

    const invoicePath = await generateInvoice(dataBody)
    salaryRecord.invoicePath = invoicePath
    await salaryRecord.save()
    await sendEmail('salary-paid', dataBody)

    return {
      success: true,
      message: 'SALARY_GENERATED_SUCCESSFULLY',
      doc: salaryRecord
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || 'SALARY_GENERATION_FAILED',
      doc: {}
    }
  }
}
,
getAllSalaries: async (page = 1, limit = 10, filters = {}) => {
    try {
      page = parseInt(page) || 1
      limit = parseInt(limit) || 10
      const skip = (page - 1) * limit

      const query = {}

      // ✅ Filter by Teacher ID
      if (filters.teacherId && mongoose.Types.ObjectId.isValid(filters.teacherId)) {
        query.teacherId = new mongoose.Types.ObjectId(filters.teacherId)
      }

      // ✅ Filter by month (case-insensitive)
      if (filters.month) {
        query.month = { $regex: new RegExp(filters.month, 'i') }
      }

      // ✅ Fetch salary records
      const salaryRecords = await Salary.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })

      const total = await Salary.countDocuments(query)
      const result = []

      // ✅ Join with teacher details
      for (const salary of salaryRecords) {
        const teacher = await Teacher.findById(salary.teacherId)

        result.push({
          TEACHER_NAME:
            teacher?.name ||
            `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim(),
          TEACHER_ID: salary.teacherId.toString(),
          MONTH: salary.month,
          BASE_SALARY: `₹${salary.baseSalary.toFixed(2)}`,
          WORKING_DAYS: salary.totalWorkingDays,
          LEAVES: salary.totalLeaves,
          PER_DAY_SALARY: `₹${salary.perDaySalary.toFixed(2)}`,
          DEDUCTIONS: `₹${salary.totalDeductions.toFixed(2)}`,
          FINAL_SALARY: `₹${salary.finalSalary.toFixed(2)}`,
          STATUS: salary.status,
          LOGIN_URL: `${
            process.env.FRONTEND_URL || 'https://yourapp.com'
          }/teacher/login`
        })
      }

      // ✅ Return structured data for controller
      return {
        success: true,
        message: 'SALARIES_FETCHED_SUCCESSFULLY',
        salaries: result,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
      console.error('Error in getAllSalaries:', error.message)
      return {
        success: false,
        message: error.message || 'SALARIES_FETCH_FAILED',
        salaries: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    }
  }
}
