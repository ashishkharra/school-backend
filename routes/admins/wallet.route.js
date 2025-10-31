const express = require("express");
const router = express.Router();
const walletController = require("../../controllers/admins/admin.wallet.controller");
const { verifyToken } = require("../middlewares/auth");

router.post("/credit", verifyToken, walletController.creditWallet);
router.get("/transactions", verifyToken, walletController.getTransactions);

module.exports = router;
