const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subjects: [{ type: String, required: true }], // array of subjects
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }],
    grades: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        subject: String,
        grade: String
      }
    ],
    studentCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
