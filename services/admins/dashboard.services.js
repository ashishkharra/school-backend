const { responseData } = require('../../helpers/responseData')
const { filterByDateRange } = require('../../helpers/helper')

// const Admin   = require('../../models/admin/admin.schema.js')
const Student = require('../../models/students/student.schema.js')
const Teacher = require('../../models/teacher/teacher.schema.js')
const Class   = require('../../models/class/class.schema.js')

module.exports = {
  dashboard: async (req, res) => {
    try {
      const { startDate, endDate } = req.query
      let condition = {
        isRemoved : 0
      }
      filterByDateRange(condition, startDate, endDate)

      const [
        totalNumberOfStudents,
        totalNumberOfTeachers,
        totalNumberOfClasses
      ] = await Promise.all([
        Student.countDocuments({ ...condition }),
        Teacher.countDocuments({ ...condition }),
        Class.countDocuments
      ]);

      // const totalEarnings = 0;
      // const totalNumberOfOrders = 0;

      const dashboardObj = {
        totalNumberOfStudents,
        totalNumberOfTeachers,
        totalNumberOfClasses
      }

      return res.json(responseData('GET_LIST', dashboardObj, req, true))
    } catch (err) {
      return res.json(responseData('ERROR_OCCUR', err.message, req, false))
    }
  },

  graphManager: async (req, res) => {
    try {
      const { month, year } = req.query
      console.log('month: year:', month, year);

      const dashboardObj = {
        userRegistrationGraph: {
          xAxis: Array.from({length:31}, (_,i)=>i+1),
          yAxis: [12,23,45,66,76,87,89,53,84,2,45,78,342,67,234,77,53,173,53,46,43,56,34]
        },
        orderManagerGraph: {
          xAxis: Array.from({length:31}, (_,i)=>i+1),
          yAxis: [12,23,45,66,76,87,89,53,67,2,45,78,852,67,234,77,53,173,53,46,43,56,34]
        },
        earningsInEuroGraph: {
          xAxis: Array.from({length:31}, (_,i)=>i+1),
          yAxis: [12,23,45,66,76,87,89,53,67,2,45,78,342,67,234,647,53,173,53,46,43,56,34]
        },
        earningsInGBPGraph: {
          xAxis: Array.from({length:31}, (_,i)=>i+1),
          yAxis: [12,23,369,66,76,87,89,53,67,2,45,78,342,67,234,77,53,173,53,46,43,56,34]
        }
      }
      return res.json(responseData('GET_LIST', dashboardObj, req, true))
    } catch (err) {
      return res.json(responseData('ERROR_OCCUR', err.message, req, false))
    }
  }
}
