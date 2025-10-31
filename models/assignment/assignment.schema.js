const mongoose = require('mongoose')

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    instructions: { type: String },
    dueDate: { type: String, required: true },
    maxMarks: { type: Number, default: 100 },
    passingMarks: { type: Number },
    type :{ type: String},
    fileUrl: { type: String },
    resources: [{ type: String }],

    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject: { type : String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },

  },
  { timestamps: true }
);


module.exports = mongoose.model("Assignment", assignmentSchema);