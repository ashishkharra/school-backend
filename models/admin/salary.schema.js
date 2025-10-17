const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  month: {
    type: String, // Example: "October 2025"
    // required: true
  },
  baseSalary: {
    type: Number, // from teacher collection
    required: true
  },
  totalWorkingDays: {
    type: Number,
    default: 30
  },
  totalLeaves: {
    type: Number,
    default: 0
  },
  perDaySalary: {
    type: Number
  },
  totalDeductions: {
    type: Number
  },
  finalSalary: {
    type: Number
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  paymentDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
    invoicePath: { type: String },
});

module.exports = mongoose.model('Salary', salarySchema);
