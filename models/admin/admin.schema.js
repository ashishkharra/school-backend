// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");

// const adminSchema = new mongoose.Schema(
//   {
//     firstName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     lastName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//     password: {
//       type: String,
//       required: true,
//       minlength: 6,
//     },
//     role: {
//       type: String,
//       enum: ["admin"],
//       default: "admin",
//     },
//     status: {
//       type: String,
//       enum: ["active", "inactive"],
//       default: "active",
//     },
//     profilePic: {
//       type: String,
//       default: "no_image.png",
//     },
//     forceLogout: {
//       type: Boolean,
//       default: false,
//     },
//     lastLogin: {
//       type: Date,
//     },
//     permission:{
//       type:Array
//     },
//     address: { type: String },
//     region: { type: String },
//     contact: { type: String },
//     token: { type: String },
//     refreshToken: { type: String }
//   },
//    walletBalance: { type: Number, default: 0 },
//     walletTransactions: [
//       {
//         transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTransaction" },
//         amount: { type: Number },
//         type: { type: String, enum: ["credit", "debit"] },
//         description: { type: String },
//         date: { type: Date, default: Date.now },
//       },
//     ],
//   {
//     timestamps: true,
//     toJSON: { getters: true },
//     toObject: { getters: true },
//   }
// );

// // 🔹 Hash password before save
// adminSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// module.exports = mongoose.model("Admin", adminSchema);


const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    profilePic: {
      type: String,
      default: "no_image.png",
    },
    forceLogout: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    permission: {
      type: Array,
      default: [],
    },
    address: { type: String },
    region: { type: String },
    contact: { type: String },
    token: { type: String },
    refreshToken: { type: String },

    // 💰 Wallet fields integrated inside schema
    walletBalance: { type: Number, default: 0 },
    walletTransactions: [
      {
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "WalletTransaction",
        },
        amount: { type: Number },
        type: { type: String, enum: ["credit", "debit"] },
        description: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// 🔹 Hash password before save
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("Admin", adminSchema);
