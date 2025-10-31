const mongoose = require("mongoose");
 
const teacherSchema = new mongoose.Schema(
  {
    // 🔑 Identity & Authentication
  
    employeeId: { type: String, unique: true, sparse: true }, // official employee ID
    name: { type: String, required: true },

     profilePic: {
    type: { type: String },
    fileUrl: String
  },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["teacher"], default: "teacher" },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    // 📞 Personal Info
    phone: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"]
    },
    walletBalance: { type: Number, default: 0 },

    // walletTransactions: [
    //   {
    //     transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTransaction" },
    //     amount: { type: Number },
    //     type: { type: String, enum: ["credit", "debit"] },
    //     description: { type: String },
    //     date: { type: Date, default: Date.now },
    //   },
    // ],
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    },
    bloodGroup: { type: String },
    // 🏥 Disability Info
    physicalDisability: { type: Boolean, default: false },
    disabilityDetails: { type: String }, // e.g. "Hearing impairment", "Mobility issues"

    // 🏫 Academic & Professional
    // department: { type: String }, // e.g., "Mathematics"
    designation: { type: String }, // e.g., "Senior Teacher"
    qualifications: [{ type: String }],
    specialization: [String], // main subject expertise
    experience: { type: Number }, // in years
    dateOfJoining: { type: Date, default: Date.now },
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    subjectsHandled: [
      {
        subjectName: String,
        subjectCode: String,
        classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" }
      }
    ],
    // 💰 Salary / HR
    salaryInfo: {
      basic: { type: Number },
      allowances: { type: Number },
      deductions: { type: Number },
      netSalary: { type: Number }
    },
    // 📑 Documents & Records
    
    // certificates: [
    //   {
    //     name: String,
    //     issuedBy: String,
    //     year: Number,
    //     fileUrl: String
    //   }
    // ],

    
      aadharFront: {
      type: { type: String },
      number: String,
      fileUrl: String
    },
      aadharBack: {
      type: { type: String },
      number: String,
      fileUrl: String
    },
    // resume: { type: String },
    // joiningLetter: { type: String },
    // 👨‍👩‍👦 Emergency Contact
    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
      address: String
    },
    // 📊 Work & Performance
    attendance: [
      {
        date: Date,
        status: {
          type: String,
          enum: ["present", "absent", "onLeave"]
        }
      }
    ],
    leaves: [
      {
        type: { type: String },
        fromDate: Date,
        toDate: Date,
        reason: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending"
        }
      }
    ],
    performanceReviews: [
      {
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        comments: String,
        rating: Number,
        date: { type: Date, default: Date.now }
      }
    ],
    achievements: [
      {
        title: String,
        description: String,
        year: Number
      }
    ],
    // 🏫 School Responsibilities
    classTeacherOf: {
      classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
      section: String
    },
    clubsInCharge: [
      {
        clubName: String,
        year: String
      }
    ],
    eventsHandled: [
      {
        eventName: String,
        date: Date,
        role: String
      }
    ],
    // 📲 Communication & System
    notifications: [
      {
        title: String,
        body: String,
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    // ⚙️ Status & Security
    OTP: { type: Number },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        reason: String
      }
    ],
    isRemoved: { type: Number, enum: [0, 1], default: 0 },
    classTeacherOf: {
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  section: String
},
    removedAt: { type: Date },
    removedReason: { type: String },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    // 🔒 Tokens
    token: { type: String },
    refreshToken: { type: String }
  },
  { timestamps: true }
);
// Indexes for faster queries
teacherSchema.index({ role: 1, name: 1 });
teacherSchema.index({ department: 1 });
teacherSchema.index({ dateOfJoining: -1 });
teacherSchema.index({ status: 1 });
teacherSchema.index({ isRemoved: 1 });
module.exports = mongoose.model("Teacher", teacherSchema);

