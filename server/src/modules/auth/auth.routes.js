
const express = require("express");
const rateLimit = require("express-rate-limit");

const controller = require("./auth.controller");
const validate = require("../../middleware/validate.middleware");

const {
  registerSchema,
  loginSchema,
} = require("./auth.validation");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  controller.register
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  controller.login
);

router.post(
  "/refresh",
  authLimiter,
  controller.refresh
);

router.post(
  "/logout",
  controller.logout
);

module.exports = router;
