import assert from "node:assert/strict";
import test from "node:test";
import User from "../src/models/user.model.js";

// Validation-only fixtures: no connection, save operation or real password.
function userData() {
    return {
        name: "Fictional Student",
        email: "student@example.invalid",
        passwordHash: "fictional-hash-for-validation-only",
    };
}

async function getValidationError(user) {
    try {
        await user.validate();
    } catch (error) {
        return error;
    }
    assert.fail("Expected user validation to fail");
}

test("valid user normalizes identity and gets safe defaults", async () => {
    const data = userData();
    data.name = "  Fictional Student  ";
    data.email = "  STUDENT@EXAMPLE.INVALID  ";
    const user = new User(data);
    await user.validate();
    assert.equal(user.name, "Fictional Student");
    assert.equal(user.email, "student@example.invalid");
    assert.equal(user.role, "USER");
    assert.equal(user.accountStatus, "ACTIVE");
    assert.equal(user.verificationStatus, "NOT_REQUESTED");
    assert.equal(user.authVersion, 0);
});

test("identity and hash fields are required", async () => {
    const user = new User({});
    const error = await getValidationError(user);
    assert.ok(error.errors.name);
    assert.ok(error.errors.email);
    assert.ok(error.errors.passwordHash);
});

test("name rejects blank, too short and oversized values", async () => {
    for (const name of ["  ", "A", "x".repeat(81)]) {
        const user = new User({ ...userData(), name: name });
        const error = await getValidationError(user);
        assert.ok(error.errors.name);
    }
});

test("email rejects invalid, blank and oversized addresses", async () => {
    for (const email of ["not-an-email", "  ", "x".repeat(255) + "@example.invalid"]) {
        const user = new User({ ...userData(), email: email });
        const error = await getValidationError(user);
        assert.ok(error.errors.email);
    }
});

test("allowed model roles validate while unknown or lowercase roles fail", async () => {
    for (const role of ["USER", "VOLUNTEER", "ADMIN"]) {
        await new User({ ...userData(), role: role }).validate();
    }
    for (const role of ["user", "ROOT", "", null]) {
        const error = await getValidationError(new User({ ...userData(), role: role }));
        assert.ok(error.errors.role);
    }
});

test("account and verification states reject invalid values", async () => {
    for (const accountStatus of ["active", "DISABLED", "", null]) {
        const user = new User({ ...userData(), accountStatus: accountStatus });
        const error = await getValidationError(user);
        assert.ok(error.errors.accountStatus);
    }
    for (const verificationStatus of ["verified", "", null]) {
        const user = new User({ ...userData(), verificationStatus: verificationStatus });
        const error = await getValidationError(user);
        assert.ok(error.errors.verificationStatus);
    }
});

test("suspension and all documented verification states are valid", async () => {
    for (const verificationStatus of ["NOT_REQUESTED", "PENDING", "APPROVED", "REJECTED"]) {
        const user = new User({ ...userData(), accountStatus: "SUSPENDED", verificationStatus: verificationStatus });
        await user.validate();
    }
});

test("authVersion rejects negative, fractional, missing-value and infinite input", async () => {
    for (const authVersion of [-1, 0.5, null, Infinity, NaN]) {
        const user = new User({ ...userData(), authVersion: authVersion });
        const error = await getValidationError(user);
        assert.ok(error.errors.authVersion);
    }
    await new User({ ...userData(), authVersion: 2 }).validate();
});

test("JSON responses hide a hash even on a newly created document", () => {
    const user = new User(userData());
    const serialized = JSON.parse(JSON.stringify(user));
    assert.equal(serialized.passwordHash, undefined);
    assert.ok(!JSON.stringify(serialized).includes("fictional-hash"));
    assert.equal(user.passwordHash, userData().passwordHash);
    assert.equal(User.schema.path("passwordHash").options.select, false);
});

test("model declares unique email index and timestamp paths", () => {
    const emailIndex = User.schema.indexes().find(([fields]) => fields.email === 1);
    assert.ok(emailIndex);
    assert.equal(emailIndex[1].unique, true);
    assert.ok(User.schema.path("createdAt"));
    assert.ok(User.schema.path("updatedAt"));
});

test("a plaintext password field is not part of the stored schema", () => {
    const user = new User({ ...userData(), password: "fictional-do-not-store" });
    assert.equal(user.toObject().password, undefined);
    assert.equal(User.schema.path("password"), undefined);
});
