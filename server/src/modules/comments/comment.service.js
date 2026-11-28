const mongoose = require("mongoose");
const redis = require("../../config/redis");
const Comment = require("./comment.model");
const CommentReaction = require("./comment-reaction.model");
const Post = require("../posts/post.model");
const User = require("../users/user.model");
const Block = require("../users/block.model");
const Follow = require("../follows/follow.model");
const { canViewPost } = require("../posts/post.service");
const Notification = require("../notifications/notification.model");
const { getIO } = require("../../config/socket");

const ALLOWED_REACTIONS = new Set(["like", "love", "laugh", "wow", "sad"]);

const extractHashtags = (text = "") => {
  const matches = String(text).match(/#([a-zA-Z0-9_]{1,50})/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
};

const extractMentionUsernames = (text = "") => {
  const matches = String(text).match(/@([a-zA-Z0-9_.]{2,30})/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
};

const resolveMentions = async (usernames, actorId) => {
  if (!usernames.length) return [];
  const users = await User.find({
    username: { $in: usernames },
    isActive: true,
  })
    .select("_id username isPrivate")
    .lean();
  if (!users.length) return [];

  const blocks = await Block.find({
    $or: [
      { blockerId: actorId, blockedId: { $in: users.map((u) => u._id) } },
      { blockedId: actorId, blockerId: { $in: users.map((u) => u._id) } },
    ],
  })
    .select("blockerId blockedId")
    .lean();
  const blockedSet = new Set(
    blocks.map((b) =>
      b.blockerId.toString() === actorId.toString() ? b.blockedId.toString() : b.blockerId.toString()
    )
  );

  const privateUsers = users.filter((u) => u.isPrivate && u._id.toString() !== actorId.toString());
  let followedPrivateSet = new Set();
  if (privateUsers.length) {
    const follows = await Follow.find({
      followerId: actorId,
      followingId: { $in: privateUsers.map((u) => u._id) },
    })
      .select("followingId")
      .lean();
    followedPrivateSet = new Set(follows.map((f) => f.followingId.toString()));
  }

  return users
    .filter((u) => {
      const uid = u._id.toString();
      if (blockedSet.has(uid)) return false;
      if (u.isPrivate && uid !== actorId.toString() && !followedPrivateSet.has(uid)) return false;
      return true;
    })
    .map((u) => u._id);
};

const emitUserNotification = async ({ recipientId, actorId, type, entityId, commentId = null }) => {
  if (!recipientId || recipientId.toString() === actorId.toString()) return null;

  const existing = await Notification.findOne({
    recipientId,
    actorId,
    type,
    entityId,
    ...(commentId ? { commentId } : {}),
  }).lean();
  if (existing) return null;

  const notification = await Notification.create({
    recipientId,
    actorId,
    type,
    entityId,
    commentId,
  });
  const unreadCount = await redis.incr(`notif:unread:${recipientId}`);
  const io = getIO();
  if (io) {
    io.to(`user:${recipientId}`).emit("notification:new", {
      notification,
      unreadCount,
    });
  }
  return notification;
};

const formatComment = (doc, reactionMap = new Map(), myReactionMap = new Map(), replies = []) => {
  const idStr = doc._id.toString();
  const authorObj = doc.userId && typeof doc.userId === "object" ? doc.userId : {};
  const authorIdStr = authorObj._id ? authorObj._id.toString() : String(doc.userId || "");

  return {
    ...doc,
    _id: idStr,
    id: idStr,
    postId: doc.postId?.toString(),
    parentCommentId: doc.parentCommentId ? doc.parentCommentId.toString() : null,
    text: doc.content,
    author: {
      userId: authorIdStr,
      _id: authorIdStr,
      username: authorObj.username || "user",
      name: authorObj.fullName || authorObj.username || "User",
      avatar: authorObj.avatar || "/default-avatar.svg",
      isVerified: Boolean(authorObj.emailVerified),
    },
    likesCount: doc.likesCount || 0,
    repliesCount: doc.repliesCount || 0,
    myReaction: myReactionMap.get(idStr) || null,
    isLiked: Boolean(myReactionMap.get(idStr)),
    reactionCounts: reactionMap.get(idStr) || {},
    replies,
  };
};

const hydrateCommentReactions = async (commentIds, viewerId = null) => {
  const reactionMap = new Map();
  const myReactionMap = new Map();
  if (!commentIds.length) return { reactionMap, myReactionMap };

  const reactions = await CommentReaction.find({ commentId: { $in: commentIds } })
    .select("commentId userId type")
    .lean();

  for (const r of reactions) {
    const cid = r.commentId.toString();
    const counts = reactionMap.get(cid) || {};
    counts[r.type] = (counts[r.type] || 0) + 1;
    reactionMap.set(cid, counts);
    if (viewerId && r.userId.toString() === viewerId.toString()) {
      myReactionMap.set(cid, r.type);
    }
  }
  return { reactionMap, myReactionMap };
};

const addComment = async ({ postId, userId, content, parentCommentId = null }) => {
  const trimmed = String(content || "").trim();
  if (!trimmed || trimmed.length > 2000) {
    const err = new Error("Comment content must be between 1 and 2000 characters");
    err.statusCode = 400;
    throw err;
  }

  const post = await Post.findById(postId)
    .select("authorId visibility isDeleted isDraft commentsDisabled")
    .lean();
  if (!post || post.isDeleted || post.isDraft || !(await canViewPost(post, userId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  if (post.commentsDisabled) {
    const err = new Error("Comments are disabled for this post");
    err.statusCode = 403;
    throw err;
  }

  let resolvedParentId = null;
  let parentComment = null;
  if (parentCommentId) {
    if (!mongoose.isValidObjectId(parentCommentId)) {
      const err = new Error("Invalid parent comment ID");
      err.statusCode = 400;
      throw err;
    }
    parentComment = await Comment.findOne({
      _id: parentCommentId,
      postId,
      isDeleted: { $ne: true },
    }).lean();
    if (!parentComment) {
      const err = new Error("Parent comment not found");
      err.statusCode = 404;
      throw err;
    }
    // Flatten deeper nesting to 1 level
    resolvedParentId = parentComment.parentCommentId || parentComment._id;
  }

  const hashtags = extractHashtags(trimmed);
  const mentionUsernames = extractMentionUsernames(trimmed);
  const mentionIds = await resolveMentions(mentionUsernames, userId);

  const comment = await Comment.create({
    postId,
    userId,
    content: trimmed,
    parentCommentId: resolvedParentId,
    hashtags,
    mentions: mentionIds,
  });

  if (resolvedParentId) {
    const repliesCount = await Comment.countDocuments({
      parentCommentId: resolvedParentId,
      isDeleted: { $ne: true },
    });
    await Comment.updateOne({ _id: resolvedParentId }, { $set: { repliesCount } });
  }

  const commentsCount = await Comment.countDocuments({
    postId,
    isDeleted: { $ne: true },
  });
  await Post.updateOne({ _id: postId }, { $set: { commentsCount } });
  await redis.set(`post:comments:${postId}`, String(commentsCount)).catch(() => {});

  const populated = await Comment.findById(comment._id)
    .populate("userId", "username fullName avatar emailVerified")
    .lean();
  const formatted = formatComment(populated);

  const io = getIO();
  if (io) {
    io.to(`post:${postId}`).emit(resolvedParentId ? "comment:replied" : "post:commented", {
      postId: postId.toString(),
      comment: formatted,
      commentsCount,
    });
  }

  // Notifications: post author, parent comment author (for replies), and mentioned users
  const notifiedIds = new Set([userId.toString()]);

  if (resolvedParentId && parentComment && parentComment.userId.toString() !== userId.toString()) {
    await emitUserNotification({
      recipientId: parentComment.userId,
      actorId: userId,
      type: "REPLY",
      entityId: postId,
      commentId: comment._id,
    });
    notifiedIds.add(parentComment.userId.toString());
  }

  if (!notifiedIds.has(post.authorId.toString())) {
    await emitUserNotification({
      recipientId: post.authorId,
      actorId: userId,
      type: "COMMENT",
      entityId: postId,
      commentId: comment._id,
    });
    notifiedIds.add(post.authorId.toString());
  }

  for (const mId of mentionIds) {
    if (!notifiedIds.has(mId.toString())) {
      await emitUserNotification({
        recipientId: mId,
        actorId: userId,
        type: "MENTION",
        entityId: postId,
        commentId: comment._id,
      });
      notifiedIds.add(mId.toString());
    }
  }

  return formatted;
};

const getCommentsByPost = async (postId, page = 1, limit = 20, viewerId = null, sort = "newest") => {
  const post = await Post.findById(postId)
    .select("authorId visibility isDeleted isDraft commentsDisabled")
    .lean();
  if (!post || post.isDeleted || post.isDraft || !(await canViewPost(post, viewerId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 50);
  const skip = (safePage - 1) * safeLimit;
  const isPostOwner = viewerId && post.authorId.toString() === viewerId.toString();

  let blockedUserIds = [];
  if (viewerId) {
    const blocks = await Block.find({
      $or: [{ blockerId: viewerId }, { blockedId: viewerId }],
    })
      .select("blockerId blockedId")
      .lean();
    blockedUserIds = blocks.map((b) =>
      b.blockerId.toString() === viewerId.toString() ? b.blockedId : b.blockerId
    );
  }

  const baseFilter = {
    postId,
    parentCommentId: null,
    isDeleted: { $ne: true },
    ...(!isPostOwner ? { isHidden: { $ne: true } } : {}),
    ...(blockedUserIds.length ? { userId: { $nin: blockedUserIds } } : {}),
  };

  const sortSpec =
    sort === "oldest"
      ? { createdAt: 1, _id: 1 }
      : sort === "top"
      ? { likesCount: -1, createdAt: -1, _id: -1 }
      : { createdAt: -1, _id: -1 };

  const [topComments, totalCount] = await Promise.all([
    Comment.find(baseFilter)
      .sort(sortSpec)
      .skip(skip)
      .limit(safeLimit)
      .populate("userId", "username fullName avatar emailVerified")
      .lean(),
    Comment.countDocuments(baseFilter),
  ]);

  const topIds = topComments.map((c) => c._id);
  const replyDocs = topIds.length
    ? await Comment.find({
        parentCommentId: { $in: topIds },
        isDeleted: { $ne: true },
        ...(!isPostOwner ? { isHidden: { $ne: true } } : {}),
        ...(blockedUserIds.length ? { userId: { $nin: blockedUserIds } } : {}),
      })
        .sort({ createdAt: 1 })
        .populate("userId", "username fullName avatar emailVerified")
        .lean()
    : [];

  const allIds = [...topIds, ...replyDocs.map((r) => r._id)];
  const { reactionMap, myReactionMap } = await hydrateCommentReactions(allIds, viewerId);

  const repliesByParent = new Map();
  for (const r of replyDocs) {
    const pid = r.parentCommentId.toString();
    const arr = repliesByParent.get(pid) || [];
    if (arr.length < 3) {
      arr.push(formatComment(r, reactionMap, myReactionMap));
      repliesByParent.set(pid, arr);
    }
  }

  const comments = topComments.map((c) =>
    formatComment(c, reactionMap, myReactionMap, repliesByParent.get(c._id.toString()) || [])
  );

  return {
    comments,
    page: safePage,
    limit: safeLimit,
    totalCount,
    hasMore: skip + topComments.length < totalCount,
  };
};

const getRepliesByComment = async (commentId, { page = 1, limit = 10, viewerId = null } = {}) => {
  const parent = await Comment.findOne({ _id: commentId, isDeleted: { $ne: true } }).lean();
  if (!parent) {
    const err = new Error("Comment not found");
    err.statusCode = 404;
    throw err;
  }

  const post = await Post.findById(parent.postId).select("authorId visibility isDeleted").lean();
  if (!(await canViewPost(post, viewerId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
  const skip = (safePage - 1) * safeLimit;
  const isPostOwner = viewerId && post.authorId.toString() === viewerId.toString();

  const filter = {
    parentCommentId: commentId,
    isDeleted: { $ne: true },
    ...(!isPostOwner ? { isHidden: { $ne: true } } : {}),
  };

  const [replies, totalCount] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("userId", "username fullName avatar emailVerified")
      .lean(),
    Comment.countDocuments(filter),
  ]);

  const { reactionMap, myReactionMap } = await hydrateCommentReactions(
    replies.map((r) => r._id),
    viewerId
  );

  return {
    replies: replies.map((r) => formatComment(r, reactionMap, myReactionMap)),
    page: safePage,
    limit: safeLimit,
    totalCount,
    hasMore: skip + replies.length < totalCount,
  };
};

const editComment = async ({ commentId, userId, content }) => {
  const trimmed = String(content || "").trim();
  if (!trimmed || trimmed.length > 2000) {
    const err = new Error("Comment content must be between 1 and 2000 characters");
    err.statusCode = 400;
    throw err;
  }

  const comment = await Comment.findOne({ _id: commentId, isDeleted: { $ne: true } });
  if (!comment) {
    const err = new Error("Comment not found");
    err.statusCode = 404;
    throw err;
  }

  if (comment.userId.toString() !== userId.toString()) {
    const err = new Error("Not authorized to edit this comment");
    err.statusCode = 403;
    throw err;
  }

  comment.content = trimmed;
  comment.hashtags = extractHashtags(trimmed);
  comment.mentions = await resolveMentions(extractMentionUsernames(trimmed), userId);
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();

  const populated = await Comment.findById(comment._id)
    .populate("userId", "username fullName avatar emailVerified")
    .lean();
  const formatted = formatComment(populated);

  const io = getIO();
  if (io) {
    io.to(`post:${comment.postId}`).emit("comment:updated", {
      postId: comment.postId.toString(),
      comment: formatted,
    });
  }

  return formatted;
};

const deleteComment = async ({ commentId, userId }) => {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    const err = new Error("Comment not found");
    err.statusCode = 404;
    throw err;
  }

  const post = await Post.findById(comment.postId).select("authorId").lean();
  const isCommentOwner = comment.userId.toString() === userId.toString();
  const isPostOwner = post && post.authorId.toString() === userId.toString();

  if (!isCommentOwner && !isPostOwner) {
    const err = new Error("Not authorized to delete this comment");
    err.statusCode = 403;
    throw err;
  }

  const childIds = await Comment.find({ parentCommentId: commentId }).distinct("_id");
  const deleteIds = [comment._id, ...childIds];

  await CommentReaction.deleteMany({ commentId: { $in: deleteIds } });
  await Comment.deleteMany({ _id: { $in: deleteIds } });

  if (comment.parentCommentId) {
    const repliesCount = await Comment.countDocuments({
      parentCommentId: comment.parentCommentId,
      isDeleted: { $ne: true },
    });
    await Comment.updateOne({ _id: comment.parentCommentId }, { $set: { repliesCount } });
  }

  const commentsCount = await Comment.countDocuments({
    postId: comment.postId,
    isDeleted: { $ne: true },
  });
  await Post.updateOne({ _id: comment.postId }, { $set: { commentsCount } });
  await redis.set(`post:comments:${comment.postId}`, String(commentsCount)).catch(() => {});

  const io = getIO();
  if (io) {
    io.to(`post:${comment.postId}`).emit("comment:deleted", {
      postId: comment.postId.toString(),
      commentId: comment._id.toString(),
      parentCommentId: comment.parentCommentId ? comment.parentCommentId.toString() : null,
      commentsCount,
    });
  }

  return { commentsCount };
};

const toggleHideComment = async ({ commentId, userId }) => {
  const comment = await Comment.findOne({ _id: commentId, isDeleted: { $ne: true } });
  if (!comment) {
    const err = new Error("Comment not found");
    err.statusCode = 404;
    throw err;
  }

  const post = await Post.findById(comment.postId).select("authorId").lean();
  if (!post || post.authorId.toString() !== userId.toString()) {
    const err = new Error("Only the post owner can moderate comments");
    err.statusCode = 403;
    throw err;
  }

  comment.isHidden = !comment.isHidden;
  await comment.save();
  return { commentId: comment._id.toString(), isHidden: comment.isHidden };
};

const toggleCommentReaction = async ({ commentId, userId, type = "like" }) => {
  const normalizedType = String(type || "like").toLowerCase();
  if (!ALLOWED_REACTIONS.has(normalizedType)) {
    const err = new Error("Invalid reaction type");
    err.statusCode = 400;
    throw err;
  }

  const comment = await Comment.findOne({ _id: commentId, isDeleted: { $ne: true } }).lean();
  if (!comment) {
    const err = new Error("Comment not found");
    err.statusCode = 404;
    throw err;
  }

  const post = await Post.findById(comment.postId)
    .select("authorId visibility isDeleted isDraft")
    .lean();
  if (!post || post.isDeleted || post.isDraft || !(await canViewPost(post, userId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  const existing = await CommentReaction.findOne({ userId, commentId });
  let myReaction = null;
  let reacted = false;

  if (existing && existing.type === normalizedType) {
    await CommentReaction.deleteOne({ _id: existing._id });
    myReaction = null;
    reacted = false;
  } else if (existing) {
    existing.type = normalizedType;
    await existing.save();
    myReaction = normalizedType;
    reacted = true;
  } else {
    await CommentReaction.create({ userId, commentId, type: normalizedType });
    myReaction = normalizedType;
    reacted = true;
  }

  const likesCount = await CommentReaction.countDocuments({ commentId });
  await Comment.updateOne({ _id: commentId }, { $set: { likesCount } });

  const { reactionMap } = await hydrateCommentReactions([comment._id], userId);
  const reactionCounts = reactionMap.get(comment._id.toString()) || {};

  const io = getIO();
  if (io) {
    io.to(`post:${comment.postId}`).emit("comment:reacted", {
      postId: comment.postId.toString(),
      commentId: comment._id.toString(),
      likesCount,
      reactionCounts,
    });
  }

  if (reacted && comment.userId.toString() !== userId.toString()) {
    await emitUserNotification({
      recipientId: comment.userId,
      actorId: userId,
      type: "COMMENT_LIKE",
      entityId: comment.postId,
      commentId: comment._id,
    });
  }

  return {
    liked: reacted,
    myReaction,
    likesCount,
    reactionCounts,
  };
};

module.exports = {
  addComment,
  getCommentsByPost,
  getRepliesByComment,
  editComment,
  deleteComment,
  toggleHideComment,
  toggleCommentReaction,
};
