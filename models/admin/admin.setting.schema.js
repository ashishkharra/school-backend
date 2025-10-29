const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { timestamps: true }
);


const bannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
  },
  { timestamps: true }
);

const gallerySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
  },
  { timestamps: true }
);

const schoolSettingsSchema = new mongoose.Schema(
  {
    // 🏫 Basic Info
    schoolName: { type: String, required: true, trim: true },
    schoolLogo: String,

    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    contact: {
      phone: String,
      email: String,
      website: String,
    },

    schoolTiming: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
    },
    periods: {
      totalPeriods: { type: Number, required: true },
      periodDuration: { type: Number, required: true },
      breakDuration: { type: Number, default: 30 },
      lunchBreak: {
        isEnabled: { type: Boolean, default: true },
        time: String,
        duration: Number,
      },
    },

    academicSession: {
      startDate: Date,
      endDate: Date,
      currentSession: String,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    tollFree: String,
    socialUrl: [String],

    faqs: [faqSchema],
    banner: [bannerSchema],
    gallery: [gallerySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SchoolSetting", schoolSettingsSchema);