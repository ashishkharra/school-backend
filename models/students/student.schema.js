const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({

  // 🔑 Identity & Authentication
  admissionNo: { type: String, unique: true, required: true },
  admissionDate: { type: Date, default: Date.now },
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },

  // 👤 Personal Info
  dob: { type: Date, required: true },
  age: { type: Number },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  bloodGroup: { type: String },
  phone: { type: String, unique: true, sparse: true },
  address: {
    street: String,
    city: { type: String, index: true },
    state: String,
    zip: String,
    country: String
  },
  profilePic: { type: String, default: "default_profile.png" },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  },

  // 👨‍👩‍👦 Family & Emergency
  parents: [
    {
      name: { type: String, required: true },
      occupation: { type: String },
      phone: { type: String },
      email: { type: String }
    }
  ],
  guardian: {
    name: String,
    relation: String,
    occupation: String,
    phone: String
  },
  emergencyContact: {
    name: String,
    relation: String,
    phone: String,
    address: String
  },
  siblings: [
    {
      name: String,
      class: String,
      section: String
    }
  ],

  achievements: [
    {
      title: String,
      description: String,
      date: Date
    }
  ],
  extraCurricular: [
    {
      activity: String,
      achievement: String,
      year: String
    }
  ],

  // 📑 Documents & Records
  aadharFront: {type : String, required : true},
  aadharBack: {type : String, required: true},
  marksheets: [
    {
      exam: String,
      fileUrl: String
    }
  ],
  certificates: [
    {
      name: String,
      issuedBy: String,
      issueDate: Date,
      fileUrl: String
    }
  ],
  medicalRecords: [
    {
      condition: String,
      doctorNote: String,
      date: Date
    }
  ],
  transferCertificate: { type: String },

  // 📲 Communication & Discipline
  notifications: [
    {
      title: String,
      body: String,
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  disciplinaryActions: [
    {
      incident: String,
      actionTaken: String,
      date: Date
    }
  ],

  // ⚙️ System Metadata
  OTP: { type: Number },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  isRemoved: { type: Number, enum: [0, 1], default: 0 },
  removedAt: { type: Date },
  removedReason: { type: String },
  removedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  logs: [
    {
      action: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      at: { type: Date, default: Date.now }
    }
  ],
    classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  },

  // 🔒 Tokens
  token: { type: String },
  refreshToken: { type: String }

}, { timestamps: true });

studentSchema.index({ admissionNo: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ name: 1 });
studentSchema.index({ "address.city": 1 });
studentSchema.index({ class: 1, section: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ isRemoved: 1 });

module.exports = mongoose.model("Student", studentSchema);
