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
    subject: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },

    // submissions: [
    //   {
    //     student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    //     fileUrl: String,
    //     submittedAt: { type: Date, default: Date.now },
    //     marksObtained: { type: Number },
    //     feedback: { type: String },
    //     status: {
    //       type: String,
    //       enum: ["submitted", "graded", "late", "pending"],
    //       default: "submitted",
    //     },
    //   },
    // ],
  },
  { timestamps: true }
);


module.exports = mongoose.model("Assignment", assignmentSchema);
