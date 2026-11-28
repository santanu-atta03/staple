const redis = require("../../config/redis");
const Post = require("./post.model");
const Feed = require("../feed/feed.model");
const Follow = require("../follows/follow.model");
const User = require("../users/user.model");
const followService = require("../follows/follow.service");
const { socialQueue } = require("../../queues/social.queue");

const canViewPost = async (post, viewerId) => {
  if (!post || post.isDeleted) return false;
  const authorId = post.authorId?._id || post.authorId;
  const isOwner = viewerId && authorId.toString() === viewerId.toString();
  if (isOwner) return true;
  if (post.isDraft || post.isArchived) return false;

  const Block = require("../users/block.model");
  if (viewerId) {
    const blocked = await Block.exists({
      $or: [
        { blockerId: viewerId, blockedId: authorId },
        { blockerId: authorId, blockedId: viewerId },
      ],
    });
    if (blocked) return false;
  }

  const author = post.authorId?.isPrivate !== undefined
    ? post.authorId
    : await User.findById(authorId).select("isPrivate").lean();
  const followsAuthor = viewerId
    ? await Follow.exists({ followerId: viewerId, followingId: authorId })
    : false;
  if (author?.isPrivate && !followsAuthor) return false;
  if (!post.visibility || post.visibility === "public") return true;
  return post.visibility === "followers" && Boolean(followsAuthor);
};

const extractHashtagsAndMentions = async (content = "", explicitTags = [], taggedHandles = [], authorId = null) => {
  const hashtagMatches = String(content).match(/#[a-zA-Z0-9_]+/g) || [];
  const mergedTags = Array.from(
    new Set([
      ...(Array.isArray(explicitTags) ? explicitTags : []),
      ...hashtagMatches,
    ].map((t) => (t.startsWith("#") ? t.toLowerCase() : `#${t.toLowerCase()}`)))
  );

  const mentionMatches = (String(content).match(/@[a-zA-Z0-9_]+/g) || []).map((m) =>
    m.slice(1).toLowerCase()
  );
  const tagHandles = (Array.isArray(taggedHandles) ? taggedHandles : []).map((h) =>
    String(h).replace(/^@/, "").toLowerCase().trim()
  ).filter(Boolean);

  const allHandles = Array.from(new Set([...mentionMatches, ...tagHandles]));
  let mentionIds = [];
  let taggedIds = [];
  if (allHandles.length > 0) {
    const matchedUsers = await User.find({
      username: { $in: allHandles },
      isActive: true,
      deletedAt: null,
    }).select("_id username").lean();
    const byUsername = new Map(matchedUsers.map((u) => [u.username.toLowerCase(), u._id]));
    mentionIds = mentionMatches.map((h) => byUsername.get(h)).filter(Boolean);
    taggedIds = tagHandles.map((h) => byUsername.get(h)).filter(Boolean);
  }
  return { mergedTags, mentionIds, taggedIds };
};

const createPost = async ({
  authorId,
  content = "",
  media = [],
  tags = [],
  taggedUsers = [],
  location = "",
  visibility = "public",
  isDraft = false,
  commentsDisabled = false,
}) => {
  const { mergedTags, mentionIds, taggedIds } = await extractHashtagsAndMentions(
    content,
    tags,
    taggedUsers,
    authorId
  );

  const post = await Post.create({
    authorId,
    content,
    media,
    tags: mergedTags,
    taggedUsers: taggedIds,
    mentions: mentionIds,
    location,
    visibility: ["public", "followers", "private"].includes(visibility) ? visibility : "public",
    isDraft: Boolean(isDraft),
    commentsDisabled: Boolean(commentsDisabled),
  });

  const populatedPost = await post.populate("authorId", "username fullName avatar");

  if (!post.isDraft) {
    const followerIds = await followService.getFollowerIds(authorId);
    const targets = Array.from(new Set([authorId.toString(), ...followerIds]));

    await socialQueue.add("FANOUT_POST", {
      postId: post._id.toString(),
      authorId: authorId.toString(),
      followerIds: targets,
    });
    await redis.set(`post:${post._id}`, JSON.stringify(populatedPost), "EX", 600);
  }

  return populatedPost;
};

const getPostById = async (postId, viewerId = null) => {
  const post = await Post.findById(postId)
    .populate("authorId", "username name avatar isPrivate")
    .lean();

  if (!(await canViewPost(post, viewerId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  const cacheKey = `post:${postId}`;
  if (post.visibility === "public") {
    const cached = await redis.get(cacheKey);
    if (cached) return { source: "cache", post: JSON.parse(cached) };
  }

  await redis.set(cacheKey, JSON.stringify(post), "EX", 600);
  return { source: "db", post };
};

const updatePost = async ({ postId, userId, content, media, tags, location, visibility, commentsDisabled, hideLikesCount }) => {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  if (post.authorId.toString() !== userId.toString()) {
    const err = new Error("Not authorized to edit this post");
    err.statusCode = 403;
    throw err;
  }

  if (content !== undefined) post.content = content;
  if (media !== undefined) post.media = media;
  if (tags !== undefined) post.tags = tags;
  if (location !== undefined) post.location = location;
  if (visibility !== undefined && ["public", "followers", "private"].includes(visibility)) {
    post.visibility = visibility;
  }
  if (commentsDisabled !== undefined) post.commentsDisabled = Boolean(commentsDisabled);
  if (hideLikesCount !== undefined) post.hideLikesCount = Boolean(hideLikesCount);
  await post.save();

  await redis.del(`post:${postId}`);
  return post.populate("authorId", "username name avatar");
};

const sharePost = async ({ postId, userId }) => {
  const post = await Post.findById(postId)
    .select("authorId visibility isDeleted isDraft isArchived sharesCount")
    .lean();
  if (!post || post.isDeleted || post.isDraft || !(await canViewPost(post, userId))) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  if (post.visibility === "private" && post.authorId.toString() !== userId.toString()) {
    const err = new Error("Private posts cannot be shared");
    err.statusCode = 403;
    throw err;
  }

  const updated = await Post.findByIdAndUpdate(
    postId,
    { $inc: { sharesCount: 1 } },
    { new: true }
  )
    .select("sharesCount")
    .lean();
  await redis.del(`post:${postId}`);
  return { sharesCount: updated?.sharesCount || 0 };
};

const deletePost = async ({ postId, userId }) => {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  if (post.authorId.toString() !== userId.toString()) {
    const err = new Error("Not authorized to delete this post");
    err.statusCode = 403;
    throw err;
  }

  await Promise.all([
    Post.deleteOne({ _id: postId }),
    Feed.deleteMany({ postId }),
    redis.del(`post:${postId}`),
    redis.del(`post:likes:${postId}`),
  ]);
};

const getPostsByUser = async (userId, page = 1, limit = 20, viewerId = null) => {
  const skip = (page - 1) * limit;
  const targetUser = await User.findById(userId).select("isPrivate").lean();
  if (!targetUser) return [];
  const followsAuthor = viewerId && viewerId.toString() !== userId.toString()
    ? await Follow.exists({ followerId: viewerId, followingId: userId })
    : false;
  const isOwner = viewerId && viewerId.toString() === userId.toString();
  if (targetUser.isPrivate && !isOwner && !followsAuthor) return [];

  const visibility = [
    { visibility: "public" },
    { visibility: { $exists: false } },
  ];
  if (followsAuthor) visibility.push({ visibility: "followers" });
  if (isOwner) {
    visibility.push({ visibility: "private" }, { visibility: "followers" });
  }
  return Post.find({
    authorId: userId,
    isDraft: { $ne: true },
    isArchived: { $ne: true },
    $and: [
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      { $or: visibility },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("authorId", "username fullName avatar")
    .lean();
};

const getUserDrafts = async (userId) => {
  return Post.find({ authorId: userId, isDraft: true, isDeleted: { $ne: true } })
    .sort({ updatedAt: -1 })
    .populate("authorId", "username fullName avatar")
    .lean();
};

const getUserArchived = async (userId) => {
  return Post.find({ authorId: userId, isArchived: true, isDraft: { $ne: true }, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate("authorId", "username fullName avatar")
    .lean();
};

const toggleArchivePost = async ({ postId, userId }) => {
  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }
  if (post.authorId.toString() !== userId.toString()) {
    const err = new Error("Not authorized to archive this post");
    err.statusCode = 403;
    throw err;
  }
  post.isArchived = !post.isArchived;
  await post.save();
  await redis.del(`post:${postId}`);
  return post;
};

const publishDraft = async ({ postId, userId }) => {
  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    const err = new Error("Draft not found");
    err.statusCode = 404;
    throw err;
  }
  if (post.authorId.toString() !== userId.toString()) {
    const err = new Error("Not authorized to publish this draft");
    err.statusCode = 403;
    throw err;
  }
  post.isDraft = false;
  await post.save();
  await redis.del(`post:${postId}`);
  return post.populate("authorId", "username fullName avatar");
};

module.exports = {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getPostsByUser,
  getUserDrafts,
  getUserArchived,
  toggleArchivePost,
  publishDraft,
  sharePost,
  canViewPost,
};