const mongoose = require('mongoose')

const studentEnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  year: { type: Number, required: true },
  section: { type: String, enum: ["A", "B", "C", "D"] },
  status: {
    type: String,
    enum: ["Pass", "Fail", "Drop", "Ongoing"],
    default: "Ongoing"
  }
});

module.exports = mongoose.model("Enrollment", studentEnrollmentSchema)