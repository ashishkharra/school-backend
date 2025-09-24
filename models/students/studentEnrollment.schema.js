const mongoose = require('mongoose')

const studentEnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  academicYear: { type: Number },
  rollNo: { type: String, unique: true, required: true },
  status: {
    type: String,
    enum: ["Pass", "Fail", "Drop", "Ongoing"],
    default: "Ongoing"
  }
});

module.exports = mongoose.model("Enrollment", studentEnrollmentSchema)