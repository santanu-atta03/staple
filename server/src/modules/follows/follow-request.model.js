const mongoose = require("mongoose");

const followRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

followRequestSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("FollowRequest", followRequestSchema);
