
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
      required: true,
      select: false,
    },

    fullName: {
      type: String,
      trim: true,
      maxlength: 60,
    },

    bio: {
      type: String,
      maxlength: 250,
      default: "",
    },

    avatar: {
      type: String,
      default: null,
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
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
