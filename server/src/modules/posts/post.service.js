const redis = require("../../config/redis");
const Post = require("./post.model");
const Feed = require("../feed/feed.model");
const followService = require("../follows/follow.service");
const { socialQueue } = require("../../queues/social.queue");

const createPost = async ({ authorId, content, media = [] }) => {
  const post = await Post.create({
    authorId,
    content,
    media,
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

const getPostById = async (postId) => {
  const cacheKey = `post:${postId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { source: "cache", post: JSON.parse(cached) };
  }

  const post = await Post.findById(postId)
    .populate("authorId", "username name avatar")
    .lean();

  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  await redis.set(cacheKey, JSON.stringify(post), "EX", 600);
  return { source: "db", post };
};

const updatePost = async ({ postId, userId, content, media }) => {
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

const getPostsByUser = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return Post.find({ authorId: userId })
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
};