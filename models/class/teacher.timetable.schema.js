const mongoose = require('mongoose');

const teacherTimeTableSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  section: { type: String, enum: ["A","B","C","D"], required: true },
  subject: { type: String, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  startTime: { 
    type: String, 
    required: true, 
    match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i 
  },
  endTime: { 
    type: String, 
    required: true, 
    match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i 
  },
startTime: { type: String, required: true }, // e.g. "09:00"
endTime: { type: String, required: true }    // e.g. "10:30"
}, { timestamps: true });

module.exports = mongoose.model("TeacherTimeTable", teacherTimeTableSchema);
