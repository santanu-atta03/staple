
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      select: false,
    },

    fullName: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    googleSubject: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    appleSubject: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    bio: {
      type: String,
      maxlength: 250,
      default: "",
    },

    website: {
      type: String,
      maxlength: 2048,
      default: "",
    },

    location: {
      type: String,
      maxlength: 120,
      default: "",
    },

    pronouns: {
      type: String,
      maxlength: 40,
      default: "",
    },

    cover: {
      type: String,
      default: "",
    },

    avatar: {
      type: String,
      default: "/default-avatar.svg",
    },

    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
