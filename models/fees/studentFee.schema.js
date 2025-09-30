// models/StudentFee.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  mode: { type: String, enum: ["Cash", "Card", "UPI", "BankTransfer", "Cheque"], required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Success", "Failed", "Pending"], default: "Success" },
  remarks: { type: String }
});

const studentFeeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure", required: true },

  appliedFeeHeads: [
    {
      type: { type: String, required: true },
      amount: { type: Number, required: true }
    }
  ],

  totalFee: { type: Number, required: true },
  discounts: { type: Number, default: 0 },
  payableAmount: { type: Number, required: true },

  payments: [paymentSchema],
  paidTillNow: { type: Number, default: 0 },
  remaining: { type: Number, required: true },

  status: { type: String, enum: ["Pending", "Partial", "Paid", "Waived"], default: "Pending" }
}, { timestamps: true });

module.exports = mongoose.model("StudentFee", studentFeeSchema);