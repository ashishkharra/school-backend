const { responseData } = require('../../helpers/responseData')
const salaryService = require('../../services/admins/teacher.salaryservice')

module.exports = {
 generateSalary: async (req, res) => {
  try {
    const { teacherId, month, leaves } = req.body

    if (!teacherId || !month) {
      return res
        .status(400)
        .json(
          responseData(
            'INVALID_INPUT',
            { error: 'teacherId and month are required' },
            req,
            false
          )
        )
    }

    const result = await salaryService.generateSalary({
      teacherId,
      month,
      leaves
    })

    // 🔹 CHANGED: If generation failed, send clean failure response
    if (!result.success) {
      return res
        .status(400)
        .json(
          responseData(
            'SALARY_GENERATION_FAILED',
            { error: result.message },
            req,
            false
          )
        )
    }

    // 🔹 CHANGED: Send only salary data, not entire result wrapper
    return res.json(
      responseData(
        'SALARY_GENERATED_SUCCESSFULLY',
        result.doc,
        req,
        true
      )
    )
  } catch (error) {
    return res
      .status(500)
      .json(
        responseData(
          'SALARY_GENERATION_FAILED',
          { error: error.message },
          req,
          false
        )
      )
  }
}
,
 getAllSalariesController: async (req, res) => {
    try {
      const { page = 1, limit = 10, teacherId, month } = req.query

      const filters = {}
      if (teacherId) filters.teacherId = teacherId
      if (month) filters.month = month

      const result = await salaryService.getAllSalaries(page, limit, filters)

      // 🟢 FIX START — corrected success message
      if (!result.success) {
        return res
          .status(400)
          .json(responseData('SALARIES_FETCH_FAILED', {}, req, false))
      }

      // 🟢 FIXED: previously "salary fetched failed"
      return res.status(200).json(
        responseData(
          'SALARIES_FETCHED_SUCCESSFULLY', // ✅ correct success message
          {
            salaries: result.salaries,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
          },
          req,
          true
        )
      )
      // 🟢 FIX END
    } catch (error) {
      console.error('Error in getAllSalariesController:', error)
      return res
        .status(500)
        .json(responseData('SERVER_ERROR', { error: error.message }, req, false))
    }
  }

}
