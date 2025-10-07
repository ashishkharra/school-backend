// const Student = require('../../models/class.schema');
const mongoose = require('mongoose')
const Attendance = require('../../models/students/attendance.schema') // Yeh line add karni hogi
const Enrollment = require('../../models/students/studentEnrollment.schema')
const { getPaginationArray } = require('../../helpers/helper')
const attendanceSchema = require('../../models/students/attendance.schema')
module.exports = {

  markOrUpdateAttendance: async ({ classId, date, session, takenBy, records }) => {
    console.log('0-------------',   classId, date, session, takenBy, records )
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      let attendanceRecord = await Attendance.findOne({
        class: classId,
        date: { $gte: startOfDay, $lte: endOfDay },
        session,
      });
   console.log('found attendanceRecord:', attendanceRecord);

  
      if (!attendanceRecord) {
        const enrolledStudents = await Enrollment.find({ class: classId });
console.log("enrolledStudents------>>>>>",enrolledStudents)
        const validStudents = enrolledStudents.filter((e) => e.student);

        if (validStudents.length === 0) {
          return { success: false, message: 'NO_VALID_STUDENTS', results: [] };
        }
     
       const newRecords = validStudents.map((e) => {
  const inputRecord = records.find(r => r.student === e.student.toString());
  return {
    student: e.student,
    status: inputRecord?.status || 'Pending',
    remarks: inputRecord?.remarks || '',
  };
});
        console.log("newRecords------",newRecords)
        if (records && Array.isArray(records)) {
          for (const r of records) {
            if (r.status === "") {
              return { success: false, message: 'EMPTY_STATUS_NOT_ALLOWED', results: [] };
            }
            const index = newRecords.findIndex((nr) => nr.student.toString() === r.student);
            if (index !== -1) {
              newRecords[index].status = r.status;
              newRecords[index].remarks = r.remarks || '';
            }
          }
        }

       let newAttendanceRecord = {
          class: classId,
          date: startOfDay,
          session,
          takenBy,
          records: newRecords,
        }
        console.log("attendanceRecord---------",newAttendanceRecord)

       let newRecord = await Attendance.create(newAttendanceRecord);
        console.log("NEW RECORD----->>>",newRecord)
        
        await newAttendanceRecord.populate({
          path: 'records.student',
          select: '_id name ',
        });
      } else {
        if (records && Array.isArray(records)) {
          for (const r of records) {
            if (r.status === "") {
              return { success: false, message: 'EMPTY_STATUS_NOT_ALLOWED', results: [] };
            }
            const index = attendanceRecord.records.findIndex(
              (rec) => rec.student._id.toString() === r.student
            );
            if (index !== -1) {
              attendanceRecord.records[index].status = r.status;
              attendanceRecord.records[index].remarks = r.remarks || attendanceRecord.records[index].remarks;
            }
          }
          await attendanceRecord.save();
          await attendanceRecord.populate({
            path: 'records.student',
            select: '_id name rollNo',
          });
        }
      }

      return { success: true, message: 'ATTENDANCE_FETCHED_OR_UPDATED', results: attendanceRecord };
    } catch (error) {
      console.log(error,"ERROR IS---->>",error.message)
      return { success: false, message: 'SERVER_ERROR', results: [] };
    }
  },

  updateAttendance: async ({ classId, date, session, records }) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let attendance = await Attendance.findOne({
      class: classId,
      date: { $gte: startOfDay, $lte: endOfDay },
      session,
    });

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    const enrollments = await Enrollment.find({ class: classId });
    const enrolledStudents = enrollments.map((e) => e.student._id.toString());

    records.forEach((record) => {
      if (!enrolledStudents.includes(record.student)) {
        throw new Error(`Student ${record.student} is not enrolled in this class`);
      }
      if (!record.status || record.status.trim() === '') {
        throw new Error('Attendance status cannot be empty');
      }
    });
    records.forEach((record) => {
      const index = attendance.records.findIndex(
        (rec) => rec.student.toString() === record.student
      );
      if (index !== -1) {
        attendance.records[index].status = record.status;
        attendance.records[index].remarks = record.remarks || '';
      }
    });
    await attendance.save();
    return attendance;
  },

  getAttendanceData: async (date) => {
    try {
      let query = {};
      if (date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate)) {
          throw new Error('Invalid date format');
        }

        const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

        query.date = { $gte: startOfDay, $lte: endOfDay };
      }

       const attendanceRecords = await Attendance.find(query)
  
      if (!attendanceRecords.length) {
        throw new Error('No attendance records found');
      }

      return attendanceRecords;
    } catch (error) {
      throw new Error(error.message || 'Server error');
    }
  },


  deleteAttendance: async (classId, date, session) => {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const deleted = await Attendance.findOneAndDelete({
        class: classId,
        date: { $gte: startOfDay, $lte: endOfDay },
        session: session
      });

      if (!deleted) {
        return { success: false, message: "ATTENDANCE_NOT_FOUND", data: {} };
      }

      return { success: true, message: "ATTENDANCE_DELETED_SUCCESSFULLY", data: deleted };
    } catch (error) {
      return { success: false, message: "SERVER_ERROR", data: {} };
    }
  }

}

