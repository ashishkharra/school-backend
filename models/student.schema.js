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
