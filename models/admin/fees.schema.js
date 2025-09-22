const mongoose = require('mongoose');

const feesSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  term: { type: String, required: true }, // e.g., "Spring 2025"
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date } // only if paid
}, { timestamps: true });

module.exports = mongoose.model('Fees', feesSchema);