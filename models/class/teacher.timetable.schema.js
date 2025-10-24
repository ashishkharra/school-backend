const mongoose = require('mongoose');

const teacherTimeTableSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    section: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      required: true,
    },
    period: {
      type: Number,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    },
    startMinutes: { type: Number },
    endMinutes: { type: Number },
    status: { type: String , enum: ['active', 'inactive']}
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeacherTimeTable", teacherTimeTableSchema);
