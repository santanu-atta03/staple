
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    userAgent: {
      type: String,
      default: "Unknown device",
      maxlength: 300,
    },

    ipAddress: {
      type: String,
      default: "",
      maxlength: 100,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    rememberMe: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB automatically removes expired sessions eventually.
sessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("Session", sessionSchema);