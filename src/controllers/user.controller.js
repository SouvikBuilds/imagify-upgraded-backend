import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    [name, email, password].some((field) => {
      if (field.trim() === "") {
        throw new ApiError(400, `${field} is required`);
      }
    });
    const existedUser = await User.findOne({ email });
    if (existedUser) {
      throw new ApiError(400, "User already exists with this email");
    }
    const newUser = await User.create({ name, email, password });
    const createdUser = await User.findById(newUser?._id).select(
      "-password -refreshToken"
    );
    return res
      .status(200)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const generateAccessandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request, refresh token missing");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(404, "Invalid token");
    }
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Token mismatch, unauthorized request");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };
    const { accessToken, refreshToken } = await generateAccessandRefreshToken(
      user?._id
    );

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    [email, password].some((field) => {
      if (field.trim() === "") {
        throw new ApiError(400, `${field} is required`);
      }
    });
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const isPaswordValid = await user.comparePassword(password);
    if (!isPaswordValid) {
      throw new ApiError(401, "Invalid password");
    }
    const { accessToken, refreshToken } = await generateAccessandRefreshToken(
      user?._id
    );
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };

    const loggedInUser = await User.findById(user?._id).select(
      "-password -refreshToken"
    );
    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          { user: loggedInUser, accessToken, refreshToken },
          "User logged in successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const fetchCurrentUser = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const fetchCredit = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const userCredit = user?.creditBalance;
    const userDetails = {
      name: user?.name,
      credit: userCredit,
    };
    return res
      .status(200)
      .json(
        new ApiResponse(200, userDetails, "User credit fetched successfully")
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const logOutUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

export {
  registerUser,
  generateAccessandRefreshToken,
  refreshAccessToken,
  loginUser,
  fetchCurrentUser,
  fetchCredit,
  logOutUser,
};
