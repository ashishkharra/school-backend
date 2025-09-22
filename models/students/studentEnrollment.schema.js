const mongoose = require('mongoose')

const studentEnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  year: { type: Number, required: true },
  section: { type: String },
});

module.exports = mongoose.model("Student_Enrollment", studentEnrollmentSchema)