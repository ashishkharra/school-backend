const {
  getAttendanceLookup
} = require('../../helpers/commonAggregationPipeline')
const Attendance = require('../../models/students/attendance.schema') // Yeh line add karni hogi
const Enrollment = require('../../models/students/studentEnrollment.schema')
const mongoose = require('mongoose')
const getIndiaTimeString = () => {
  const date = new Date();
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const indiaOffset = 5.5 * 60 * 60000; // IST = UTC + 5:30
  const indiaDate = new Date(utc + indiaOffset);

  const yyyy = indiaDate.getFullYear();
  const mm = String(indiaDate.getMonth() + 1).padStart(2, '0');
  const dd = String(indiaDate.getDate()).padStart(2, '0');
  const hh = String(indiaDate.getHours()).padStart(2, '0');
  const min = String(indiaDate.getMinutes()).padStart(2, '0');
  const ss = String(indiaDate.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};
module.exports = {
markOrUpdateAttendance: async ({ classId, session, takenBy, records }) => {
    try {
      // Step 1: Get today's date in IST (without time)
      const now = new Date()
      const istDate = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      )
      const dateString = istDate.toISOString().split('T')[0] // "YYYY-MM-DD"

      // Step 2: Check if attendance already exists for this class + date + session
      let attendanceRecord = await Attendance.findOne({
        class: classId,
        date: dateString,
        session
      })

      const enrolledStudents = await Enrollment.find({ class: classId })
      const validStudents = enrolledStudents.filter((e) => e.student)

      if (validStudents.length === 0) {
        return { success: false, message: 'NO_VALID_STUDENTS', results: [] }
      }

      if (!attendanceRecord) {
        // Step 3a: Create new attendance
        const newRecords = validStudents.map((e) => ({
          student: e.student._id,
          status: 'Pending',
          remarks: ''
        }))

        if (records && Array.isArray(records)) {
          records.forEach((r) => {
            if (r.status === '') throw new Error('EMPTY_STATUS_NOT_ALLOWED')
            const index = newRecords.findIndex(
              (nr) => nr.student.toString() === r.student
            )
            if (index !== -1) {
              newRecords[index].status = r.status
              newRecords[index].remarks = r.remarks || ''
            }
          })
        }

        attendanceRecord = new Attendance({
          class: classId,
          date: dateString,
          session,
          takenBy,
          records: newRecords
        })

        await attendanceRecord.save()
      } else {
        // Step 3b: Update existing attendance
        if (records && Array.isArray(records)) {
          records.forEach((r) => {
            if (r.status === '') throw new Error('EMPTY_STATUS_NOT_ALLOWED')
            const index = attendanceRecord.records.findIndex(
              (rec) => rec.student._id.toString() === r.student
            )
            if (index !== -1) {
              attendanceRecord.records[index].status = r.status
              attendanceRecord.records[index].remarks =
                r.remarks || attendanceRecord.records[index].remarks
            }
          })
          await attendanceRecord.save()
        }
      }

      return {
        success: true,
        message: 'ATTENDANCE_FETCHED_OR_UPDATED',
        results: attendanceRecord
      }
    } catch (error) {
      return { success: false, message: 'SERVER_ERROR', results: [] }
    }
  }
,

  updateAttendanceById: async ({ attendanceId, records }) => {
    try {
      let attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        return { success: false, message: 'ATTENDANCE_NOT_FOUND', results: {} };
      }

      records.forEach((record) => {
        const index = attendance.records.findIndex(
          (rec) => rec.student.toString() === record.student
        );
        if (index !== -1) {
          attendance.records[index].status = record.status;
          attendance.records[index].remarks = record.remarks || '';
        }
      });

      attendance.date = getIndiaTimeString();
      await attendance.save();

      attendance = await Attendance.findById(attendanceId)
      
      return {
        success: true,
        message: 'ATTENDANCE_UPDATED_SUCCESSFULLY',
        results: attendance
      };
    } catch (error) {
      return { success: false, message: 'SERVER_ERROR', results: {} };
    }
  },


getAttendanceData: async (date, month, page = 1, limit = 10, teacherId, classId) => {
  try {
    const matchQuery = {};

    // Filter by exact date
    if (date) {
      const d = new Date(date);
      const utc = d.getTime() + d.getTimezoneOffset() * 60000;
      const indiaOffset = 5.5 * 60 * 60000;
      const istDate = new Date(utc + indiaOffset);
      const yyyy = istDate.getFullYear();
      const mm = String(istDate.getMonth() + 1).padStart(2, '0');
      const dd = String(istDate.getDate()).padStart(2, '0');
      matchQuery.date = { $regex: `^${yyyy}-${mm}-${dd}` };
    }

    // Filter by month (YYYY-MM)
    if (month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return { success: false, message: 'INVALID_MONTH_FORMAT', results: {} };
      }
      matchQuery.date = { $regex: `^${month}` };
    }

    // Filter by classId if provided
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return { success: false, message: 'INVALID_CLASS_ID', results: {} };
      }
      matchQuery.class = new mongoose.Types.ObjectId(classId);
    }

    const pipeline = getAttendanceLookup(matchQuery, teacherId, page, limit);
    const result = await Attendance.aggregate(pipeline);

    const totalDocs = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    return {
      success: true,
      results: {
        docs: result[0]?.docs || [],
        totalDocs,
        limit,
        page,
        totalPages
      }
    };
  } catch (error) {
    return { success: false, message: 'SERVER_ERROR', results: {} };
  }
},

deleteAttendance: async (attendanceId) => {
  try {
    if (!attendanceId || !mongoose.Types.ObjectId.isValid(attendanceId)) {
      return { success: false, message: 'INVALID_ATTENDANCE_ID', results: {} };
    }

    const deleted = await Attendance.findByIdAndDelete(attendanceId);

    if (!deleted) {
      return { success: false, message: 'ATTENDANCE_NOT_FOUND', results: {} };
    }

    return {
      success: true,
      message: 'ATTENDANCE_DELETED_SUCCESSFULLY',
      results: deleted
    };
  } catch (error) {
    return { success: false, message: 'SERVER_ERROR', results: {} };
  }
},

}
