import mongoose from "mongoose";
import { MONGODB_URI } from "./env.js";
import User from "../models/user.model.js";

async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    // Let startup handle failures; never print the URI or raw driver errors.
    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
    });

    // Do not accept signups until MongoDB has the unique email index.
    await User.init();

    console.log("MongoDB connected successfully");
}

export default connectDB;
