const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      default: "General Inquiry",
    }
    // // Optional: track if admin has replied or not
    // status: {
    //   type: String,
    //   enum: ["new", "viewed", "replied"],
    //   default: "new",
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactUs", contactUsSchema);
