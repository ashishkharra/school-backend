const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  fileName: { type: String },
  fileType: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const resubmissionSchema = new mongoose.Schema({
  files: [fileSchema],
  submittedAt: { type: Date, default: Date.now },
  isLate: { type: Boolean, default: false }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },

  files: [fileSchema],
  resubmissions: [resubmissionSchema],

  status: { type: String, enum: ["Submitted", "Pending", "Late"], default: "Submitted" },
  isLate: { type: Boolean, default: false },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  marksObtained: { type: Number, default: 0 },
  feedback: { type: String },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }
}, { timestamps: true });

// Ensure one submission per student per assignment
submissionSchema.index({ student: 1, assignment: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);