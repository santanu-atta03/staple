const redis = require("../../config/redis");
const Comment = require("./comment.model");
const Post = require("../posts/post.model");
const { canViewPost } = require("../posts/post.service");
const Notification = require("../notifications/notification.model");
const { getIO } = require("../../config/socket");

const addComment = async ({ postId, userId, content }) => {
  const post = await Post.findById(postId).select("authorId visibility isDeleted").lean();
  if (!(await canViewPost(post, userId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  const comment = await Comment.create({
    postId,
    userId,
    content,
  });

  await Post.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } });
  await redis.incr(`post:comments:${postId}`);
  const populatedComment = await comment.populate("userId", "username fullName avatar");

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

const getCommentsByPost = async (postId, page = 1, limit = 20, viewerId = null) => {
  const post = await Post.findById(postId).select("authorId visibility isDeleted").lean();
  if (!(await canViewPost(post, viewerId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }
  const skip = (page - 1) * limit;
  return Comment.find({ postId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "username fullName avatar")
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
  await Post.updateOne(
    { _id: comment.postId, commentsCount: { $gt: 0 } },
    { $inc: { commentsCount: -1 } },
  );
  await redis.decr(`post:comments:${comment.postId}`);
};

module.exports = { addComment, getCommentsByPost, deleteComment };