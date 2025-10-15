const {
  getAttendanceLookup
} = require('../../helpers/commonAggregationPipeline')
const Attendance = require('../../models/students/attendance.schema') // Yeh line add karni hogi
const Enrollment = require('../../models/students/studentEnrollment.schema')
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
      console.error(error)
      return { success: false, message: 'SERVER_ERROR', results: [] }
    }
  }
,
  // UPDATE ATTENDANCE BY ID
  // updateAttendanceById: async ({ attendanceId, records }) => {
  //   console.log(attendanceId, records)
  //   try {
  //     let attendance = await Attendance.findById(attendanceId);
  //     console.log("attendance",attendance)
  //     if (!attendance) return null;

  //     records.forEach((record) => {
  //       const index = attendance.records.findIndex(
  //         rec => rec.student.toString() === record.student
  //       );
  //       if (index !== -1) {
  //         attendance.records[index].status = record.status;
  //         attendance.records[index].remarks = record.remarks || '';
  //       }
  //     });

  //     // Update date to current IST
  //     attendance.date = getIndiaTimeString();

  //     await attendance.save();

  //     attendance = await Attendance.findById(attendanceId)
  //     console.log("-----------", attendance)
  //       .populate([
  //         { path: 'records.student', select: '_id ' },
  //         { path: 'takenBy', select: '_id name email' },
  //         { path: 'class', select: '_id section' }
  //       ]);

  //     return attendance;
  //   } catch (error) {
  //     console.error("updateAttendanceById Error:", error);
  //     throw error;
  //   }
  // },


  updateAttendanceById: async ({ attendanceId, records }) => {
    try {
      let attendance = await Attendance.findById(attendanceId);
      console.log("Current Attendance Record:", attendance); // Debug log
      if (!attendance) {
        return { success: false, message: 'ATTENDANCE_NOT_FOUND', results: {} };
      }

      records.forEach((record) => {
        const index = attendance.records.findIndex(
          (rec) => rec.student.toString() === record.student
        );
// Debug log
        if (index !== -1) {
          attendance.records[index].status = record.status;
          attendance.records[index].remarks = record.remarks || '';
        }
      });

      attendance.date = getIndiaTimeString();
      // console.log("Updated Attendance Record before save:", attendance); // Debug log
      await attendance.save();

      attendance = await Attendance.findById(attendanceId)
      
      return {
        success: true,
        message: 'ATTENDANCE_UPDATED_SUCCESSFULLY',
        results: attendance
      };
    } catch (error) {
      console.error('updateAttendanceById Error:', error);
      return { success: false, message: 'SERVER_ERROR', results: {} };
    }
  },

 getAttendanceData: async (date, month,page = 1, limit = 10) => {
  try {
    const matchQuery = {};

    if (date) {
      // Convert to YYYY-MM-DD for regex match
      const d = new Date(date);
      const utc = d.getTime() + d.getTimezoneOffset() * 60000;
      const indiaOffset = 5.5 * 60 * 60000;
      const istDate = new Date(utc + indiaOffset);

      const yyyy = istDate.getFullYear();
      const mm = String(istDate.getMonth() + 1).padStart(2, '0');
      const dd = String(istDate.getDate()).padStart(2, '0');

      const dateString = `${yyyy}-${mm}-${dd}`;

      // Use regex to match date ignoring time
      matchQuery.date = { $regex: `^${dateString}` };
    }

    if (month) {
      // e.g. month = "2025-10"
      // Validate month format
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw new Error('Invalid month format. Use YYYY-MM.');
      }

      matchQuery.date = { $regex: `^${month}` };
      console.log(matchQuery )
    }


    const pipeline = getAttendanceLookup(matchQuery, page, limit);
    console.log('pipeline----', pipeline);

    const result = await Attendance.aggregate(pipeline);
    console.log(result, "result");

    const totalDocs = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    return {
      success: true,
      results: {
        docs: result[0].docs || [],
        totalDocs,
        limit,
        page,
        totalPages
      }
    };
  } catch (error) {
    throw new Error(error.message || 'Server error');
  }
},
   deleteAttendance: async (attendanceId) => {
    try {
      if (!attendanceId) {
        return null;
      }

      const deleted = await Attendance.findByIdAndDelete(attendanceId);

      return deleted; // returns null if not found
    } catch (error) {
      console.error('deleteAttendance Error:', error);
      throw error;
    }
  },
}
