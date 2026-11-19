
const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate relationships
followSchema.index(
  { followerId: 1, followingId: 1 },
  { unique: true }
);

// Find a user's followers
followSchema.index({
  followingId: 1,
  createdAt: -1,
});

// Find accounts a user follows
followSchema.index({
  followerId: 1,
  createdAt: -1,
});

followSchema.index(
  {
    followerId: 1,
    followingId: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model("Follow", followSchema);
