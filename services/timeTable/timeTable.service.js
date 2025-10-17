const moment = require("moment");
const TeacherTimeTable = require("../../models/class/teacher.timetable.schema.js");
const SchoolSettings = require('../../models/admin/admin.setting.schema.js');
const Class = require('../../models/class/class.schema.js');
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function parseTimeToMinutes(timeStr) {
  const m = moment(timeStr, "hh:mm A");
  return m.hours() * 60 + m.minutes();
}

function generateTimeSlots(settings) {
  const totalPeriods = settings.periods.totalPeriods || 6;
  const periodLength = settings.periods.periodDuration || 60;
  const breakLength = settings.periods.breakDuration || 5;

  const slots = [];
  let current = parseTimeToMinutes(settings.schoolTiming.startTime);

  for (let i = 1; i <= totalPeriods; i++) {
    const start = current;
    const end = start + periodLength;
    slots.push({ period: i, startTime: start, endTime: end });
    current = end + breakLength;
  }

  return slots;
}

async function getTimetableForClass(classId) {
  try {
    const classData = await Class.findById(classId);
    if (!classData) throw new Error("Class not found");

    const settings = await SchoolSettings.findOne();
    if (!settings) {
      return { success : false, message : 'SCHOOL_SETTING_NOT_FOUND'}
    }

    const timeSlots = generateTimeSlots(settings);
    const teacherAssignments = await TeacherTimeTable.find({ class: classId });

    const timetable = {};

    for (const day of DAYS) {
      timetable[day] = timeSlots.map(slot => {
        const assigned = teacherAssignments.find(t =>
          t.day === day &&
          t.slots.some(s => s.startTime === slot.startTime && s.endTime === slot.endTime)
        );

        return {
          period: slot.period,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: assigned?.teacherId || null,
          subjectId: assigned?.slots.find(s => s.startTime === slot.startTime)?.subjectId || null,
          section: assigned?.slots.find(s => s.startTime === slot.startTime)?.classData.section || null
        };
      });
    }

    return { success: false, message: "TIME_TABLE_FETCHED_SUCCESSFULLY", timetable };
  } catch (error) {
    console.log('Error while getting timetable : ', error.message)
    return { success: false, message: 'SERVER_ERROR' }
  }
}

async function assignTeacherToSlot({ teacherId, day, period, classId, subjectId, startTime, endTime }) {

  console.log('teacher id : ', teacherId, ' ', day, ' ', period, ' ', classId, ' ', subjectId, ' ', startTime, ' ', endTime)
  const settings = await SchoolSettings.findOne();
  if (!settings) {
    return { success: false, message: "SET_UP_SCHOOL_SETTING" }
  }

  const classData = await Class.findById(classId);

  if (!classData) {
    return { success: false, message: "CLASS_NOT_FOUND" }
  }

  const section = classData.section;

  const slotStart = parseTimeToMinutes(startTime);
  const slotEnd = parseTimeToMinutes(endTime);
  const schoolStart = parseTimeToMinutes(settings.schoolTiming.startTime);
  const schoolEnd = parseTimeToMinutes(settings.schoolTiming.endTime);

  if (slotStart < schoolStart || slotEnd > schoolEnd) {
    return { success: false, message: "SLOT_MUST_BE_WITHIN_SCHOOL_HOUR" }
  }

  if (settings.periods.lunchBreak?.isEnabled) {
    const lunchStart = parseTimeToMinutes(settings.periods.lunchBreak.time);
    const lunchEnd = lunchStart + (settings.periods.lunchBreak.duration || 0);

    if (slotStart < lunchEnd && slotEnd > lunchStart) {
      return { success: false, message: "SLOT_IS_OVERLAPPING_WITH_LUNCH_BREAK" }
    }
  }

  let teacherTimeTable = await TeacherTimeTable.findOne({ teacherId, day });

  if (teacherTimeTable) {
    const hasConflict = teacherTimeTable.slots.some(s => {
      const sStart = parseTimeToMinutes(s.startTime);
      const sEnd = parseTimeToMinutes(s.endTime);
      return (slotStart < sEnd && slotEnd > sStart);
    });
    if (hasConflict) {
      return { success: false, message: "ALREADY_ASIGNED" }
    }

    const minBreak = settings.periods.breakDuration || 5;
    const hasBreakConflict = teacherTimeTable.slots.some(s => {
      const sStart = parseTimeToMinutes(s.startTime);
      const sEnd = parseTimeToMinutes(s.endTime);
      return (
        (slotStart >= sEnd && slotStart < sEnd + minBreak) ||
        (slotEnd <= sStart && slotEnd > sStart - minBreak)
      );
    });
    if (hasBreakConflict) {
      return { success: false, message: "BREAK_REQUIRED_BETWEEN_PERIOD" }
      throw new Error(`Minimum break of ${minBreak} minutes required between periods`);
    }

    // Add new slot with section from Class schema
    teacherTimeTable.slots.push({ period, startTime, endTime, classId, subjectId, section });
    await teacherTimeTable.save();
    return teacherTimeTable;
  } else {
    // New timetable entry
    const newTable = new TeacherTimeTable({
      teacherId,
      day,
      slots: [{ period, startTime, endTime, classId, subjectId, section }]
    });
    await newTable.save();
    return newTable;
  }
}

module.exports = {
  getTimetableForClass,
  assignTeacherToSlot
};