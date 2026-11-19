const redis = require("../../config/redis");
const Comment = require("./comment.model");
const Post = require("../posts/post.model");
const Notification = require("../notifications/notification.model");
const { getIO } = require("../../config/socket");

const addComment = async ({ postId, userId, content }) => {
  const post = await Post.findById(postId).select("authorId").lean();
  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  const comment = await Comment.create({
    postId,
    userId,
    content,
  });

  await redis.incr(`post:comments:${postId}`);
  const populatedComment = await comment.populate("userId", "username name avatar");

  // Real-time comment broadcast to anyone viewing the post
  const io = getIO();
  if (io) {
    io.to(`post:${postId}`).emit("post:commented", populatedComment);
  }

  // Notify post author if someone else commented
  if (post.authorId.toString() !== userId.toString()) {
    const notification = await Notification.create({
      recipientId: post.authorId,
      actorId: userId,
      type: "COMMENT",
      entityId: postId,
    });
    const unreadCount = await redis.incr(`notif:unread:${post.authorId}`);

    if (io) {
      io.to(`user:${post.authorId}`).emit("notification:new", {
        notification,
        unreadCount,
      });
    }
  }

  return populatedComment;
};

const getCommentsByPost = async (postId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return Comment.find({ postId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "username name avatar")
    .lean();
};

const deleteComment = async ({ commentId, userId }) => {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const err = new Error("Comment not found");
    err.statusCode = 404;
    throw err;
  }

  if (comment.userId.toString() !== userId.toString()) {
    const err = new Error("Not authorized to delete this comment");
    err.statusCode = 403;
    throw err;
  }

  await Comment.deleteOne({ _id: commentId });
  await redis.decr(`post:comments:${comment.postId}`);
};

module.exports = { addComment, getCommentsByPost, deleteComment };