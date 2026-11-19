import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import test from "node:test";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const testUri = "mongodb://example.invalid/community_safety_test";

function runNode(args, overrides = {}) {
    const env = { ...process.env, PORT: "5000", MONGODB_URI: testUri };
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) delete env[key];
        else env[key] = value;
    }

    const result = spawnSync(process.execPath, args, {
        cwd: backendRoot,
        env,
        encoding: "utf8",
        timeout: 10000,
    });
    assert.ifError(result.error);
    return result;
}

const startupHarness = `
    import assert from "node:assert/strict";
    import mongoose from "mongoose";
    import app from "./src/app.js";
    import User from "./src/models/user.model.js";
    import SOS from "./src/models/sos.model.js";
    import EmergencyContact from "./src/models/contact.model.js";
    import { PushSubscription, PushAttempt } from "./src/models/push.model.js";

    let connected = false;
    let indexesReady = false;
    mongoose.connect = async (uri, options) => {
        assert.equal(uri, process.env.MONGODB_URI);
        assert.equal(options.serverSelectionTimeoutMS, 5000);
        await new Promise(resolve => setTimeout(resolve, 30));
        if (process.env.TEST_DB_FAILURE === "true") {
            throw new Error("private-driver-detail-DO-NOT-LOG");
        }
        connected = true;
        console.log("TEST_DATABASE_READY");
    };
    User.init = async () => {
        assert.equal(connected, true);
        if (process.env.TEST_INDEX_FAILURE === "true") {
            throw new Error("private-index-details-DO-NOT-LOG");
        }
        indexesReady = true;
        console.log("TEST_INDEXES_READY");
    };
    for (const model of [SOS, EmergencyContact, PushSubscription, PushAttempt]) model.init = async () => {};
    app.listen = (port, onListening) => {
        assert.equal(connected, true, "HTTP must wait for MongoDB");
        assert.equal(indexesReady, true, "HTTP must wait for the unique email index");
        assert.equal(port, 5000);
        console.log("TEST_LISTENER_STARTED");
        onListening();
        return {
            on(event, callback) {
                if (event === "error" && process.env.TEST_LISTENER_FAILURE === "true") {
                    callback(new Error("private-listener-detail-DO-NOT-LOG"));
                }
            },
        };
    };
    await import("./src/index.js");
`;

test("startup waits for the asynchronous database connection", () => {
    const result = runNode(["--input-type=module", "-e", startupHarness], {
        TEST_DB_FAILURE: "false", TEST_LISTENER_FAILURE: "false",
    });
    assert.equal(result.status, 0, result.stderr);
    const ready = result.stdout.indexOf("TEST_DATABASE_READY");
    const listening = result.stdout.indexOf("TEST_LISTENER_STARTED");
    assert.ok(ready !== -1 && listening > ready);
    const indexed = result.stdout.indexOf("TEST_INDEXES_READY");
    assert.ok(indexed > ready && listening > indexed);
});

test("database failure exits nonzero, never listens, and hides raw errors", () => {
    const result = runNode(["--input-type=module", "-e", startupHarness], {
        TEST_DB_FAILURE: "true", TEST_LISTENER_FAILURE: "false",
    });
    assert.equal(result.status, 1);
    assert.ok(!result.stdout.includes("TEST_LISTENER_STARTED"));
    assert.match(result.stderr, /Unable to start server/);
    assert.ok(!(result.stdout + result.stderr).includes("private-driver-detail"));
    assert.ok(!(result.stdout + result.stderr).includes(testUri));
});

test("index failure prevents listening and does not reveal index internals", () => {
    const result = runNode(["--input-type=module", "-e", startupHarness], {
        TEST_DB_FAILURE: "false", TEST_INDEX_FAILURE: "true", TEST_LISTENER_FAILURE: "false",
    });
    assert.equal(result.status, 1);
    assert.ok(!result.stdout.includes("TEST_LISTENER_STARTED"));
    assert.match(result.stderr, /Unable to start server/);
    assert.ok(!(result.stdout + result.stderr).includes("private-index-details"));
});

test("HTTP listener failure exits with a sanitized message", () => {
    const result = runNode(["--input-type=module", "-e", startupHarness], {
        TEST_DB_FAILURE: "false", TEST_LISTENER_FAILURE: "true",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unable to start HTTP server/);
    assert.ok(!(result.stdout + result.stderr).includes("private-listener-detail"));
});

for (const [label, value] of [
    ["missing", undefined], ["empty", ""], ["whitespace", " "],
    ["non-numeric", "abc"], ["zero", "0"], ["negative", "-1"],
    ["too large", "70000"], ["fractional", "5000.5"],
]) {
    test(`invalid ${label} PORT stops startup`, () => {
        const result = runNode(["src/index.js"], { PORT: value });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /PORT must be an integer/);
        assert.ok(!result.stdout.includes("Server is running"));
    });
}

for (const [label, value] of [
    ["missing", undefined], ["empty", ""], ["whitespace", " "],
    ["unsupported scheme", "https://example.invalid/"],
]) {
    test(`invalid ${label} MONGODB_URI stops startup without exposing it`, () => {
        const result = runNode(["src/index.js"], { MONGODB_URI: value });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /MONGODB_URI is required/);
        assert.ok(!result.stdout.includes("Server is running"));
        if (value?.trim()) assert.ok(!result.stderr.includes(value));
    });
}

test("example environment file contains no database credentials", () => {
    const example = parseEnv(readFileSync(new URL("../.env.example", import.meta.url), "utf8"));
    assert.equal(example.PORT, "5000");
    assert.equal(example.MONGODB_URI, "");
});
