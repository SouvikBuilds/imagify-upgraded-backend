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

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logOutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-user").get(verifyJWT, fetchCurrentUser);
router.route("/credit").get(verifyJWT, fetchCredit);

export default router;
