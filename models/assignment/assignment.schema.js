const mongoose = require('mongoose')

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    instructions: { type: String },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, default: 100 },
    passingMarks: { type: Number },

    fileUrl: { type: String },
    resources: [{ type: String }],

    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },

  },
  { timestamps: true }
);


module.exports = mongoose.model("Assignment", assignmentSchema);