const mongoose = require("mongoose");

const schoolSettingsSchema = new mongoose.Schema(
  {
    // 🏫 Basic Info
    schoolName: {
      type: String,
      required: true,
      trim: true,
    },
    schoolLogo: {
      type: String, // file path or URL
    },
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

    // 🕗 Timing & Periods
    schoolTiming: {
      startTime: {
        type: String, // e.g., "08:00"
        required: true,
      },
      endTime: {
        type: String, // e.g., "14:00"
        required: true,
      },
    },
    periods: {
      totalPeriods: {
        type: Number,
        required: true,
      },
      periodDuration: {
        type: Number, // in minutes
        required: true,
      },
      breakDuration: {
        type: Number, // in minutes
        default: 30,
      },
      lunchBreak: {
        isEnabled: { type: Boolean, default: true },
        time: String, // e.g., "12:30"
        duration: Number, // in minutes
      },
    },

    // 🎓 Academic Session
    academicSession: {
      startDate: Date,
      endDate: Date,
      currentSession: String, // e.g., "2025-2026"
    },

    // ⚙️ Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SchoolSetting", schoolSettingsSchema);
