const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const rateLimit = require("../middleware/rateLimit.middleware");
const User = require("../modules/users/user.model");
const Post = require("../modules/posts/post.model");
const Like = require("../modules/likes/like.model");
const Bookmark = require("../modules/bookmarks/bookmark.model");
const Comment = require("../modules/comments/comment.model");
const Follow = require("../modules/follows/follow.model");
const commentService = require("../modules/comments/comment.service");
const followService = require("../modules/follows/follow.service");
const postService = require("../modules/posts/post.service");

router.use(authenticate.optionalAuthenticate);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPublicPostQuery = () => ({
  isDeleted: { $ne: true },
  $or: [{ visibility: "public" }, { visibility: { $exists: false } }],
});

const mapPost = (post, { likedIds, savedIds, followingIds, commentsByPost }) => {
  const author = post.authorId;
  return {
    ...post,
    authorId: {
      _id: author._id.toString(),
      id: author._id.toString(),
      username: author.username,
      name: author.fullName || author.username,
      avatar: author.avatar || "/default-avatar.svg",
      isVerified: Boolean(author.emailVerified),
      isFollowing: followingIds.has(author._id.toString()),
    },
    isLiked: likedIds.has(post._id.toString()),
    isSaved: savedIds.has(post._id.toString()),
    comments: commentsByPost.get(post._id.toString()) || [],
    tags: post.tags || [],
    location: post.location || "",
  };
};

const mapComment = (comment) => ({
  _id: comment._id.toString(),
  content: comment.content,
  createdAt: comment.createdAt,
  author: {
    _id: comment.userId._id.toString(),
    userId: comment.userId._id.toString(),
    username: comment.userId.username,
    name: comment.userId.fullName || comment.userId.username,
    avatar: comment.userId.avatar || "/default-avatar.svg",
  },
  replies: [],
});

const getPostInteractions = async (posts, userId) => {
  const postIds = posts.map((post) => post._id);
  const authorIds = posts.map((post) => post.authorId._id);
  const [likes, bookmarks, follows, comments] = await Promise.all([
    userId ? Like.find({ userId, postId: { $in: postIds } }).select("postId").lean() : [],
    userId
      ? Bookmark.find({ userId, postId: { $in: postIds } }).select("postId").lean()
      : [],
    userId
      ? Follow.find({ followerId: userId, followingId: { $in: authorIds } })
          .select("followingId")
          .lean()
      : [],
    Comment.find({
      postId: { $in: postIds },
      parentCommentId: null,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .populate("userId", "username fullName avatar")
      .lean(),
  ]);
  const commentsByPost = new Map();
  for (const comment of comments) {
    if (!comment.userId) continue;
    const postKey = comment.postId.toString();
    const list = commentsByPost.get(postKey) || [];
    list.push(mapComment(comment));
    commentsByPost.set(postKey, list);
  }
  return {
    likedIds: new Set(likes.map((like) => like.postId.toString())),
    savedIds: new Set(bookmarks.map((bookmark) => bookmark.postId.toString())),
    followingIds: new Set(follows.map((follow) => follow.followingId.toString())),
    commentsByPost,
  };
};

router.get("/", async (req, res, next) => {
  try {
    const { category = "for-you", view = "all", q = "", sort = "trending" } = req.query;
    const filter = getPublicPostQuery();
    if (q) filter.content = { $regex: escapeRegex(String(q).trim()), $options: "i" };
    if (category !== "for-you") {
      filter.tags = { $elemMatch: { $regex: `^#?${escapeRegex(String(category))}$`, $options: "i" } };
    }

    const posts = await Post.find(filter)
      .sort(sort === "newest" ? { createdAt: -1 } : { likesCount: -1, commentsCount: -1, createdAt: -1 })
      .limit(60)
      .populate({
        path: "authorId",
        select: "username fullName avatar emailVerified isActive isPrivate",
        match: { emailVerified: true, isActive: true, isPrivate: false },
      })
      .lean();
    const visiblePosts = posts.filter((post) => {
      if (!post.authorId) return false;
      if (view === "photos") return post.media?.some((media) => media.type === "image");
      if (view === "reels") return post.media?.some((media) => media.type === "video");
      return true;
    });
    const userId = req.user?._id || req.user?.id;
    const interactions = await getPostInteractions(visiblePosts, userId);

    return res.json({
      success: true,
      category,
      view,
      count: visiblePosts.length,
      items: visiblePosts.map((post) => mapPost(post, interactions)),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/sidebar", async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const creatorIds = await Post.distinct("authorId", getPublicPostQuery());
    const users = await User.find({
      _id: { $in: creatorIds, ...(userId ? { $ne: userId } : {}) },
      isActive: true,
      emailVerified: true,
      isPrivate: false,
    })
      .select("_id username fullName avatar followersCount emailVerified")
      .sort({ followersCount: -1, createdAt: -1 })
      .limit(5)
      .lean();
    const follows = userId && users.length
      ? await Follow.find({
          followerId: userId,
          followingId: { $in: users.map((person) => person._id) },
        }).select("followingId").lean()
      : [];
    const followingIds = new Set(follows.map((follow) => follow.followingId.toString()));

    return res.json({
      success: true,
      audioTrends: [],
      communities: [],
      creators: users.map((person) => ({
        id: person._id.toString(),
        username: person.username,
        name: person.fullName || person.username,
        avatar: person.avatar || "/default-avatar.svg",
        fallback: "/default-avatar.svg",
        isVerified: Boolean(person.emailVerified),
        isFollowing: followingIds.has(person._id.toString()),
        followersCount: person.followersCount || 0,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/posts/:postId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(404).json({ success: false, message: "Explore item not found" });
    }
    const [post] = await Post.find({ _id: req.params.postId, ...getPublicPostQuery() })
      .populate({
        path: "authorId",
        select: "username fullName avatar emailVerified isActive isPrivate",
        match: { emailVerified: true, isActive: true, isPrivate: false },
      })
      .lean();
    if (!post?.authorId) {
      return res.status(404).json({ success: false, message: "Explore item not found" });
    }
    const userId = req.user?._id || req.user?.id;
    const interactions = await getPostInteractions([post], userId);
    return res.json({ success: true, post: mapPost(post, interactions) });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/posts/:postId/bookmark",
  authenticate,
  rateLimit("bookmark", 40, 60),
  async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const post = await Post.findOne({
      _id: req.params.postId,
      ...getPublicPostQuery(),
    }).select("_id authorId visibility isDeleted");
    if (
      !post ||
      !(await postService.canViewPost(post, req.user._id || req.user.id))
    ) return res.status(404).json({ success: false, message: "Post not found" });
    const userId = req.user._id || req.user.id;
    const existing = await Bookmark.findOne({ userId, postId: post._id }).select("_id");
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      return res.json({ success: true, isSaved: false });
    }
    await Bookmark.create({ userId, postId: post._id });
    return res.json({ success: true, isSaved: true });
  } catch (error) {
    if (error.code === 11000) return res.status(200).json({ success: true, isSaved: true });
    return next(error);
  }
  },
);

router.post(
  "/posts/:postId/comments",
  authenticate,
  rateLimit("comment", 20, 60),
  async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const content = String(req.body.text || "").trim();
    if (!content) return res.status(400).json({ success: false, message: "Comment text is required" });
    const comment = await commentService.addComment({
      postId: req.params.postId,
      userId: req.user._id || req.user.id,
      content,
    });
    const [post, comments] = await Promise.all([
      Post.findById(req.params.postId).select("commentsCount").lean(),
      commentService.getCommentsByPost(
        req.params.postId,
        1,
        20,
        req.user._id || req.user.id,
      ),
    ]);
    return res.status(201).json({
      success: true,
      comment: mapComment(comment),
      commentsCount: post?.commentsCount || 0,
      comments: comments.filter((item) => item.userId).map(mapComment),
    });
  } catch (error) {
    return next(error);
  }
  },
);

router.post(
  "/creators/:creatorId/follow",
  authenticate,
  rateLimit("follow", 30, 60),
  async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.creatorId)) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }
    const creator = await User.findOne({
      _id: req.params.creatorId,
      isActive: true,
      emailVerified: true,
      isPrivate: false,
    }).select("_id");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    const result = await followService.toggleFollowUser(req.user._id || req.user.id, creator._id);
    return res.json({
      success: true,
      isFollowing: result.following,
      followersCount: result.followerCount,
      },
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
