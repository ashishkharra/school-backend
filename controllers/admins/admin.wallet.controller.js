const walletService = require("../../services/admins/admin.wallet.service");
// const WalletTransaction = require("../../models/wallet/walletTransaction.schema");
const responseData = require("../../helpers/responseData");

const walletController = {
  async creditWallet(req, res) {
    try {
      const { teacherId, amount, description } = req.body;
      const adminId = req.user._id; // giver

      if (!teacherId || !amount) {
        return res.status(400).json(
          responseData("INVALID_INPUT", "teacherId & amount required", req, false)
        );
      }

      const result = await walletService.creditWallet({
        userId: teacherId,
  role: "teacher",
  amount: finalSalary,
  description: `Salary credited for ${month}`,
  referenceId: salaryRecord._id,
  createdBy,
      });

      return res.json(responseData("WALLET_CREDITED", result, req, true));
    } catch (error) {
      return res.status(500).json(responseData("ERROR", error.message, req, false));
    }
  },

  async getTransactions(req, res) {
    try {
      const userId = req.user._id;

      const tx = await WalletTransaction.find({
        $or: [{ giverId: userId }, { receiverId: userId }]
      })
        .populate("giverId", "name email")
        .populate("receiverId", "name email")
        .sort({ createdAt: -1 });

      return res.json(responseData("TX_FETCHED", tx, req, true));
    } catch (error) {
      return res.status(500).json(responseData("ERROR", error.message, req, false));
    }
  }
};

module.exports = walletController;
