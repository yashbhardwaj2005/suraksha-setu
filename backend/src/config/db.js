import mongoose from "mongoose";
import { MONGODB_URI } from "./env.js";
import User from "../models/user.model.js";
import SOS from "../models/sos.model.js";
import EmergencyContact from "../models/contact.model.js";
import { PushSubscription, PushAttempt } from "../models/push.model.js";

let connectionPromise;
let databaseReady = false;

async function initializeDatabase() {
    // Let startup handle failures; never print the URI or raw driver errors.
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
    }

    // Do not accept signups until MongoDB has the unique email index.
    await Promise.all([User.init(), SOS.init(), EmergencyContact.init(), PushSubscription.init(), PushAttempt.init()]);
    databaseReady = true;

    console.log("MongoDB connected successfully");
}

async function connectDB() {
    if (mongoose.connection.readyState === 1 && databaseReady) return;
    if (connectionPromise) return connectionPromise;
    databaseReady = false;
    connectionPromise = initializeDatabase();
    try {
        await connectionPromise;
    } finally {
        // Failed connections can retry; concurrent requests share initialization.
        connectionPromise = undefined;
    }
}

export default connectDB;
