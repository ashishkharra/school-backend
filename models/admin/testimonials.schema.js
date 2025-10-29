const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["Student", "Parent", "Teacher", "Visitor"], default: "Visitor" },
    message: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    profileImage: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "userType",
    },
    userType: {
      type: String,
      enum: ["Student", "Teacher", "Parent", "Visitor"],
      default: "Visitor",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Testimonial", testimonialSchema);