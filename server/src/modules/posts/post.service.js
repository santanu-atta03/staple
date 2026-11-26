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

const createPost = async ({ authorId, content, media = [], tags = [], location = "" }) => {
  const post = await Post.create({
    authorId,
    content,
    media,
    tags,
    location,
  });

  const populatedPost = await post.populate("authorId", "username name avatar");

  // Pull follower IDs from Redis Set (or warm from MongoDB) + include author's own feed
  const followerIds = await followService.getFollowerIds(authorId);
  const targets = Array.from(new Set([authorId.toString(), ...followerIds]));

  await socialQueue.add("FANOUT_POST", {
    postId: post._id.toString(),
    authorId: authorId.toString(),
    followerIds: targets,
  });

  await redis.set(`post:${post._id}`, JSON.stringify(populatedPost), "EX", 600);
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

const updatePost = async ({ postId, userId, content, media, tags, location }) => {
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
  await post.save();

  await redis.del(`post:${postId}`);
  return post.populate("authorId", "username name avatar");
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
    $and: [
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      { $or: visibility },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("authorId", "username name avatar")
    .lean();
};

module.exports = {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getPostsByUser,
  canViewPost,
};