const walletService = require("../../services/teachers/teacher.wallet.service");
const responseData = require("../../helpers/responseData"); // your helper

const walletController = {
  // 🔹 Credit teacher wallet (Admin → Teacher)
  creditWallet: async (req, res) => {
    try {
      const { teacherId, amount, description } = req.body;
      const adminId = req.user._id;

      if (!teacherId || !amount) {
        return res
          .status(400)
          .json(responseData("INVALID_INPUT", { error: "teacherId & amount required" }, req, false));
      }

      const result = await walletService.creditWallet({
        userId: teacherId,
        role: "teacher",
        amount,
        description,
        createdBy: adminId,
      });

      return res.json(responseData("WALLET_CREDITED", result.transaction, req, true));
    } catch (error) {
      return res
        .status(500)
        .json(responseData("WALLET_ERROR", { error: error.message }, req, false));
    }
  },

  // 🔹 Get teacher wallet transactions
  getTransactions: async (req, res) => {
    try {
      const teacher = req.user; // logged-in teacher
      const transactions = teacher.walletTransactions || [];
      return res.json(responseData("TRANSACTIONS_FETCHED", transactions, req, true));
    } catch (error) {
      return res
        .status(500)
        .json(responseData("WALLET_ERROR", { error: error.message }, req, false));
    }
  },
};

module.exports = walletController;
