const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  rollNo: { type: String, unique: true, required: true },
  password: { type: String, required: true },

  dob: { type: Date, required: true },
  age: { type: Number },
  gender: { type: String, enum: ["Male", "Female", "Other"] },

  phone: { type: String, unique: true, sparse: true },
  address: {
    street: String,
    city: { type: String, index: true },
    state: String,
    zip: String,
    country: String
  },

  profilePic: { type: String, default: "default_profile.png" },

  parents: [
    {
      name: { type: String, required: true },
      occupation: { type: String }
    }
  ],
  enrollments: [
    {
      class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
      year: { type: Number, required: true },
      section: { type: String }
    }
  ],

  grades: [
    {
      subject: { type: String, required: true },
      grade: { type: String, required: true },
      comments: { type: String }
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
  refreshToken: { type: String },

  OTP: { type : Number },
    status: { type : String, enum: ["active", "inactive"], default : "active"},
    isRemoved: { type : Number, enum: [0,1], default: 0},
  token: { type : String },
  refreashToken: { type : String }
  
}, { timestamps: true });


studentSchema.index({ rollNo: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ "address.city": 1 });
studentSchema.index({ name: 1 });

studentSchema.pre("save", function(next) {
  if (this.dob) {
    const diff = Date.now() - this.dob.getTime();
    this.age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }
  next();
});

module.exports = mongoose.model("Student", studentSchema);
