
const attendanceService = require('../../services/teachers/attendance.service');
const { responseData } = require('../../helpers/responseData'); // Assume you have this utility for consistent responses
const Attendance = require('../../models/students/attendance.schema');
const e = require('express');

module.exports = {
 


  markOrUpdateAttendance:async (req, res) => {
  try {
    const { classId,date, session, takenBy, records } = req.body;
    console.log('req.body;',req.body)
      if (!classId || !session || !date || !takenBy || !records) {
      return res
        .status(400)
        .json(responseData('MISSING_REQUIRED_FIELDS', {}, req, false));
    }
   if (!Array.isArray(records)) {
      return res
        .status(400)
        .json(responseData('RECORDS_MUST_BE_ARRAY', {}, req, false));
    }
    const result = await attendanceService.markOrUpdateAttendance({ classId, session, date, takenBy, records });
    console.log('result-----',result)
 if (!result.success) {
      return res
        .status(400)
        .json(responseData(result.message || 'ATTENDANCE_UPDATE_FAILED', {}, req, false));
    }
    return res
      .status(200)
      .json(responseData('ATTENDANCE_FETCHED_OR_UPDATED', result.results, req, true));
  } catch (error) {
    return res
      .status(500)
      .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
  }
},

updateAttendanceController: async (req, res) => {
  try {
    const { classId, date, session, records } = req.body;
    if (!classId || !session || !date || !records) {
      return res
        .status(400)
        .json(responseData('MISSING_REQUIRED_FIELDS', {}, req, false));
    }
    if (!Array.isArray(records)) {
      return res
        .status(400)
        .json(responseData('RECORDS_MUST_BE_ARRAY', {}, req, false));
    }
    const updatedAttendance = await attendanceService.updateAttendance({
      classId,
      date,
      session,
      records,
    });

    if (!updatedAttendance) {
      return res
        .status(404)
        .json(responseData('ATTENDANCE_RECORD_NOT_FOUND', {}, req, false));
    }
    return res
      .status(200)
      .json(
        responseData('ATTENDANCE_UPDATED_SUCCESSFULLY', updatedAttendance, req, true)
      );
  } catch (error) {
    return res
      .status(500)
      .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
  }
},

getAttendance: async (req, res) => {
  const { date } = req.query;
  try {
    const attendanceRecords = await attendanceService.getAttendanceData(date);

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res
        .status(404)
        .json(responseData('NO_ATTENDANCE_RECORDS_FOUND', {}, req, false));
    }

    return res
      .status(200)
      .json(responseData('ATTENDANCE_RECORDS_FETCHED_SUCCESSFULLY', attendanceRecords, req, true));
  } catch (error) {
    if (error.message === 'Invalid date format') {
      return res
        .status(400)
        .json(responseData('INVALID_DATE_FORMAT', {}, req, false));
    }
    res
      .status(500)
      .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
  }
},
deleteAttendance: async (req, res) => {
  try {
    const { classId, date, session } = req.body;
    if (!classId || !date || !session) {
      return res
        .status(400)
        .json(responseData("INVALID_INPUT_DATA", {}, req, false));
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res
        .status(400)
        .json(responseData("INVALID_DATE_FORMAT", {}, req, false));
    }

    if (![1, 2, 3].includes(session)) {
      return res
        .status(400)
        .json(responseData("INVALID_SESSION", {}, req, false));
    }

    const result = await attendanceService.deleteAttendance(classId, parsedDate, session);

    return res
      .status(result.success ? 200 : 400)
      .json(responseData(result.message, result.data, req, result.success));

  } catch (error) {
    return res
      .status(500)
      .json(responseData("SERVER_ERROR", { error: error.message }, req, false));
  }
},


}

