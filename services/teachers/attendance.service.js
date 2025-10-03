// const Student = require('../../models/class.schema');
const mongoose = require('mongoose')
const Attendance = require('../../models/students/attendance.schema') // Yeh line add karni hogi
const getStudentsAttandance = require('../../models/students/studentEnrollment.schema')
const { getPaginationArray } = require('../../helpers/helper')
module.exports = {
  getStudentsByClass: async (classId, page = 1, limit = 10) => {
    try {
      if (!classId) {
        return { success: false, message: 'CLASS_ID_REQUIRED', results: [] }
      }
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return { success: false, message: 'INVALID_CLASS_ID', results: [] }
      }
      const classObjectId = new mongoose.Types.ObjectId(classId)
      const pipeline = [
        { $match: { class: classObjectId } },
        { $sort: { _id: -1 } }, // optional, same as updatedAt in deletedTeachers
        ...getPaginationArray(page, limit)
      ]
      const result = await getStudentsAttandance.aggregate(pipeline)
      return result
    } catch (error) {
      console.error('Service Error:', error.message)
      return { success: false, message: 'SERVER_ERROR', results: [] }
    }
  },
  // markOrUpdateAttendance: async (classId, date, session, records, takenBy) => {
  //   const startOfDay = new Date(date)
  //   startOfDay.setHours(0, 0, 0, 0)
  //   const endOfDay = new Date(date)
  //   endOfDay.setHours(23, 59, 59, 999)

  //   let attendanceRecord = await Attendance.findOne({
  //     class: classId,
  //     date: { $gte: startOfDay, $lte: endOfDay },
  //     session: session
  //   })

  //   if (!attendanceRecord) {
  //     attendanceRecord = new Attendance({
  //       class: classId,
  //       date: startOfDay,
  //       session: session,
  //       records: records,
  //       takenBy: takenBy
  //     })
  //   } else {
  //     // Update existing records or add new
  //     records.forEach((newRecord) => {
  //       const index = attendanceRecord.records.findIndex(
  //         (r) => r.student.toString() === newRecord.student
  //       )
  //       if (index !== -1) {
  //         attendanceRecord.records[index].status = newRecord.status
  //         attendanceRecord.records[index].remarks =
  //           newRecord.remarks || attendanceRecord.records[index].remarks
  //       } else {
  //         attendanceRecord.records.push(newRecord)
  //       }
  //     })
  //   }

  //   return await attendanceRecord.save()
  // }
  markOrUpdateAttendance: async (classId, date, session, records, takenBy) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let attendanceRecord = await Attendance.findOne({
      class: classId,
      date: { $gte: startOfDay, $lte: endOfDay },
      session: session
    });

    if (!attendanceRecord) {
      attendanceRecord = new Attendance({
        class: classId,
        date: startOfDay,
        session: session,
        records: records,
        takenBy: takenBy
      });
    } else {
      // Update existing records or add new
      records.forEach((newRecord) => {
        const index = attendanceRecord.records.findIndex(
          (r) => r.student.toString() === newRecord.student
        );
        if (index !== -1) {
          attendanceRecord.records[index].status = newRecord.status;
          attendanceRecord.records[index].remarks =
            newRecord.remarks || attendanceRecord.records[index].remarks;
        } else {
          attendanceRecord.records.push(newRecord);
        }
      });
    }

    const savedRecord = await attendanceRecord.save();
    return { success: true, message: "ATTENDANCE_MARKED_OR_UPDATED", results: savedRecord };

  } catch (error) {
    console.error("Service Error:", error.message);
    return { success: false, message: "SERVER_ERROR", results: [] };
  }
}

}

