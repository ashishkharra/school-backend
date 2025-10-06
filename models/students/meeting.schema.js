const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },

  meetingDate: { type: Date, required: true },
  reason: { type: String, required: true },
  notes: { type: String }, 
  zoomMeetingId: { type: String },
  zoomJoinUrl: { type: String },
  zoomStartUrl: { type: String },
  zoomPassword: { type: String },

  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date },
  notifications: [
    {
      title: String,
      body: String,
      to: String,
      sentAt: Date,
      status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' }
    }
  ],

  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

meetingSchema.index({ studentId: 1 });
meetingSchema.index({ meetingDate: 1 });
meetingSchema.index({ status: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
