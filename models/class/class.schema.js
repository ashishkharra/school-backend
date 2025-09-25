const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subjects: [{ type: String, required: true }], // array of subjects
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }],
    classIdentifier: { type: String, required: true },
    section: { type : String , enum : ["A", "B", "C", "D"]},
    grades: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        subject: String,
        grade: String
      }
    ],
    isClassTeacher: { type: Boolean, enum: [true, false], default: false },

    studentCount: { type: Number, default: 0 },

    startTime: {
      type: String,
      match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, // e.g. 09:00 AM
    },
    endTime: {
      type: String,
      match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, // e.g. 03:30 PM
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
