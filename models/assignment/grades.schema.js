const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    grades: [
      {
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
        },
         status: {
          type: String,
          enum: ['Pending', 'Submitted'],
          default: 'Pending'
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Grade', gradeSchema);
