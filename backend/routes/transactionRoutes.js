import express from "express"
import { protect } from "../middleware/authProtectMiddleware.js"
import {deposit, withdraw, transfer, getTransactions } from "../controllers/transactionController.js"
import { depositInsecure, withdrawInsecure, transferInsecure, getTransactionsInsecure} from "../controllers/insecure/insecureTransactionController.js"

const router = express.Router();

// // Protect these routes
// router.use(protect)

router.post("/deposit", protect, deposit)
router.post("/withdraw", protect, withdraw)
router.post("/transfer", protect, transfer)
router.get("/:accountid", protect, getTransactions)

router.post("/insecure/deposit", depositInsecure)
router.post("/insecure/withdraw", withdrawInsecure)
router.post("/insecure/transfer", transferInsecure)
router.get("/insecure/:accountid", getTransactionsInsecure)

export default router