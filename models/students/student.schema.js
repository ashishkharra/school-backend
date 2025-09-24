const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({

  // 🔑 Identity & Authentication
  admissionNo: { type: String, unique: true, required: true },
  admissionDate: { type: Date, default: Date.now },
  rollNo: { type: String, unique: true, required: true },
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

  // 🏫 Academic Info
  class: { type: String, required: true }, // e.g., "10"
  section: { type: String }, // e.g., "A"
  academicYear: { type: String }, // e.g., "2024-2025"
  currentSemester: { type: String }, // optional
  subjectsEnrolled: [
    {
      subjectName: String,
      subjectCode: String,
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }
    }
  ],
  attendance: [
    {
      date: { type: Date },
      status: { type: String, enum: ["present", "absent", "late", "excused"] }
    }
  ],
  examResults: [
    {
      examName: String,
      subject: String,
      marksObtained: Number,
      totalMarks: Number,
      grade: String
    }
  ],
  // grades: [
  //   {
  //     subject: { type: String, required: true },
  //     grade: { type: String, required: true },
  //     comments: { type: String }
  //   }
  // ],
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
  IDProof: {
    type: { type: String },
    number: String,
    fileUrl: String
  },
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

  // 💳 Finance & Administration
  feesStatus: { type: String, enum: ["paid", "due", "partial"], default: "due" },
  feeDetails: [
    {
      amount: Number,
      dueDate: Date,
      paidDate: Date,
      modeOfPayment: String,
      receiptNo: String
    }
  ],
  scholarship: {
    type: { type: String },
    amount: Number,
    validTill: Date
  },
  hostelInfo: {
    hostelName: String,
    roomNo: String
  },
  transportInfo: {
    routeNo: String,
    busNo: String,
    pickupPoint: String
  },

  // 📲 Communication & Discipline
  notifications: [
    {
      title: String,
      body: String,
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  remarks: [
    {
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      remark: String,
      date: { type: Date, default: Date.now }
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

  // 🔒 Tokens
  token: { type: String },
<<<<<<< HEAD
  refreshToken: { type: String }

=======
  refreshToken: { type: String },

  OTP: { type : Number },
    status: { type : String, enum: ["active", "inactive"], default : "active"},
    isRemoved: { type : Number, enum: [0,1], default: 0},
  token: { type : String },
  refreashToken: { type : String }
  
>>>>>>> 945aac54279ab518d07caca20713de5541b4743d
}, { timestamps: true });


// Indexes for faster search
studentSchema.index({ rollNo: 1 });
studentSchema.index({ admissionNo: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ name: 1 });
studentSchema.index({ "address.city": 1 });
studentSchema.index({ class: 1, section: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ isRemoved: 1 });

module.exports = mongoose.model("Student", studentSchema);
