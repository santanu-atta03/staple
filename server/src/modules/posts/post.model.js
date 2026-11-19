const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    content: {
      type: String,
      maxlength: 5000,
      default: "",
    },

    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video"],
        },
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    visibility: {
      type: String,
      enum: ["public", "followers", "private"],
      default: "public",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

postSchema.index({
  authorId: 1,
  createdAt: -1,
  _id: -1,
});

postSchema.index(
    {
        createdAt: -1,
        _id: -1,
    },
    {
    partialFilterExpression: {
      visibility: "public",
      isDeleted: false
    }
  }
);

module.exports = mongoose.model("Post", postSchema);
