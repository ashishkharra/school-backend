const Attendance = require('../../models/students/attendance.schema');
const Enrollment = require('../../models/students/studentEnrollment.schema');
const { getAttendanceLookup } = require('../../helpers/commonAggregationPipeline');

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
  // MARK OR UPDATE ATTENDANCE (already exists)
  markOrUpdateAttendance: async ({ classId, session, takenBy, records }) => {
    try {
      const now = new Date();
      const istDate = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const dateString = istDate.toISOString().split('T')[0];

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

      if (!attendanceRecord) {
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
      } else {
        if (records && Array.isArray(records)) {
          records.forEach((r) => {
            if (r.status === '') throw new Error('EMPTY_STATUS_NOT_ALLOWED');
            const index = attendanceRecord.records.findIndex(
              (rec) => rec.student._id.toString() === r.student
            );
            if (index !== -1) {
              attendanceRecord.records[index].status = r.status;
              attendanceRecord.records[index].remarks =
                r.remarks || attendanceRecord.records[index].remarks;
            }
          });
          await attendanceRecord.save();
        }
      }

      return {
        success: true,
        message: 'ATTENDANCE_FETCHED_OR_UPDATED',
        results: attendanceRecord
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'SERVER_ERROR', results: [] };
    }
  },

  // UPDATE ATTENDANCE BY ID
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
        .populate([
          { path: 'records.student', select: '_id name rollNo' },
          { path: 'takenBy', select: '_id name email' },
          { path: 'class', select: '_id section' }
        ]);

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

  // GET ATTENDANCE DATA
  getAttendanceData: async (date, page = 1, limit = 10) => {
    try {
      const matchQuery = {};

      if (date) {
        const d = new Date(date);
        const utc = d.getTime() + d.getTimezoneOffset() * 60000;
        const indiaOffset = 5.5 * 60 * 60000;
        const istDate = new Date(utc + indiaOffset);

        const yyyy = istDate.getFullYear();
        const mm = String(istDate.getMonth() + 1).padStart(2, '0');
        const dd = String(istDate.getDate()).padStart(2, '0');

        const dateString = `${yyyy}-${mm}-${dd}`;
        matchQuery.date = { $regex: `^${dateString}` };
      }

      const pipeline = getAttendanceLookup(matchQuery, page, limit);
      const result = await Attendance.aggregate(pipeline);

      const totalDocs = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalDocs / limit);

      return {
        success: true,
        message: totalDocs > 0 ? 'ATTENDANCE_RECORDS_FETCHED_SUCCESSFULLY' : 'NO_ATTENDANCE_RECORDS_FOUND',
        results: {
          docs: result[0].docs || [],
          totalDocs,
          limit,
          page,
          totalPages
        }
      };
    } catch (error) {
      console.error('getAttendanceData Error:', error);
      return { success: false, message: 'SERVER_ERROR', results: {} };
    }
  },

  // DELETE ATTENDANCE BY ID
  deleteAttendance: async (attendanceId) => {
    try {
      if (!attendanceId) {
        return { success: false, message: 'MISSING_ATTENDANCE_ID', results: {} };
      }

      const deleted = await Attendance.findByIdAndDelete(attendanceId);

      if (!deleted) {
        return { success: false, message: 'ATTENDANCE_NOT_FOUND', results: {} };
      }

      return { success: true, message: 'ATTENDANCE_DELETED_SUCCESSFULLY', results: deleted };
    } catch (error) {
      console.error('deleteAttendance Error:', error);
      return { success: false, message: 'SERVER_ERROR', results: {} };
    }
  }
};
