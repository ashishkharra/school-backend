const mongoose = require('mongoose');

const { responseData } = require('../../helpers/responseData')
const { filterByDateRange } = require('../../helpers/helper')
const Class = require('../../models/class/class.schema.js')
const Student = require('../../models/students/student.schema.js');
const Teacher = require('../../models/teacher/teacher.schema.js');
const Attendance = require('../../models/students/attendance.schema.js');
const Enrollment = require('../../models/students/studentEnrollment.schema.js')

const dashboardService = {
    dashboard: async (req, res) => {
        try {
            const { startDate, endDate } = req.query
            let condition = {
                isRemoved: 0,
                status: 'active'
            }
            console.log('ffffffff')
            filterByDateRange(condition, startDate, endDate)
            console.log('asdfdfdfadfad')

            const [
                totalNumberOfStudents,
                totalNumberOfTeachers,
                totalNumberOfClasses
            ] = await Promise.all([
                Student.countDocuments({ ...condition }),
                Teacher.countDocuments({ ...condition }),
                Class.countDocuments({ ...condition })
            ]);

            const dashboardObj = {
                totalNumberOfStudents,
                totalNumberOfTeachers,
                totalNumberOfClasses
            }

            return res.json(responseData('GET_LIST', dashboardObj, req, true))
        } catch (err) {
            return res.json(responseData('ERROR_OCCUR', { error: err.message }, req, false))
        }
    },

    getGraphData: async (req, res) => {
        try {
            const now = new Date();
            const currentYear = now.getFullYear();

            // Academic year: April to March
            let academicStart, academicEnd;
            if (now.getMonth() >= 3) {
                academicStart = new Date(currentYear, 3, 1);
                academicEnd = new Date(currentYear + 1, 2, 31, 23, 59, 59);
            } else {
                academicStart = new Date(currentYear - 1, 3, 1);
                academicEnd = new Date(currentYear, 2, 31, 23, 59, 59);
            }

            const months = [
                'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
                'Jan', 'Feb', 'Mar'
            ];

            // 1️⃣ Student Enrollment per month
            const enrollments = await Enrollment.aggregate([
                { $match: { createdAt: { $gte: academicStart, $lte: academicEnd } } },
                {
                    $group: {
                        _id: { month: { $month: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const monthMap = {};
            enrollments.forEach(e => {
                monthMap[e._id.month] = e.count;
            });

            const xAxis = months;
            const yAxis = months.map((month, index) => {
                let monthNumber = index < 9 ? index + 4 : index - 8; // Apr=4,...,Mar=3
                return monthMap[monthNumber] || 0;
            });

            // 2️⃣ Teacher count per specialization
            const teachers = await Teacher.aggregate([
                { $unwind: "$specialization" },
                { $group: { _id: "$specialization", count: { $sum: 1 } } },
                { $project: { _id: 0, name: "$_id", value: "$count" } }
            ]);

            // 3️⃣ Total Male/Female Students
            const genderCounts = await Enrollment.aggregate([
                {
                    $lookup: {
                        from: "students",
                        localField: "student",
                        foreignField: "_id",
                        as: "studentInfo"
                    }
                },
                { $unwind: "$studentInfo" },
                { $match: { "studentInfo.isRemoved": 0 } },
                { $group: { _id: "$studentInfo.gender", count: { $sum: 1 } } }
            ]);

            const genderStats = { male: 0, female: 0 };
            genderCounts.forEach(g => {
                if (g._id.toLowerCase() === 'male') genderStats.male = g.count;
                if (g._id.toLowerCase() === 'female') genderStats.female = g.count;
            });

            const students = { xAxis, yAxis };

            console.log("Dashboard Data:", { students, teachers, genderStats });

            return res.status(200).json(
                responseData(
                    'DASHBOARD_SUCCESSFULLY',
                    {
                        docs: {
                            students,
                            teachers,
                            genderStats
                        }
                    },
                    req,
                    true
                )
            );

        } catch (error) {
            console.error("Dashboard Service Error:", error);
            return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false));
        }
    }
};

module.exports = dashboardService;
