const { responseData } = require('../../helpers/responseData')
const { filterByDateRange } = require('../../helpers/helper')

const Admin = require('../../models/admin/admin.schema.js')
const Student = require('../../models/students/student.schema.js')
const Teacher = require('../../models/teacher/teacher.schema.js')
const Class = require('../../models/class/class.schema.js')
const Enrollment = require('../../models/students/studentEnrollment.schema.js')
const TeacherAttendance = require('../../models/teacher/teacherAttendance.schema.js')

module.exports = {
  dashboard: async (req, res) => {
    try {
      const condition = { isRemoved: 0 };

      const [totalNumberOfStudents, totalNumberOfTeachers, totalNumberOfClasses] = await Promise.all([
        Student.countDocuments({ ...condition }),
        Teacher.countDocuments({ ...condition }),
        Class.countDocuments({ ...condition })
      ]);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const teachersPresentToday = await TeacherAttendance.countDocuments({
        date: { $gte: todayStart, $lte: todayEnd },
        status: "Present"
      });

      const percentageTeachersPresentToday = Math.floor((totalNumberOfTeachers > 0
        ? ((teachersPresentToday / totalNumberOfTeachers) * 100).toFixed(2)
        : 0))

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const totalDays = monthEnd.getDate();

      const attendanceThisMonth = await TeacherAttendance.aggregate([
        {
          $match: {
            date: { $gte: monthStart, $lte: monthEnd },
            status: "Present"
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: "$date" },
            presentCount: { $sum: 1 }
          }
        }
      ]);

      const dailyAttendance = Array.from({ length: totalDays }, (_, i) => {
        const found = attendanceThisMonth.find(a => a._id === i + 1);
        return found ? found.presentCount : 0;
      });

      const teachersBySubject = await Teacher.aggregate([
        { $unwind: "$specialization" },
        { $group: { _id: "$specialization", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", value: "$count" } }
      ]);

      const studentGenderCounts = await Student.aggregate([
        { $match: { isRemoved: 0 } },
        { $group: { _id: "$gender", count: { $sum: 1 } } }
      ]);

      const teacherGenderCounts = await Teacher.aggregate([
        { $match: { isRemoved: 0 } },
        { $group: { _id: "$gender", count: { $sum: 1 } } }
      ]);

      const genderStats = { male: 0, female: 0 };

      studentGenderCounts.forEach(g => {
        if (g._id?.toLowerCase() === "male") genderStats.male += g.count;
        if (g._id?.toLowerCase() === "female") genderStats.female += g.count;
      });

      teacherGenderCounts.forEach(g => {
        if (g._id?.toLowerCase() === "male") genderStats.male += g.count;
        if (g._id?.toLowerCase() === "female") genderStats.female += g.count;
      });

      const dashboardObj = {
        totalNumberOfStudents,
        totalNumberOfTeachers,
        totalNumberOfClasses,
        teachersPresentToday,
        percentageTeachersPresentToday: Number(percentageTeachersPresentToday),
        dailyTeacherAttendance: {
          xAxis: Array.from({ length: totalDays }, (_, i) => i + 1),
          yAxis: dailyAttendance
        },
        teachersBySubject,
        genderStats
      };

      return res.json(responseData("DASHBOARD_SUCCESSFULLY", dashboardObj, req, true));
    } catch (err) {
      console.error("Dashboard Service Error:", err);
      return res.json(responseData("ERROR_OCCUR", { error: err.message }, req, false));
    }
  }
}
