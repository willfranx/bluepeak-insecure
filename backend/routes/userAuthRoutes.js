import express from "express";
import { register, login, profile, logout } from "../controllers/userAuthController.js";
import { protect } from "../middleware/authProtectMiddleware.js";

import {
  registerInsecure,
  loginInsecure,
  loginViaQueryInsecure,
  logoutInsecure,
  profileInsecure
} from "../controllers/insecure/insecureUserAuthController.js";


const router = express.Router();

// Auth routes (secure)
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", protect, profile);

//Auth routes (insecure)
router.post("/insecure/register", registerInsecure);
router.post("/insecure/login", loginInsecure);
router.get("/insecure/login", loginViaQueryInsecure); 
router.post("/insecure/logout", logoutInsecure);
router.get("/insecure/profile", profileInsecure);

export default router;
