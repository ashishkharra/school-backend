const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true
    },
    marks: {
      type: Number,
      default: null
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F', null],
      default: null
    },
    remark: {
      type: String,
      default: ''
    }
  },
  { timestamps: true } // ✅ Correct place for schema options
);

module.exports = mongoose.model('Grade', gradeSchema);
