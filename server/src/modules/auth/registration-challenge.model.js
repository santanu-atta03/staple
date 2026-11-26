const mongoose = require("mongoose");

const registrationChallengeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      default: "",
      maxlength: 60,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    purpose: {
      type: String,
      enum: ["registration", "password-reset"],
      default: "registration",
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    sentAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RegistrationChallenge", registrationChallengeSchema);
