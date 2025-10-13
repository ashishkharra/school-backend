const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  date: { type: Date, required: true },
  status: { type: String, enum: ["Present", "Absent", "Late"], default: "Present" },
}, { timestamps: true });

module.exports = mongoose.model("Teacher_attendance", attendanceSchema);