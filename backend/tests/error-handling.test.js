import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import express from "express";
import app from "../src/app.js";
import errorHandler from "../src/middlewares/errorHandler.js";

let server;
let baseUrl;
let errorServer;
let errorBaseUrl;

before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = "http://127.0.0.1:" + server.address().port;

    // These failure routes exist only in tests, never in the real API.
    const errorApp = express();
    errorApp.get("/sync-error", () => {
        throw new Error("private-test-database-details");
    });
    errorApp.get("/async-error", async () => {
        throw new Error("private-test-async-details");
    });
    errorApp.use(errorHandler);
    errorServer = errorApp.listen(0, "127.0.0.1");
    await once(errorServer, "listening");
    errorBaseUrl = "http://127.0.0.1:" + errorServer.address().port;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
    if (errorServer) {
        await new Promise((resolve, reject) => {
            errorServer.close((error) => error ? reject(error) : resolve());
        });
    }
});

async function assertErrorResponse(response, status, code, message) {
    assert.equal(response.status, status);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.deepEqual(await response.json(), {
        success: false,
        error: { code: code, message: message },
    });
}

test("health still returns successful JSON", async () => {
    const response = await fetch(baseUrl + "/api/v1/health");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ok");
});

test("an unknown route returns JSON 404 without echoing its URL", async () => {
    const response = await fetch(baseUrl + "/missing?token=private-test-token");
    await assertErrorResponse(response, 404, "NOT_FOUND", "Route not found");
});

test("malformed JSON returns 400 without exposing the submitted body", async () => {
    const response = await fetch(baseUrl + "/missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"password":"private-test-value",}',
    });
    await assertErrorResponse(response, 400, "INVALID_JSON", "Request body must contain valid JSON");
});

test("JSON larger than 16 KB returns 413", async () => {
    const response = await fetch(baseUrl + "/missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "x".repeat(17000) }),
    });
    await assertErrorResponse(response, 413, "PAYLOAD_TOO_LARGE", "JSON request body must not exceed 16 KB");
});

test("valid JSON reaches notFound instead of triggering a parsing error", async () => {
    const response = await fetch(baseUrl + "/missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Fictional test user" }),
    });
    await assertErrorResponse(response, 404, "NOT_FOUND", "Route not found");
});

test("unexpected synchronous errors return a generic JSON 500", async () => {
    const response = await fetch(errorBaseUrl + "/sync-error");
    await assertErrorResponse(response, 500, "INTERNAL_ERROR", "Something went wrong");
});

test("rejected async handlers reach the error middleware", async () => {
    const response = await fetch(errorBaseUrl + "/async-error");
    await assertErrorResponse(response, 500, "INTERNAL_ERROR", "Something went wrong");
});

test("already-started responses delegate without writing a second response", () => {
    const originalError = new Error("test failure after headers");
    let forwardedError;
    const response = {
        headersSent: true,
        status() {
            assert.fail("Must not write another response after headers were sent");
        },
    };
    errorHandler(originalError, {}, response, (error) => {
        forwardedError = error;
    });
    assert.equal(forwardedError, originalError);
});

test("unsupported JSON charset returns a safe JSON 415", async () => {
    const response = await fetch(baseUrl + "/missing", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=unsupported" },
        body: "{}",
    });
    await assertErrorResponse(response, 415, "UNSUPPORTED_ENCODING", "Request encoding is not supported");
});

test("unsupported compression returns a safe JSON 415", async () => {
    const response = await fetch(baseUrl + "/missing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Encoding": "unsupported" },
        body: "{}",
    });
    await assertErrorResponse(response, 415, "UNSUPPORTED_ENCODING", "Request encoding is not supported");
});
