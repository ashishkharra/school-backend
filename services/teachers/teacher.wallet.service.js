const Wallet = require('../../models/wallet-Transaction/wallettransaction.schema');

const teacherWalletService = {
  getMyWallet: async ({ teacherId }) => {
    try {
      const wallet = await Wallet.findOne({ userId: teacherId, role: 'teacher' });
      if (!wallet)
        throw new Error('Wallet not found. Contact admin to initialize.');

      return {
        success: true,
        message: 'Wallet fetched successfully',
        results: wallet,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch wallet',
        results: {},
      };
    }
  },
};

module.exports = teacherWalletService;
