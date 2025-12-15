import bcrypt from "bcrypt";
import mongoose, { isValidObjectId } from "mongoose";
import jwt from "jsonwebtoken";
import FormData from "form-data";
import axios from "axios";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { config } from "../config/config.js";
import { uploadOnCLoudinary } from "../utils/cloudinary.js";

const generateImage = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.creditBalance <= 0) {
      throw new ApiError(400, "Insufficient credits");
    }
    const { prompt } = req.body;
    if (!prompt || prompt.trim() === "") {
      throw new ApiError(400, "Prompt is required");
    }
    const formData = new FormData();
    formData.append("prompt", prompt);
    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );
    const base64Image = Buffer.from(data).toString("base64");
    const resultImage = `data:image/png;base64,${base64Image}`;
    const updatedUser = await User.findOneAndUpdate(
      { _id: user?._id, creditBalance: { $gt: 0 } },
      {
        $inc: {
          creditBalance: -1,
        },
      },
      { new: true }
    );
    if (!updatedUser) {
      throw new ApiError(400, "insufficient credits");
    }

    const responseData = {
      image: resultImage,
      creditBalance: updatedUser.creditBalance,
    };
    return res
      .status(200)
      .json(new ApiResponse(200, responseData, "Image Generated Successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const removeBackground = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (user.creditBalance <= 0) {
      throw new ApiError(400, "Insufficient credits");
    }
    const localFilePath = req.file?.path;
    if (!localFilePath) {
      throw new ApiError(400, "Image is required");
    }
    const inputImage = await uploadOnCLoudinary(localFilePath);
    if (!inputImage) {
      throw new ApiError(400, "Image upload failed");
    }

    const formData = new FormData();
    const imageResponse = await axios.get(inputImage.url, {
      responseType: "arraybuffer",
    });
    formData.append("input_image", imageResponse.data, {
      filename: "image.png",
    });

    const { data } = await axios.post(
      "https://clipdrop-api.co/remove-background/v1",
      formData,
      {
        headers: {
          "x-api-key": config.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );
    const base64Image = Buffer.from(data).toString("base64");
    const resultImage = `data:image/png;base64,${base64Image}`;

    const updatedUser = await User.findOneAndUpdate(
      { _id: user?._id, creditBalance: { $gt: 0 } },
      {
        $inc: {
          creditBalance: -1,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(400, "insufficient credits");
    }
    const responseData = {
      image: resultImage,
      creditBalance: updatedUser.creditBalance,
    };
    return res
      .status(200)
      .json(
        new ApiResponse(200, responseData, "Background removed successfully")
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const upscaleImage = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const { targetWidth, targetHeight } = req.body;
    if (
      !targetWidth ||
      targetWidth <= 0 ||
      !targetHeight ||
      targetHeight <= 0
    ) {
      throw new ApiError(
        400,
        "targetWidth and targetHeight must be positive numbers"
      );
    }

    const localFilePath = req.file?.path;
    if (!localFilePath) {
      throw new ApiError(400, "Image is required");
    }

    const inputImage = await uploadOnCLoudinary(localFilePath);
    if (!inputImage) {
      throw new ApiError(400, "Image upload failed");
    }

    const formData = new FormData();
    const imageResponse = await axios.get(inputImage.url, {
      responseType: "arraybuffer",
    });

    formData.append("input_image", imageResponse.data, {
      filename: "image.png",
    });
    formData.append("target_width", targetWidth);
    formData.append("target_height", targetHeight);

    const { data } = await axios.post(
      "https://clipdrop-api.co/image-upscaling/v1/upscale",
      formData,
      {
        headers: {
          "x-api-key": config.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, creditBalance: { $gt: 0 } },
      { $inc: { creditBalance: -1 } },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(400, "Insufficient credits");
    }

    const resultImage = `data:image/png;base64,${Buffer.from(data).toString(
      "base64"
    )}`;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          image: resultImage,
          creditBalance: updatedUser.creditBalance,
          newHeight: targetHeight,
          newWidth: targetWidth,
        },
        "Image upscaled successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const uncropImage = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const { extendLeft, extendDown } = req.body;
    if (!extendLeft || extendLeft <= 0 || !extendDown || extendDown <= 0) {
      throw new ApiError(
        400,
        "extendLeft and extendDown must be positive numbers"
      );
    }

    const localFilePath = req.file?.path;
    if (!localFilePath) {
      throw new ApiError(400, "Image is required");
    }

    const inputImage = await uploadOnCLoudinary(localFilePath);
    if (!inputImage) {
      throw new ApiError(400, "Image upload failed");
    }

    const formData = new FormData();
    const imageResponse = await axios.get(inputImage.url, {
      responseType: "arraybuffer",
    });

    formData.append("input_image", imageResponse.data, {
      filename: "image.png",
    });
    formData.append("extend_left", extendLeft);
    formData.append("extend_down", extendDown);

    const { data } = await axios.post(
      "https://clipdrop-api.co/uncrop/v1",
      formData,
      {
        headers: {
          "x-api-key": config.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, creditBalance: { $gt: 0 } },
      { $inc: { creditBalance: -1 } },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(400, "Insufficient credits");
    }

    const resultImage = `data:image/png;base64,${Buffer.from(data).toString(
      "base64"
    )}`;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          image: resultImage,
          creditBalance: updatedUser.creditBalance,
          extendLeft,
          extendDown,
        },
        "Image uncropped successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const removeTextFromImage = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const localFilePath = req.file?.path;
    if (!localFilePath) {
      throw new ApiError(400, "Image is required");
    }

    const inputImage = await uploadOnCLoudinary(localFilePath);
    if (!inputImage) {
      throw new ApiError(400, "Image upload failed");
    }

    const formData = new FormData();
    const imageResponse = await axios.get(inputImage.url, {
      responseType: "arraybuffer",
    });

    formData.append("input_image", imageResponse.data, {
      filename: "image.png",
    });

    const { data } = await axios.post(
      "https://clipdrop-api.co/remove-text/v1",
      formData,
      {
        headers: {
          "x-api-key": config.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, creditBalance: { $gt: 0 } },
      { $inc: { creditBalance: -1 } },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(400, "Insufficient credits");
    }

    const resultImage = `data:image/png;base64,${Buffer.from(data).toString(
      "base64"
    )}`;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          image: resultImage,
          creditBalance: updatedUser.creditBalance,
        },
        "Text removed successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const replaceBackgroundImage = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const localFilePath = req.file?.path;
    if (!localFilePath) {
      throw new ApiError(400, "Image is required");
    }

    const inputImage = await uploadOnCLoudinary(localFilePath);
    if (!inputImage) {
      throw new ApiError(400, "Image upload failed");
    }
    const { prompt } = req.body;
    if (!prompt || prompt.trim() === "") {
      throw new ApiError(400, "Prompt is required");
    }
    const formData = new FormData();
    const imageResponse = await axios.get(inputImage.url, {
      responseType: "arraybuffer",
    });
    formData.append("input_image", imageResponse.data, {
      filename: "image.png",
    });
    formData.append("prompt", prompt);

    const { data } = await axios.post(
      "https://clipdrop-api.co/replace-background/v1",
      formData,
      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, creditBalance: { $gt: 0 } },
      { $inc: { creditBalance: -1 } },
      { new: true }
    );
    if (!updatedUser) {
      throw new ApiError(400, "Insufficient credits");
    }

    const base64Image = Buffer.from(data).toString("base64");
    const resultImage = `data:image/png;base64,${base64Image}`;

    const resultData = {
      image: resultImage,
      creditBalance: updatedUser.creditBalance,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(200, resultData, "Background replaced successfully")
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

export {
  generateImage,
  removeBackground,
  upscaleImage,
  uncropImage,
  removeTextFromImage,
  replaceBackgroundImage,
};
