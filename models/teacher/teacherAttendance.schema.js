const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  date: { type: Date, required: true },
  records: [
    {
      status: { type: String, enum: ["Present", "Absent"], default: "Present" }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Teacher_attendance", attendanceSchema);