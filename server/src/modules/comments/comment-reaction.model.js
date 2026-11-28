const mongoose = require("mongoose");

const commentReactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },

    type: {
      type: String,
      enum: ["like", "love", "laugh", "wow", "sad"],
      default: "like",
    },
  },
  {
    timestamps: true,
  }
);

commentReactionSchema.index({ userId: 1, commentId: 1 }, { unique: true });
commentReactionSchema.index({ commentId: 1, type: 1 });

module.exports = mongoose.model("CommentReaction", commentReactionSchema);
