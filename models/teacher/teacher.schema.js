const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      unique: true,
      default: () => "T-" + Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["teacher"], default: "teacher" },
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],

    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    qualifications: [{ type: String }],
    dateOfJoining: { type: Date, default: Date.now },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    },
    token: { type: String },
    refreashToken: { type: String }
  },
  { timestamps: true }
);

teacherSchema.index({ role: 1, name: 1 });
teacherSchema.index({ dateOfJoining: -1 });

module.exports = mongoose.model("Teacher", teacherSchema);