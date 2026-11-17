import { randomBytes } from "node:crypto";

const sessionSecret = process.env.JWT_SECRET || randomBytes(48).toString("hex");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
}

export { sessionSecret };
