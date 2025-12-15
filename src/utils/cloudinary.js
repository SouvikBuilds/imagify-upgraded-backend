import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { config } from "../config/config.js";

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_CLOUD_SECRET,
});

export const uploadOnCLoudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("Localfilepath required");
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log("🗑️ Local temp file deleted after error");
    }
    return null;
  }
};

export const deleteFromCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) {
      console.log("Fileurl not provided");
      return null;
    }
    const parts = fileUrl.split("/");
    const publicId = parts[parts.length - 1].split(".")[0];
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.log("Error deleting from cloudinary");
    console.log(error);
  }
};
