const { responseData } = require('../../helpers/responseData')
const salaryService = require('../../services/admins/teacher.salaryservice')
const  walletService = require("../../services/admins/admin.wallet.service")
module.exports = {
//  generateSalary: async (req, res) => {
//   try {
//      const adminId = req.user._id; 
//     const { teacherId, month, leaves } = req.body

//     if (!teacherId || !month) {
//       return res
//         .status(400)
//         .json(
//           responseData(
//             'INVALID_INPUT',
//             { error: 'teacherId and month are required' },
//             req,
//             false
//           )
//         )
//     }

//     const result = await salaryService.generateSalary({
//       teacherId,
//       month,
//       leaves
//     })

//     // 🔹 CHANGED: If generation failed, send clean failure response
//     if (!result.success) {
//       return res
//         .status(400)
//         .json(
//           responseData(
//             'SALARY_GENERATION_FAILED',
//             { error: result.message },
//             req,
//             false
//           )
//         )
//     }

//     // 🔹 CHANGED: Send only salary data, not entire result wrapper
//     return res.json(
//       responseData(
//         'SALARY_GENERATED_SUCCESSFULLY',
//         result.doc,
//         req,
//         true
//       )
//     )
//   } catch (error) {
//     return res
//       .status(500)
//       .json(
//         responseData(
//           'SALARY_GENERATION_FAILED',
//           { error: error.message },
//           req,
//           false
//         )
//       )
//   }
// }
// generateSalary : async (req, res) => {
//   try {
//     const adminId = req.user._id; 
//     const { teacherId, month, salaryAmount } = req.body;

//     // 1️⃣ Save salary record
//     const salary = await salaryService.generateSalary({
//       teacherId,
//       month,
//       amount: salaryAmount,
//       createdBy: adminId
//     });

//     // 2️⃣ Credit teacher wallet
//     const walletResponse = await walletService.creditWallet({
//       userId: teacherId,
//       role: "teacher",
//       amount: salaryAmount,
//       referenceId: salary._id,
//       createdBy: adminId, // ✅ passed giverId
//       description: `Salary for ${month}`
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Salary generated and wallet updated",
//       salary,
//       wallet: walletResponse
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Salary generation failed",
//       error: error.message
//     });
//   }
// }
generateSalary : async (req, res) => {
  try {
    const adminId = req.user?._id
    console.log("adminId-----",adminId)
    const { teacherId, month, leaves } = req.body;

    const response = await salaryService.generateSalary({
      teacherId,
      month,
      leaves,
      createdBy: adminId
    });

    if (!response.success) {
      return res.status(400).json({
        success: false,
        message: response.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Salary generated and wallet updated",
      data: response.data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Salary generation failed",
      error: error.message
    });
  }
}
,
//  getAllSalariesController: async (req, res) => {
//     try {
//       const { page = 1, limit = 10, teacherId, month } = req.query

//       const filters = {}
//       if (teacherId) filters.teacherId = teacherId
//       if (month) filters.month = month

//       const result = await salaryService.getAllSalaries(page, limit, filters)

//       if (!result.success) {
//         return res
//           .status(400)
//           .json(responseData('SALARIES_FETCH_FAILED', {}, req, false))
//       }
//       return res.status(200).json(
//         responseData(
//           'SALARIES_FETCHED_SUCCESSFULLY', 
//           {
//             salaries: result.salaries,
//             total: result.total,
//             page: result.page,
//             limit: result.limit,
//             totalPages: result.totalPages
//           },
//           req,
//           true
//         )
//       )
//     } catch (error) {
//       console.error('Error in getAllSalariesController:', error)
//       return res
//         .status(500)
//         .json(responseData('SERVER_ERROR', { error: error.message }, req, false))
//     }
//   }
// ,
getTeacherSalaryStatusController: async (req, res) => {
  try {
    const { month } = req.query;

    const result = await salaryService.getTeacherSalaryStatusService(month);

    if (!result.success) {
      return res
        .status(404)
        .json({ success: false, message: result.message, results: [] });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      results: result.results
    });
  } catch (error) {
    console.error("Error in getTeacherSalaryStatusController:", error);
    res.status(500).json({
      success: false,
      message: "INTERNAL_SERVER_ERROR",
      results: []
    });
  }
},
}
