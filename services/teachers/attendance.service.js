const {
  getAttendanceLookup,
  getAttendanceSummaryLookup,
  getTeacherStudentsLookup
} = require('../../helpers/commonAggregationPipeline')
const Attendance = require('../../models/students/attendance.schema') // Yeh line add karni hogi
const Enrollment = require('../../models/students/studentEnrollment.schema')
const Class = require("../../models/class/class.schema")
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
    const now = new Date();
    const istDate = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    const dateString = istDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Step 2: Check if attendance already exists for this class + date + session
    let attendanceRecord = await Attendance.findOne({
      class: classId,
      date: dateString,
      session
    });

    const enrolledStudents = await Enrollment.find({ class: classId });
    const validStudents = enrolledStudents.filter((e) => e.student);

    if (validStudents.length === 0) {
      return { success: false, message: 'NO_VALID_STUDENTS', results: [] };
    }

    // ✅ If attendance already exists → return "ALREADY_EXISTS"
    if (attendanceRecord) {
      return {
        success: false,
        message: 'ALREADY_EXISTS',
        results: attendanceRecord
      };
    }

    // Step 3: Create new attendance
    const newRecords = validStudents.map((e) => ({
      student: e.student._id,
      status: 'Pending',
      remarks: ''
    }));

    if (records && Array.isArray(records)) {
      records.forEach((r) => {
        if (r.status === '') throw new Error('EMPTY_STATUS_NOT_ALLOWED');
        const index = newRecords.findIndex(
          (nr) => nr.student.toString() === r.student
        );
        if (index !== -1) {
          newRecords[index].status = r.status;
          newRecords[index].remarks = r.remarks || '';
        }
      });
    }

    attendanceRecord = new Attendance({
      class: classId,
      date: dateString,
      session,
      takenBy,
      records: newRecords
    });

    await attendanceRecord.save();

    return {
      success: true,
      message: 'ATTENDANCE_CREATED',
      results: attendanceRecord
    };
  } catch (error) {
    console.error('Error in markOrUpdateAttendance:', error);
    return { success: false, message: 'SERVER_ERROR', results: [] };
  }
},

updateAttendanceById: async ({ attendanceId, records }) => {
  try {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return { success: false, message: 'ATTENDANCE_NOT_FOUND', results: {} };
    }

    // Update records in place without changing order
    records.forEach((record) => {
      const index = attendance.records.findIndex(
        (rec) => rec.student.toString() === record.student
      );
      if (index !== -1) {
        attendance.records[index].status = record.status;
        attendance.records[index].remarks = record.remarks || '';
      }
    });

    // Update date
      attendance.lastUpdatedAt = new Date();


    // Save
    await attendance.save();

    // Return the updated attendance object directly
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
    console.log(pipeline,"______pipeline")
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

getAttendanceSummary: async (date, month, teacherId, classId, studentId) => {
  try {
    // ✅ Validate inputs
    if (!teacherId && !classId && !studentId) {
      return { success: false, message: 'REQUIRED_PARAMETERS_MISSING', results: {} };
    }

    // ✅ Build pipeline
    const pipeline = getAttendanceSummaryLookup(date, month, teacherId, classId, studentId);
    const result = await Attendance.aggregate(pipeline);

    // ✅ Handle empty result
    if (!result || result.length === 0) {
      return {
        success: true,
        message: 'NO_ATTENDANCE_FOUND',
        results: { totalPresent: 0, totalAbsent: 0 }
      };
    }

    const { totalPresent, totalAbsent } = result[0];
    return {
      success: true,
      message: 'ATTENDANCE_SUMMARY_FETCHED_SUCCESSFULLY',
      results: { totalPresent, totalAbsent }
    };
  } catch (error) {
    console.error('Error in getAttendanceSummary:', error);
    return { success: false, message: 'SERVER_ERROR', results: {} };
  }
},
getStudentsByTeacherService : async (teacherId) => {
  try {
    const pipeline = getTeacherStudentsLookup(teacherId);
    const result = await Class.aggregate(pipeline);

    if (!result.length) {
      return { success: false, message: 'NO_STUDENTS_FOUND', results: [] };
    }

    return { success: true, message: 'STUDENTS_FETCHED_SUCCESS', results: result };
  } catch (error) {
    console.error('Error in getStudentsByTeacherService:', error);
    return { success: false, message: 'INTERNAL_SERVER_ERROR', error: error.message };
  }
},

}
