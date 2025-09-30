const mongoose = require("mongoose");

const feeHeadSchema = new mongoose.Schema({
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  isOptional: { type: Boolean, default: false }
});

const feeStructureSchema = new mongoose.Schema({
  classIdentifier: { type: String, required: true },
  academicYear: { type: String, required: true },
  feeHeads: [feeHeadSchema],
  totalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model("FeeStructure", feeStructureSchema);