const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignment: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Assignment", 
      required: true 
    },

    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Student", 
      required: true 
    },

    submittedAt: { 
      type: Date, 
      default: Date.now 
    },

    files: [
      {
        fileUrl: { type: String, required: true },
        fileName: { type: String },
        fileType: { type: String },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    status: { 
      type: String, 
      enum: ["Submitted", "Pending", "Late", "Graded"], 
      default: "Submitted" 
    },

    marksObtained: { type: Number, default: 0 },
    feedback: { type: String },

    gradedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Teacher" 
    },

    isLate: { type: Boolean, default: false },

    resubmissions: [
      {
        files: [
          {
            fileUrl: { type: String, required: true },
            fileName: { type: String },
            fileType: { type: String },
            uploadedAt: { type: Date, default: Date.now }
          }
        ],
        submittedAt: { type: Date, default: Date.now },
        isLate: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);