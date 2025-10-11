const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema(
  {
    class: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Class", 
      required: true 
    },

     date: { type: String, required: true },

    session: { 
      type: Number, 
      required: true, 
      enum: [1, 2, 3], // 1 = morning, 2 = afternoon, 3 = evening
    },

    records: [
      {
        student: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Student", 
          required: true 
        },
        status: { 
          type: String, 
          enum: ["Present", "Absent", "Late", "Excused" ,"Pending"], 
          default: "Present" 
        },
        remarks: { 
          type: String, 
          trim: true 
        }
      }
    ],

    takenBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Teacher", 
      required: true 
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ class: 1, date: 1, session: 1 });

attendanceSchema.index({ "records.student": 1, date: 1 });

attendanceSchema.index({ "records.student": 1, class: 1 });

attendanceSchema.index({ date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
