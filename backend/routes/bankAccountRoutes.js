import express from "express";
import { createAccount, getUserAccounts, deleteAccount  } from "../controllers/bankAccountController.js";
import { protect } from "../middleware/authProtectMiddleware.js"
import { createAccountInsecure, getUserAccountsInsecure, deleteAccountInsecure } from "../controllers/insecure/insecureBankAccountController.js";

const router = express.Router();

// Acoount routes
router.post("/", protect, createAccount);
router.get("/:userid", protect, getUserAccounts);
router.delete("/:accountid", protect, deleteAccount);

// Account routes (insecure)
router.post("/insecure/", createAccountInsecure);
router.get("/insecure/:userid", getUserAccountsInsecure);
router.delete("/insecure/:accountid", deleteAccountInsecure); 

export default router;
