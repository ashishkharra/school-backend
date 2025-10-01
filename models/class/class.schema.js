const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: [
        "Prep, PreKG", "KG", 
        "1st", "2nd", "3rd", "4th", "5th",
        "6th", "7th", "8th", "9th", "10th",
        "11th", "12th"
      ],
      message: "CLASS_NAME_INVALID"
    },

    subjects: [{ type: mongoose.Schema.Types.ObjectId }],

    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },

    classIdentifier: { type: String, required: true },

    section: { type: String, enum: ["A", "B", "C", "D"] },

    grades: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        subject: String,
        grade: String
      }
    ],

    isClassTeacher: { type: Boolean, enum: [true, false], default: false },

    studentCount: { type: Number, default: 0 },

    startTime: {
      type: String,
      match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    },

    endTime: {
      type: String,
      match: /^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);