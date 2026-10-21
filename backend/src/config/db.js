import mongoose from "mongoose";
import { MONGODB_URI } from "./env.js";

async function connectDB() {
    // Let startup handle failures; never print the URI or raw driver errors.
    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB connected successfully");
}

export default connectDB;
