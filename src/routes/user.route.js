import express, { Router } from "express";
import {
  registerUser,
  generateAccessandRefreshToken,
  refreshAccessToken,
  loginUser,
  fetchCurrentUser,
  fetchCredit,
  logOutUser,
} from "../controllers/user.controller.js";

const router = Router();
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(logOutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-user").get(fetchCurrentUser);
router.route("/credit").get(fetchCredit);

export default router;
