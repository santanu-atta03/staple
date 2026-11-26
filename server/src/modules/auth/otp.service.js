const crypto = require("crypto");
const nodemailer = require("nodemailer");
const RegistrationChallenge = require("./registration-challenge.model");

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const configurationError = (message) => {
  const error = new Error(message);
  error.status = 503;
  return error;
};

const hashOtp = (otp) => {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw configurationError("Email verification is not configured");
  }
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
};

const sendOtp = async (email, otp) => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const sender = process.env.SMTP_FROM || SMTP_USER;
  if (!SMTP_HOST || !sender || (SMTP_USER && !SMTP_PASS) || (!SMTP_USER && SMTP_PASS)) {
    throw configurationError("Email delivery is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  });

  await transporter.sendMail({
    from: sender,
    to: email,
    subject: "Your Staple verification code",
    text: `Your Staple verification code is ${otp}. It expires in 10 minutes.`,
  });
};

const makeOtp = () => crypto.randomInt(100000, 1000000).toString();

const initiateRegistration = async ({ fullName, username, email, passwordHash }) => {
  const cleanEmail = email.toLowerCase().trim();
  const now = new Date();
  const otp = makeOtp();
  const otpHash = hashOtp(otp);

  const challenge = {
    email: cleanEmail,
    username: username.toLowerCase().trim(),
    fullName: fullName ? fullName.trim() : "",
    passwordHash,
    purpose: "registration",
    otpHash,
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    sentAt: now,
    attempts: 0,
  };

  let savedChallenge;
  try {
    savedChallenge = await RegistrationChallenge.findOneAndUpdate(
      {
        email: cleanEmail,
        sentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
      },
      { $set: challenge },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).select("_id");
  } catch (error) {
    if (error.code === 11000) {
      const cooldownError = new Error("Please wait before requesting another code.");
      cooldownError.status = 429;
      throw cooldownError;
    }
    throw error;
  }

  try {
    await sendOtp(cleanEmail, otp);
  } catch (error) {
    await RegistrationChallenge.deleteOne({ _id: savedChallenge._id });
    if (!error.status) error.status = 503;
    throw error;
  }

  return {
    success: true,
    email: cleanEmail,
    cooldownSeconds: RESEND_COOLDOWN_MS / 1000,
    expiresInSeconds: OTP_TTL_MS / 1000,
  };
};

const resendRegistrationOTP = async (email) => {
  const cleanEmail = email.toLowerCase().trim();
  const pending = await RegistrationChallenge.findOne({
    email: cleanEmail,
    purpose: "registration",
  }).select("+passwordHash");
  if (!pending || pending.expiresAt <= new Date()) {
    const error = new Error("No pending registration found for this email. Please sign up again.");
    error.status = 404;
    throw error;
  }

  return initiateRegistration({
    fullName: pending.fullName,
    username: pending.username,
    email: cleanEmail,
    passwordHash: pending.passwordHash,
  });
};

const initiatePasswordResetOTP = async ({ email }) => {
  const cleanEmail = email.toLowerCase().trim();
  const now = new Date();
  const otp = makeOtp();
  const challenge = {
    email: cleanEmail,
    username: "password-reset",
    fullName: "",
    purpose: "password-reset",
    otpHash: hashOtp(otp),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    sentAt: now,
    attempts: 0,
  };

  let savedChallenge;
  try {
    savedChallenge = await RegistrationChallenge.findOneAndUpdate(
      {
        email: cleanEmail,
        sentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
      },
      { $set: challenge },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).select("_id");
  } catch (error) {
    if (error.code === 11000) {
      const cooldownError = new Error("Please wait before requesting another code.");
      cooldownError.status = 429;
      throw cooldownError;
    }
    throw error;
  }

  try {
    await sendOtp(cleanEmail, otp);
  } catch (error) {
    await RegistrationChallenge.deleteOne({ _id: savedChallenge._id });
    if (!error.status) error.status = 503;
    throw error;
  }
};

const resendPasswordResetOTP = async (email) => {
  const cleanEmail = email.toLowerCase().trim();
  const pending = await RegistrationChallenge.findOne({
    email: cleanEmail,
    purpose: "password-reset",
  });
  if (!pending || pending.expiresAt <= new Date()) {
    const error = new Error("No pending password reset found.");
    error.status = 404;
    throw error;
  }
  return initiatePasswordResetOTP({ email: cleanEmail });
};

const verifyOTP = async ({ email, otp, purpose }) => {
  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = String(otp).trim();
  const pending = await RegistrationChallenge.findOne({
    email: cleanEmail,
    purpose,
  }).select("+passwordHash +otpHash");

  if (!pending) {
    const error = new Error("No pending registration found for this email.");
    error.status = 404;
    throw error;
  }

  if (pending.expiresAt <= new Date()) {
    await RegistrationChallenge.deleteOne({ _id: pending._id });
    const error = new Error("Verification code has expired. Please request a new code.");
    error.status = 400;
    throw error;
  }

  if (pending.attempts >= MAX_ATTEMPTS) {
    await RegistrationChallenge.deleteOne({ _id: pending._id });
    const error = new Error("Too many failed attempts. Please register again.");
    error.status = 429;
    throw error;
  }

  const suppliedHash = hashOtp(cleanOtp);
  const valid = crypto.timingSafeEqual(
    Buffer.from(suppliedHash, "hex"),
    Buffer.from(pending.otpHash, "hex")
  );

  if (!valid) {
    const updated = await RegistrationChallenge.findOneAndUpdate(
      { _id: pending._id, attempts: { $lt: MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    if (updated?.attempts >= MAX_ATTEMPTS) {
      await RegistrationChallenge.deleteOne({ _id: updated._id });
    }
    const error = new Error("Invalid verification code.");
    error.status = updated?.attempts >= MAX_ATTEMPTS ? 429 : 400;
    throw error;
  }

  const consumed = await RegistrationChallenge.findOneAndDelete({
    _id: pending._id,
    purpose,
    otpHash: pending.otpHash,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: MAX_ATTEMPTS },
  }).select("+passwordHash +otpHash");

  if (!consumed) {
    const error = new Error("Verification code is invalid or has already been used.");
    error.status = 400;
    throw error;
  }

  return {
    fullName: consumed.fullName,
    username: consumed.username,
    email: consumed.email,
    passwordHash: consumed.passwordHash,
    emailVerified: true,
  };
};

const verifyRegistrationOTP = ({ email, otp }) =>
  verifyOTP({ email, otp, purpose: "registration" });

const verifyPasswordResetOTP = ({ email, otp }) =>
  verifyOTP({ email, otp, purpose: "password-reset" });

module.exports = {
  initiateRegistration,
  resendRegistrationOTP,
  verifyRegistrationOTP,
  initiatePasswordResetOTP,
  resendPasswordResetOTP,
  verifyPasswordResetOTP,
};
