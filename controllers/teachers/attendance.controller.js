
const attendanceService = require('../../services/teachers/attendance.service');
const { responseData } = require('../../helpers/responseData'); // Assume you have this utility for consistent responses

module.exports = {
  getStudentsByClass: async (req, res) => {
    try {
      const classId = req.params.classId;
      console.log("classid", classId);
      const students = await attendanceService.getStudentsByClass(classId);
      console.log("styy", students);
      res.json(responseData('STUDENTS_FETCHED', students, req, true));
    } catch (error) {
      res.status(500).json(responseData('ERROR_OCCUR', error.message, req, false));
    }
  }

// getStudentsByClass: async (req, res) => {
//   try {
//     const classId = req.params.classId;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

    
//     console.log("classid", classId, "page", page, "limit", limit);

//     // Pass page and limit directly (not skip)
//     const students = await attendanceService.getStudentsByClass(classId, page, limit);

//     console.log("styy", students);
//     res.json(responseData('STUDENTS_FETCHED', students, req, true));
//   } catch (error) {
//     res.status(500).json(responseData('ERROR_OCCUR', error.message, req, false));
//   }
// },
//  markAttendance: async (req, res) => {
//   try {
//     // Use consistent field names matching schema
//     const { class: classId, date, session, records, takenBy } = req.body;
//     console.log("Received request body:", req.body);

//     // Basic validation
//     if (!classId || !date || !session || !records || !Array.isArray(records) || records.length === 0 || !takenBy) {
//       console.log('Validation failed: Missing or invalid fields');
//       return res.status(400).json({ message: 'Invalid input data' });
//     }

//     // Date validation
//     const parsedDate = new Date(date);
//     if (isNaN(parsedDate.getTime())) {
//       console.log('Invalid date format detected');
//       return res.status(400).json({ message: 'Invalid date format' });
//     }

//     // Session validation (optional but recommended)
//     if (![1, 2, 3].includes(session)) {
//       return res.status(400).json({ message: 'Invalid session value' });
//     }

//     const savedRecord = await attendanceService.markOrUpdateAttendance(
//       classId,
//       parsedDate,
//       session,
//       records,
//       takenBy
//     );

//     console.log('Saved attendance record:', savedRecord);
//     return res.status(200).json({ message: 'Attendance marked or updated successfully', data: savedRecord });

//   } catch (error) {
//     console.error('Error while marking/updating attendance:', error);
//     return res.status(500).json({ message: 'Internal Server Error' });
//   }
// }

}

