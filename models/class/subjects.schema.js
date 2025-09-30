const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    description: String,
    credits: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);