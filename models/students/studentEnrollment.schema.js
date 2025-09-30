const mongoose = require('mongoose')

const studentEnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  academicYear: { type: String },
  section: { type: String, enum: ["A", "B", "C", "D"]},
  rollNo: { type: String,  required: true },
  feesStatus: { type : String, enum: ['due', 'paid', 'partial']},
  status: {
    type: String,
    enum: ["Pass", "Fail", "Drop", "Ongoing"],
    default: "Ongoing"
  }
}, { timestamps: true });

module.exports = mongoose.model("Enrollment", studentEnrollmentSchema)