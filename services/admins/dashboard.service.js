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

            const enrollments = await Enrollment.aggregate([
                {
                    $match: {
                        createdAt: { $gte: academicStart, $lte: academicEnd }
                    }
                },
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
                let monthNumber;
                if (index < 9) {
                    monthNumber = index + 4;
                } else {
                    monthNumber = index - 8;
                }
                return monthMap[monthNumber] || 0;
            });

            const teachers = await Teacher.aggregate([
                { $unwind: "$specialization" }, // flatten specialization array
                {
                    $group: {
                        _id: "$specialization", // group by each subject
                        count: { $sum: 1 }      // count teachers per subject
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id",   // rename to "name"
                        value: "$count" // rename count to value
                    }
                }
            ]);

            console.log('-----------------', teacherGraphData);

            const students = { xAxis, yAxis }

            console.log('xAxis:', xAxis);
            console.log('yAxis:', yAxis);
            return res.status(200).json(
                responseData(
                    'DASHBOARD_SUCCESSFULLY',
                    {
                        docs: {
                            students,
                            teachers
                        }
                    },
                    req,
                    true
                )
            );


        } catch (error) {
            console.error("Dashboard Service Error:", error);
            return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
        }
    }
};

module.exports = dashboardService;
