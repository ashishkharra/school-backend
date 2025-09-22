const mongoose = require('mongoose')

const studentUpdateRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  updates: [
    {
      field: { type: String, required: true },
      newValue: { type: mongoose.Schema.Types.Mixed, required: true }
    }
  ],
  message: { type: String },
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  actionedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  actionMessage: { type: String },
}, { timestamps: true });

studentUpdateRequestSchema.index({ student: 1, status: 1 });


module.exports = mongoose.model("Student_Profile_Update_Request")