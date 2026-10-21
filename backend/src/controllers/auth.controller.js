import bcrypt from "bcrypt";
import User from "../models/user.model.js";

function sendValidationError(res, message) {
    return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: message },
    });
}

async function register(req, res, next) {
    try {
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return sendValidationError(res, "Request body must be a JSON object");
        }

        const allowedFields = ["name", "email", "password", "role"];
        for (const field of Object.keys(req.body)) {
            if (!allowedFields.includes(field)) {
                return sendValidationError(res, "Only name, email, password and role are accepted");
            }
        }

        if (typeof req.body.name !== "string" || typeof req.body.email !== "string" || typeof req.body.password !== "string") {
            return sendValidationError(res, "Name, email and password must be strings");
        }

        const name = req.body.name.trim();
        const email = req.body.email.trim().toLowerCase();
        const password = req.body.password;
        let role = "USER";
        if (req.body.role !== undefined) role = req.body.role;

        if (name.length < 2 || name.length > 80) {
            return sendValidationError(res, "Name must be between 2 and 80 characters");
        }
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return sendValidationError(res, "Enter a valid email address");
        }
        if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
            return sendValidationError(res, "Password must have at least 12 characters and no more than 72 UTF-8 bytes");
        }
        if (role !== "USER" && role !== "VOLUNTEER") {
            return sendValidationError(res, "Public registration allows only USER or VOLUNTEER");
        }

        const existingUser = await User.exists({ email: email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" },
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({
            name: name,
            email: email,
            passwordHash: passwordHash,
            role: role,
        });

        return res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    accountStatus: user.accountStatus,
                    verificationStatus: user.verificationStatus,
                },
            },
        });
    } catch (error) {
        // The unique database index also protects simultaneous signups.
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" },
            });
        }
        if (error.name === "ValidationError") {
            return sendValidationError(res, "Registration details are invalid");
        }
        return next(error);
    }
}

export { register };
