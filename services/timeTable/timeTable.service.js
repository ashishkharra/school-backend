const moment = require("moment");
const TeacherTimeTable = require("../../models/class/teacher.timetable.schema.js");
const SchoolSettings = require('../../models/admin/admin.setting.schema.js');
const Class = require('../../models/class/class.schema.js');
const { getTimetableForClassAggregation } = require('../../helpers/commonAggregationPipeline.js');
const { default: mongoose } = require("mongoose");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function parseTimeToMinutes(timeStr) {
  const m = moment(timeStr, "hh:mm A");
  return m.hours() * 60 + m.minutes();
}

// function generateTimeSlots(settings) {
//   const totalPeriods = settings.periods.totalPeriods || 6;
//   const periodLength = settings.periods.periodDuration || 60;
//   const breakLength = settings.periods.breakDuration || 5;

//   const slots = [];
//   let current = parseTimeToMinutes(settings.schoolTiming.startTime);

//   for (let i = 1; i <= totalPeriods; i++) {
//     const start = current;
//     const end = start + periodLength;
//     slots.push({ period: i, startTime: start, endTime: end });
//     current = end + breakLength;
//   }

//   return slots;
// }

async function getTimetableForClass(classId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return { success: false, message: "CLASS_ID_NOT_VALID" }
    }

    const classData = await Class.findById(classId);
    if (!classData) return { success: false, message: "CLASS_NOT_FOUND" };

    // Fetch timetable with teacher, subject, and class info
    const teacherAssignments = await getTimetableForClassAggregation(classId);

    const timetable = {};
    for (const day of DAYS) {
      timetable[day] = teacherAssignments
        .filter(t => t.day === day)
        .map(t => ({
          period: t.period,
          day: t.day,
          startTime: t.startTime,
          endTime: t.endTime,
          startMinutes: t.startMinutes,
          endMinutes: t.endMinutes,
          teacher: t.teacher,
          subject: t.subject,
          className: t.className,
          section: t.section
        }));
    }

    return { success: true, message: "TIME_TABLE_FETCHED_SUCCESSFULLY", timetable };
  } catch (err) {
    console.error("Service fetch error:", err);
    return { success: false, message: "SERVER_ERROR" };
  }
}

async function assignTeacherToSlot({ teacherId, day, period, classId, subjectId, startTime, endTime }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return { success: false, message: "CLASS_ID_NOT_VALID" };
    }

    // 1️⃣ Fetch school settings
    const settings = await SchoolSettings.findOne();
    if (!settings) return { success: false, message: "SET_UP_SCHOOL_SETTING" };

    // 2️⃣ Fetch class info
    const classData = await Class.findById(classId);
    if (!classData) return { success: false, message: "CLASS_NOT_FOUND" };
    const section = classData.section || null;

    // 3️⃣ Convert times to minutes
    const slotStart = parseTimeToMinutes(startTime);
    const slotEnd = parseTimeToMinutes(endTime);
    const schoolStart = parseTimeToMinutes(settings.schoolTiming.startTime);
    const schoolEnd = parseTimeToMinutes(settings.schoolTiming.endTime);

    if (slotStart < schoolStart || slotEnd > schoolEnd) {
      return { success: false, message: "SLOT_MUST_BE_WITHIN_SCHOOL_HOUR" };
    }

    // 4️⃣ Check lunch overlap
    if (settings.periods.lunchBreak?.isEnabled) {
      const lunchStart = parseTimeToMinutes(settings.periods.lunchBreak.time);
      const lunchEnd = lunchStart + (settings.periods.lunchBreak.duration || 0);
      if (slotStart < lunchEnd && slotEnd > lunchStart) {
        return { success: false, message: "SLOT_IS_OVERLAPPING_WITH_LUNCH_BREAK" };
      }
    }

    // 5️⃣ Check teacher global conflict (in ANY class)
    const globalConflict = await TeacherTimeTable.findOne({
      teacher: teacherId,
      day,
      startMinutes: { $lt: slotEnd },
      endMinutes: { $gt: slotStart },
      class: { $ne: classId } // ❗ exclude same class (allowed to edit within same class)
    });

    if (globalConflict) {
      return { success: false, message: "TEACHER_ALREADY_ASSIGNED_IN_THIS_SLOT_IN_ANOTHER_CLASS" };
    }

    // 6️⃣ Auto-delete any old slot in the SAME class and SAME time/day
    const existingSlot = await TeacherTimeTable.findOne({
      teacher: teacherId,
      class: classId,
      day,
      startMinutes: slotStart,
      endMinutes: slotEnd
    });

    if (existingSlot) {
      await TeacherTimeTable.deleteOne({ _id: existingSlot._id });
      console.log(`🧹 Old slot deleted: ${existingSlot._id}`);
    }

    // 7️⃣ Check break rule
    const minBreak = settings.periods.breakDuration || 5;
    const breakConflict = await TeacherTimeTable.findOne({
      teacher: teacherId,
      class: classId,
      day,
      $or: [
        { endMinutes: { $gte: slotStart - minBreak, $lt: slotStart } },
        { startMinutes: { $lte: slotEnd + minBreak, $gt: slotEnd } }
      ]
    });

    if (breakConflict) {
      return { success: false, message: `BREAK_REQUIRED_BETWEEN_PERIOD (${minBreak} mins)` };
    }

    // 8️⃣ Create the new slot
    const newSlot = new TeacherTimeTable({
      teacher: teacherId,
      class: classId,
      section,
      subject: subjectId,
      day,
      period,
      startTime,
      endTime,
      startMinutes: slotStart,
      endMinutes: slotEnd,
      status: "active"
    });

    await newSlot.save();

    return { success: true, message: "TIMETABLE_SLOT_ASSIGNED_OR_UPDATED", data: newSlot };

  } catch (error) {
    console.error("Error assigning teacher to slot:", error);
    return { success: false, message: "SERVER_ERROR", error: error.message };
  }
}

async function updateClassTimeTable(classId, timetable) {
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return { success: false, message: "CLASS_ID_NOT_VALID" }
    }
    const classData = await Class.findById(classId);
    if (!classData) return { success: false, message: "CLASS_NOT_FOUND" };

    const periodsToUpsert = [];
    for (const day of Object.keys(timetable)) {
      for (const period of timetable[day]) {
        periodsToUpsert.push({
          updateOne: {
            filter: {
              class: new mongoose.Types.ObjectId(classId),
              day,
              period: period.period
            },
            update: {
              $set: {
                teacher: period.teacherId ? new mongoose.Types.ObjectId(period.teacherId) : null,
                subject: period.subjectId ? new mongoose.Types.ObjectId(period.subjectId) : null,
                section: period.section || classData.section,
                startTime: period.startTime,
                endTime: period.endTime,
                startMinutes: period.startMinutes,
                endMinutes: period.endMinutes
              }
            },
            upsert: true
          }
        });
      }
    }

    // Bulk write to update/insert all periods at once
    await TeacherTimeTable.bulkWrite(periodsToUpsert);

    return { success: true, message: "TIMETABLE_UPDATED_SUCCESSFULLY" };
  } catch (error) {
    console.error("Error updating timetable:", error);
    return { success: false, message: "SERVER_ERROR", error: error.message };
  }
}

async function checkTeacherSlot({ teacherId, classId, day, startTime, endTime }) {
  try {

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return { success: false, message: "CLASS_ID_NOT_VALID" }
    }
    const slotStart = parseTimeToMinutes(startTime);
    const slotEnd = parseTimeToMinutes(endTime);

    if (slotStart === undefined || slotEnd === undefined) {
      return { success: false, message: "INVALID_START_OR_END_TIME" };
    }

    const conflict = await TeacherTimeTable.findOne({
      teacher: teacherId,
      day,
      class: { $ne: classId },
      startMinutes: { $lt: slotEnd },
      endMinutes: { $gt: slotStart },
    }).populate("class", "name section");

    if (conflict) {
      return {
        success: false,
        message: `TEACHER_ALREADY_ASSIGNED`,
        conflict,
      };
    }

    return { success: true, message: "SLOT_AVAILABLE" };
  } catch (error) {
    console.error("Error checking teacher slot:", error);
    return { success: false, message: "SERVER_ERROR", error: error.message };
  }
}

async function resetTimeTable(classId) {
    try {
        const deleted = await TeacherTimeTable.deleteMany({ class: classId });
        return {
            success: true,
            message: "TIME_TABLE_RESET_SUCCESSFULLY",
            data: { deletedCount: deleted.deletedCount }
        };
    } catch (error) {
        console.error("Error in resetTimeTable service:", error);
        return { success: false, message: "SERVER_ERROR", error: error.message };
    }
}

module.exports = {
  getTimetableForClass,
  assignTeacherToSlot,
  updateClassTimeTable,
  checkTeacherSlot,
  resetTimeTable
};