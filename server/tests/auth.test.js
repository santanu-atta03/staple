const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const argon2 = require("argon2");

const connectDB = require("../src/config/database");
const redis = require("../src/config/redis");
const app = require("../src/app");
const User = require("../src/modules/users/user.model");
const Session = require("../src/modules/auth/session.model");
const RegistrationChallenge = require("../src/modules/auth/registration-challenge.model");
const authService = require("../src/modules/auth/auth.service");
const { generateAccessToken } = require("../src/utils/token.utils");

let server;
let baseUrl;
const createdEmails = [];

async function request(method, pathname, { body, token, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie") || "";
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, setCookie };
}

function extractRefreshCookie(setCookieHeader) {
  const match = String(setCookieHeader || "").match(/refreshToken=([^;]+)/);
  return match ? `refreshToken=${match[1]}` : "";
}

describe("Authentication & Account Security Suite", () => {
  before(async () => {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
  });

  after(async () => {
    try {
      const users = await User.find({ email: { $in: createdEmails } }).select("_id");
      const userIds = users.map((u) => u._id);
      await Promise.all([
        Session.deleteMany({ userId: { $in: userIds } }),
        RegistrationChallenge.deleteMany({ email: { $in: createdEmails } }),
        User.deleteMany({ _id: { $in: userIds } }),
      ]);
    } catch {}
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await redis.quit().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  });

  it("rejects weak password and invalid email on registration initiation", async () => {
    const weak = await request("POST", "/auth/register-initiate", {
      body: {
        fullName: "Test Weak",
        username: `weak_${Date.now()}`,
        email: `weak_${Date.now()}@example.com`,
        password: "password",
      },
    });
    assert.equal(weak.status, 400);

    const badEmail = await request("POST", "/auth/register-initiate", {
      body: {
        fullName: "Bad Email",
        username: `bademail_${Date.now()}`,
        email: "not-an-email",
        password: "Password123",
      },
    });
    assert.equal(badEmail.status, 400);
  });

  it("rejects unauthenticated access to protected endpoints", async () => {
    const res = await request("GET", "/auth/me");
    assert.equal(res.status, 401);

    const sessionsRes = await request("GET", "/auth/sessions");
    assert.equal(sessionsRes.status, 401);

    const feedRes = await request("GET", "/feed");
    assert.equal(feedRes.status, 401);
  });

  it("registers, prevents duplicates, logs in, rotates refresh token, manages sessions, changes password, deactivates/reactivates, and deletes account", async () => {
    const suffix = Date.now().toString().slice(-6);
    const email = `authtest_${suffix}@example.com`;
    const username = `authtest_${suffix}`;
    const password = "Password123!";
    createdEmails.push(email);

    // 1. Create verified user via RegistrationChallenge + authService.completeRegistration
    const otp = "123456";
    const otpHash = crypto
      .createHmac("sha256", process.env.OTP_HMAC_SECRET)
      .update(otp)
      .digest("hex");
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await RegistrationChallenge.create({
      email,
      username,
      fullName: "Auth Test User",
      purpose: "registration",
      passwordHash,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      sentAt: new Date(),
      attempts: 0,
    });

    const verifyRes = await request("POST", "/auth/verify-otp", {
      body: { email, otp },
    });
    assert.equal(verifyRes.status, 201);
    assert.ok(verifyRes.data.accessToken);
    assert.equal(verifyRes.data.user.username, username);
    const cookie1 = extractRefreshCookie(verifyRes.setCookie);
    assert.ok(cookie1);

    // 2. Duplicate registration rejected
    const dupRes = await request("POST", "/auth/register-initiate", {
      body: {
        fullName: "Dup",
        username,
        email,
        password,
      },
    });
    assert.equal(dupRes.status, 409);

    // 3. Invalid password & unknown username rejected
    const wrongPwd = await request("POST", "/auth/login", {
      body: { email: username, password: "WrongPassword123!" },
    });
    assert.equal(wrongPwd.status, 401);

    const unknownUser = await request("POST", "/auth/login", {
      body: { email: `missing_${suffix}`, password },
    });
    assert.equal(unknownUser.status, 401);

    // 4. Successful login with username + rememberMe
    const loginRes = await request("POST", "/auth/login", {
      body: { email: username, password, rememberMe: false },
    });
    assert.equal(loginRes.status, 200);
    const accessToken = loginRes.data.accessToken;
    const refreshCookie = extractRefreshCookie(loginRes.setCookie);
    assert.ok(accessToken);
    assert.ok(refreshCookie);

    // 5. Protected /auth/me succeeds with token & rejects invalid/expired token
    const meRes = await request("GET", "/auth/me", { token: accessToken });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.user.email, email);

    const badTokenRes = await request("GET", "/auth/me", { token: "invalid.jwt.token" });
    assert.equal(badTokenRes.status, 401);

    // 6. Refresh token rotation
    const refreshRes = await request("POST", "/auth/refresh", { cookie: refreshCookie });
    assert.equal(refreshRes.status, 200);
    assert.ok(refreshRes.data.accessToken);
    const rotatedCookie = extractRefreshCookie(refreshRes.setCookie);
    assert.ok(rotatedCookie);

    // Old refresh token must fail after rotation
    const replayRes = await request("POST", "/auth/refresh", { cookie: refreshCookie });
    assert.equal(replayRes.status, 401);

    // 7. Active sessions & logout all other devices
    const sessionsRes = await request("GET", "/auth/sessions", { token: refreshRes.data.accessToken });
    assert.equal(sessionsRes.status, 200);
    assert.ok(Array.isArray(sessionsRes.data.sessions));
    assert.ok(sessionsRes.data.sessions.length >= 2);

    const logoutAllRes = await request("POST", "/auth/sessions/logout-all", {
      token: refreshRes.data.accessToken,
      body: { keepCurrent: true },
    });
    assert.equal(logoutAllRes.status, 200);
    assert.equal(logoutAllRes.data.sessions.length, 1);

    // 8. Change password
    const badChange = await request("POST", "/settings/password", {
      token: refreshRes.data.accessToken,
      body: { currentPassword: "WrongPassword123!", newPassword: "NewPassword123!" },
    });
    assert.equal(badChange.status, 400);

    const newPassword = "NewPassword123!";
    const okChange = await request("POST", "/settings/password", {
      token: refreshRes.data.accessToken,
      body: { currentPassword: password, newPassword },
    });
    assert.equal(okChange.status, 200);

    // 9. Forgot password never leaks whether unknown email exists
    const forgotUnknown = await request("POST", "/auth/forgot-password", {
      body: { identity: `nonexistent_${suffix}@example.com` },
    });
    assert.equal(forgotUnknown.status, 200);

    // 10. Deactivate & Reactivate account
    const deactRes = await request("POST", "/auth/deactivate", {
      token: refreshRes.data.accessToken,
      body: { password: newPassword },
    });
    assert.equal(deactRes.status, 200);

    const blockedLogin = await request("POST", "/auth/login", {
      body: { email, password: newPassword },
    });
    assert.equal(blockedLogin.status, 403);
    assert.equal(blockedLogin.data.code, "ACCOUNT_DEACTIVATED");

    const reactivateRes = await request("POST", "/auth/reactivate", {
      body: { email, password: newPassword },
    });
    assert.equal(reactivateRes.status, 200);
    assert.ok(reactivateRes.data.accessToken);

    // 11. Delete account permanently
    const delRes = await request("DELETE", "/auth/account", {
      token: reactivateRes.data.accessToken,
      body: { password: newPassword },
    });
    assert.equal(delRes.status, 200);

    const postDeleteLogin = await request("POST", "/auth/login", {
      body: { email, password: newPassword },
    });
    assert.equal(postDeleteLogin.status, 401);
  });
});
