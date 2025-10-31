const WalletTransaction = require("../../models/wallet-Transaction/wallettransaction.schema");
const Teacher = require("../../models/teacher/teacher.schema");
const Admin = require("../../models/admin/admin.schema");


// const walletService = {

//   async getUser(role, userId) {
//     const Model = role === "teacher" ? Teacher : Admin;
//     const user = await Model.findById(userId);
//     if (!user) throw new Error(`${role} not found`);
//     return user;
//   },

//   async creditWallet({ userId, role, amount, description, referenceId, createdBy }) {
//     const user = await this.getUser(role, userId);

//     user.walletBalance = (user.walletBalance || 0) + amount;
//     await user.save();

//     const transaction = await WalletTransaction.create({
//       giverId: createdBy,   // ✅ fixed (adminId)
//       receiverId: userId, 
//       amount,
//       type: "credit",
//       referenceId,
//       description: description || "Salary credited"
//     });

//     return { success: true, user, transaction };
//   },

//   async debitWallet({ userId, role, amount, description, referenceId, createdBy }) {
//     const user = await this.getUser(role, userId);

//     if ((user.walletBalance || 0) < amount) {
//       throw new Error("Insufficient wallet balance");
//     }

//     user.walletBalance -= amount;
//     await user.save();

//     const transaction = await WalletTransaction.create({
//       giverId: createdBy,
//       receiverId: userId,
//       amount,
//       type: "debit",
//       referenceId,
//       description: description || "Wallet debit"
//     });

//     return { success: true, user, transaction };
//   }

// };

const walletService = {

  async getUser(role, userId) {
    const Model = role === "teacher" ? Teacher : Admin;
    const user = await Model.findById(userId);
    if (!user) throw new Error(`${role} not found`);
    return user;
  },

  async creditWallet({ userId, role, amount, description, referenceId, createdBy }) {

    amount = Number(amount) || 0; // ✅ Avoid NaN

    const user = await this.getUser(role, userId);

    user.walletBalance = Number(user.walletBalance || 0) + amount;

    if (isNaN(user.walletBalance)) throw new Error("Invalid wallet balance calculation");

    await user.save();

    const transaction = await WalletTransaction.create({
      giverId: createdBy,
      receiverId: userId,
      amount,
      type: "credit",
      referenceId,
      description: description || "Salary credited"
    });

    return { success: true, user, transaction };
  },
};


module.exports = walletService;
