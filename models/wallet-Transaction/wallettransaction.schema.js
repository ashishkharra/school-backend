const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
  giverId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  description: { type: String },
  referenceId: { type: String }, // salaryId
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
