const argon2 = require("argon2");
const mongoose = require("mongoose");
const User = require("../users/user.model");
const RegistrationChallenge = require("./registration-challenge.model");
const authService = require("./auth.service");
const otpService = require("./otp.service");
const store = require("../../config/store");

const cookiePath = "/api/v1/auth";
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: cookiePath,
  maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 7) * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, refreshCookieOptions);
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: cookiePath,
  });
};

const sendError = (res, error, fallbackMessage) => {
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "Email or username is already registered" });
  }
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: status < 500 || status === 503 ? error.message : fallbackMessage,
  });
};

const registerInitiate = async (req, res) => {
  try {
    authService.requireDatabase();
    const email = String(req.body?.email || "").toLowerCase().trim();
    const username = String(req.body?.username || "").toLowerCase().trim();
    const fullName = String(req.body?.fullName || "").trim();
    const password = req.body?.password;

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !/^[a-z0-9_]{3,30}$/.test(username) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128 ||
      fullName.length > 60
    ) {
      return res.status(400).json({ success: false, message: "Registration details are invalid" });
    }

    const existing = await User.findOne({
      $or: [{ email }, { username }],
    }).select("_id");
    if (existing) {
      return res.status(409).json({ success: false, message: "Email or username is already registered" });
    }

    const existingChallenge = await RegistrationChallenge.findOne({
      $or: [{ email }, { username }],
    }).select("_id email");
    if (existingChallenge && existingChallenge.email !== email) {
      return res.status(409).json({ success: false, message: "Username is already being registered" });
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const result = await otpService.initiateRegistration({
      email,
      username,
      fullName,
      passwordHash,
    });

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${email}`,
      email: result.email,
      cooldownSeconds: result.cooldownSeconds,
      expiresInSeconds: result.expiresInSeconds,
    });
  } catch (error) {
    return sendError(res, error, "Could not start registration");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const otp = String(req.body?.otp || "").trim();
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Email and a six-digit verification code are required" });
    }

    const result = await authService.completeRegistration({ email, otp });
    setRefreshCookie(res, result.refreshToken);
    return res.status(201).json({
      success: true,
      message: "Account verified and created",
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    return sendError(res, error, "Could not verify registration");
  }
};

const resendOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const result = await otpService.resendRegistrationOTP(email);
    return res.status(200).json({
      success: true,
      message: `A new verification code has been sent to ${email}`,
      email: result.email,
      cooldownSeconds: result.cooldownSeconds,
      expiresInSeconds: result.expiresInSeconds,
    });
  } catch (error) {
    return sendError(res, error, "Could not resend verification code");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    const result = await authService.loginUser(email, password);
    setRefreshCookie(res, result.refreshToken);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    return sendError(res, error, "Login failed");
  }
};

const refresh = async (req, res) => {
  try {
    if (!isSameOrigin(req)) {
      return res.status(403).json({ success: false, message: "Cross-origin request rejected" });
    }
    const oldToken = req.cookies?.refreshToken;
    if (!oldToken) {
      clearRefreshCookie(res);
      return res.status(204).end();
    }
    const result = await authService.refreshSession(oldToken);
    setRefreshCookie(res, result.refreshToken);
    return res.status(200).json({ success: true, accessToken: result.accessToken });
  } catch (error) {
    clearRefreshCookie(res);
    return sendError(res, error, "Could not refresh session");
  }
};

const logout = async (req, res) => {
  try {
    if (!isSameOrigin(req)) {
      return res.status(403).json({ success: false, message: "Cross-origin request rejected" });
    }
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) await authService.logoutSession(refreshToken);
    clearRefreshCookie(res);
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return sendError(res, error, "Logout failed");
  }
};

const checkUsername = async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    const available =
      username.length >= 3 && username.length <= 30
        ? await authService.checkUsernameAvailability(username)
        : false;
    return res.status(200).json({ success: true, available, username });
  } catch (error) {
    return sendError(res, error, "Could not check username availability");
  }
};

const getProviders = (req, res) => {
  res.status(200).json({
    success: true,
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || null,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID || null,
        redirectUri: process.env.APPLE_REDIRECT_URI || null,
      },
    },
  });
};

const forgotPassword = async (req, res) => {
  try {
    authService.requireDatabase();
    const identity = String(req.body?.identity || "").toLowerCase().trim();
    if (!identity) return res.status(400).json({ success: false, message: "Email or username is required" });
    const user = await User.findOne({
      $or: [{ email: identity }, { username: identity }],
      isActive: true,
      emailVerified: true,
    }).select("email");
    if (user) await otpService.initiatePasswordResetOTP({ email: user.email });
    return res.status(200).json({
      success: true,
      message: "If an active account matches that address, a verification code has been sent.",
    });
  } catch (error) {
    return sendError(res, error, "Could not start password reset");
  }
};

const resendPasswordResetOtp = async (req, res) => {
  try {
    const identity = String(req.body?.identity || "").toLowerCase().trim();
    if (!identity) return res.status(400).json({ success: false, message: "Email or username is required" });
    const user = await User.findOne({
      $or: [{ email: identity }, { username: identity }],
      isActive: true,
      emailVerified: true,
    }).select("email");
    if (user) await otpService.resendPasswordResetOTP(user.email);
    return res.status(200).json({
      success: true,
      message: "If a password reset is pending, a new code has been sent.",
    });
  } catch (error) {
    return sendError(res, error, "Could not resend password reset code");
  }
};

const resetPassword = async (req, res) => {
  try {
    const identity = String(req.body?.identity || "").toLowerCase().trim();
    const otp = String(req.body?.otp || "").trim();
    const newPassword = req.body?.newPassword;
    if (!identity || !/^\d{6}$/.test(otp) || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: "Enter the email or username, six-digit code, and a valid new password" });
    }

    const user = await User.findOne({
      $or: [{ email: identity }, { username: identity }],
      isActive: true,
      emailVerified: true,
    }).select("email");
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset request" });

    await authService.resetPasswordWithOTP(user.email, otp, newPassword);
    clearRefreshCookie(res);
    return res.status(200).json({ success: true, message: "Password updated. Please sign in again." });
  } catch (error) {
    return sendError(res, error, "Could not reset password");
  }
};

const googleLogin = async (req, res) => {
  try {
    const result = await authService.oauthLogin(
      "google",
      req.body?.credential,
      String(req.body?.fullName || "").trim().slice(0, 60)
    );
    setRefreshCookie(res, result.refreshToken);
    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    return sendError(res, error, "Google authentication failed");
  }
};

const appleLogin = async (req, res) => {
  try {
    const result = await authService.oauthLogin(
      "apple",
      req.body?.identityToken,
      String(req.body?.fullName || "").trim().slice(0, 60)
    );
    setRefreshCookie(res, result.refreshToken);
    return res.status(200).json({
      success: true,
      message: "Apple authentication successful",
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    return sendError(res, error, "Apple authentication failed");
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let user = null;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(userId)) {
      try {
        user = await User.findOne({
          _id: userId,
          isActive: true,
          emailVerified: true,
        }).select("_id username email fullName avatar bio website location pronouns cover emailVerified isPrivate");
      } catch (dbErr) {
        user = null;
      }
    }

    if (!user) {
      user = store.findUser(userId);
    }

    if (!user) return res.status(401).json({ success: false, message: "Account is unavailable" });
    store.initializeUser(user);
    const profile = {
      id: (user._id || user.id).toString(),
      username: user.username,
      email: user.email,
      name: user.fullName || user.name || user.username,
      avatar: user.avatar || "/default-avatar.svg",
      bio: user.bio || "",
      website: user.website || "",
      location: user.location || "",
      pronouns: user.pronouns || "",
      cover: user.cover || "",
      emailVerified: user.emailVerified !== false,
    };
    return res.status(200).json({ success: true, user: profile });
  } catch (error) {
    return sendError(res, error, "Could not load account");
  }
};

const isSameOrigin = (req) => {
  const origin = req.get("origin");
  if (!origin) return true;
  if (
    /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
      origin
    )
  ) {
    return true;
  }
  const expectedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
  return origin === expectedOrigin;
};

module.exports = {
  getMe,
  registerInitiate,
  verifyOtp,
  resendOtp,
  login,
  googleLogin,
  appleLogin,
  checkUsername,
  getProviders,
  forgotPassword,
  resendPasswordResetOtp,
  resetPassword,
  refresh,
  logout,
};
