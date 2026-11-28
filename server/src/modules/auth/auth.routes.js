
const express = require("express");
const rateLimit = require("express-rate-limit");

const controller = require("./auth.controller");
const validate = require("../../middleware/validate.middleware");
const authenticate = require("../../middleware/auth.middleware");

const {
  registerSchema,
  loginSchema,
} = require("./auth.validation");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 30 : 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

router.get(
  "/me",
  authenticate,
  controller.getMe
);

router.post(
  "/register-initiate",
  authLimiter,
  validate(registerSchema),
  controller.registerInitiate
);

router.post(
  "/verify-otp",
  authLimiter,
  controller.verifyOtp
);

router.post(
  "/resend-otp",
  authLimiter,
  controller.resendOtp
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  controller.login
);

router.post(
  "/google",
  authLimiter,
  controller.googleLogin
);

router.post(
  "/apple",
  authLimiter,
  controller.appleLogin
);

router.get(
  "/check-username",
  authLimiter,
  controller.checkUsername
);

router.get("/providers", controller.getProviders);

router.post("/forgot-password", authLimiter, controller.forgotPassword);
router.post("/resend-reset-otp", authLimiter, controller.resendPasswordResetOtp);
router.post("/reset-password", authLimiter, controller.resetPassword);

router.post(
  "/refresh",
  authLimiter,
  controller.refresh
);

router.post(
  "/logout",
  controller.logout
);

router.get("/sessions", authenticate, controller.getSessions);
router.delete("/sessions/:sessionId", authenticate, controller.revokeSession);
router.post("/sessions/logout-all", authenticate, controller.logoutAllDevices);
router.post("/deactivate", authenticate, controller.deactivateAccount);
router.post("/reactivate", authLimiter, controller.reactivateAccount);
router.delete("/account", authenticate, controller.deleteAccount);

module.exports = router;
