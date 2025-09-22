
const Student = require('../../models/class.schema');  
// const Attendance = require('../../models/attendance.schema'); // Yeh line add karni hogi
// const {getPaginationArray} = require('../../helpers/helper');
module.exports = {
  getStudentsByClass: async (classId) => {
    console.log('Query ClassId:', classId);
    const students = await Student.find({ class: classId });
    console.log('Found Students:', students);
    return students;
  }

// getStudentsByClass: async (classId, page = 1, limit = 10) => {
//   console.log('Query ClassId:', classId, 'Page:', page, 'Limit:', limit);

//   let objectId;
//   try {
//     objectId = new mongoose.Types.ObjectId(classId);
//   } catch (error) {
//     console.error('Invalid classId ObjectId:', classId);
//     // Return empty result or throw error as per your preference
//     return {
//       docs: [],
//       totalDocs: 0,
//       limit,
//       page,
//       totalPages: 0
//     };
//   }

//   const pipeline = [
//     { $match: { classId: objectId, isActive: true } },
//     ...getPaginationArray(page, limit)
//   ];

//   const result = await Student.aggregate(pipeline);
// console.log("result",result)
//   if (result.length > 0) {
//     console.log('Paginated Result:', result[0]);
//     return result[0];
//   } else {
//     return {
//       docs: [],
//       totalDocs: 0,
//       limit,
//       page,
//       totalPages: 0
//     };
//   }
// },

// markOrUpdateAttendance: async (classId, date, session, records, takenBy) => {
//   const startOfDay = new Date(date);
//   startOfDay.setHours(0, 0, 0, 0);
//   const endOfDay = new Date(date);
//   endOfDay.setHours(23, 59, 59, 999);

//   let attendanceRecord = await Attendance.findOne({
//     class: classId,
//     date: { $gte: startOfDay, $lte: endOfDay },
//     session: session
//   });

//   if (!attendanceRecord) {
//     attendanceRecord = new Attendance({
//       class: classId,
//       date: startOfDay,
//       session: session,
//       records: records,
//       takenBy: takenBy
//     });
//   } else {
//     // Update existing records or add new
//     records.forEach(newRecord => {
//       const index = attendanceRecord.records.findIndex(r => r.student.toString() === newRecord.student);
//       if (index !== -1) {
//         attendanceRecord.records[index].status = newRecord.status;
//         attendanceRecord.records[index].remarks = newRecord.remarks || attendanceRecord.records[index].remarks;
//       } else {
//         attendanceRecord.records.push(newRecord);
//       }
//     });
//   }

//   return await attendanceRecord.save();
// }


};
