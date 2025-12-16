import { Router } from "express";
import { User } from "../models/user.model.js";
import {
  generateImage,
  removeBackground,
  upscaleImage,
  uncropImage,
  removeTextFromImage,
  replaceBackgroundImage,
} from "../controllers/image.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/generate").post(verifyJWT, generateImage);

router
  .route("/remove-bg")
  .post(verifyJWT, upload.single("image"), removeBackground);

router.route("/upscale").post(verifyJWT, upload.single("image"), upscaleImage);

router.route("/uncrop").post(verifyJWT, upload.single("image"), uncropImage);

router
  .route("/remove-text")
  .post(verifyJWT, upload.single("image"), removeTextFromImage);

router
  .route("/replace-bg")
  .post(verifyJWT, upload.single("image"), replaceBackgroundImage);

export default router;
