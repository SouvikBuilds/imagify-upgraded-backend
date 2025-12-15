import dotenv from "dotenv";
dotenv.config("");
import { config } from "../config/config.js";
import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const mongoURI = config.MONGODB_URL;
    const connectionInstance = await mongoose.connect(`${mongoURI}/${DB_NAME}`);
    console.log(
      `Database connected Successfully !!! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export { connectDB };
