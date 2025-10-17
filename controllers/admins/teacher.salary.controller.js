

const { responseData } = require('../../helpers/responseData')
const salaryService = require('../../services/admins/teacher.salaryservice');

module.exports = {
 

 
//  generateSalary: async (req, res) => {
//     try {
//       const { teacherId, month, leaves } = req.body;

//       if (!teacherId || !month) {
//         return res.status(400).json({
//           success: false,
//           message: 'teacherId and month are required'
//         });
//       }

//       const salary = await salaryService.generateSalary({ teacherId, month, leaves });

//       res.status(200).json({
//         success: true,
//         message: 'Salary generated successfully',
//         data: salary
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message
//       });
//     }
//   }
// ,
//    getTeahcerSalary: async (req, res) => {
//     try {
//       const { page, limit } = req.query;

//       const salariesData = await salaryService.getAllSalaries(
//         parseInt(page) || 1,
//         parseInt(limit) || 10
//       );
//       res.status(200).json({
//         success: true,
//         message: 'Salaries fetched successfully',
//         data: {
//           salaries: salariesData.salaries,
//           total: salariesData.total,
//           page: salariesData.page,
//           limit: salariesData.limit
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message
//       });
//     }
//   }

generateSalary : async (req, res) => {
  try {
    const { teacherId, month, leaves } = req.body;

    if (!teacherId || !month) {
      return res.status(400).json(
        responseData(
          'INVALID_INPUT',
          { error: 'teacherId and month are required' },
          req,
          false
        )
      );
    }

    const result = await salaryService.generateSalary({ teacherId, month, leaves });

    return res.json(
      responseData(
        'SALARY_GENERATED_SUCCESSFULLY',
        result,
        req,
        true
      )
    );
  } catch (error) {
    return res.status(400).json(
      responseData(
        'SALARY_GENERATION_FAILED',
        { error: error.message },
        req,
        false
      )
    );
  }
},
getTeahcerSalary: async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const salariesData = await salaryService.getAllSalaries(
      parseInt(page),
      parseInt(limit)
    );

    return res.json(
      responseData(
        'SALARIES_FETCHED_SUCCESSFULLY',
        {
          salaries: salariesData.salaries,
          total: salariesData.total,
          page: salariesData.page,
          limit: salariesData.limit
        },
        req,
        true
      )
    );
  } catch (error) {
    return res
      .status(400)
      .json(
        responseData(
          'FETCH_SALARIES_FAILED',
          { error: error.message },
          req,
          false
        )
      );
  }
},

};



