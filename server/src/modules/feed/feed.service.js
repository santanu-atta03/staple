const mongoose = require("mongoose");
const redis = require("../../config/redis");
const Feed = require("./feed.model");
const Post = require("../posts/post.model");
const User = require("../users/user.model");
const Follow = require("../follows/follow.model");
const Block = require("../users/block.model");
const Like = require("../likes/like.model");
const Bookmark = require("../bookmarks/bookmark.model");
const Comment = require("../comments/comment.model");
const { canViewPost } = require("../posts/post.service");

const RANKING_WEIGHTS = {
  FOLLOW_BOOST: 35,
  RECENCY_MAX: 40,
  RECENCY_HALF_LIFE_HOURS: 12,
  ENGAGEMENT_SCALE: 6,
  ENGAGEMENT_CAP: 30,
  TAG_AFFINITY: 15,
  CREATOR_AFFINITY: 12,
};

function computePostScore(post, { followingSet, preferredTags, interactedCreators }) {
  const authorId = (post.authorId?._id || post.authorId || "").toString();
  const isFollowing = followingSet.has(authorId);
  const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt || Date.now()).getTime()) / 3600000);

  const recencyScore = RANKING_WEIGHTS.RECENCY_MAX / (1 + ageHours / RANKING_WEIGHTS.RECENCY_HALF_LIFE_HOURS);
  const engagementRaw = (post.likesCount || 0) * 2 + (post.commentsCount || 0) * 3;
  const engagementScore = Math.min(
    RANKING_WEIGHTS.ENGAGEMENT_CAP,
    Math.log1p(engagementRaw) * RANKING_WEIGHTS.ENGAGEMENT_SCALE
  );

  let tagAffinityScore = 0;
  for (const tag of post.tags || []) {
    if (preferredTags.has(String(tag).toLowerCase())) {
      tagAffinityScore += RANKING_WEIGHTS.TAG_AFFINITY;
    }
  }
  tagAffinityScore = Math.min(30, tagAffinityScore);

  const creatorScore = interactedCreators.has(authorId) ? RANKING_WEIGHTS.CREATOR_AFFINITY : 0;
  const followScore = isFollowing ? RANKING_WEIGHTS.FOLLOW_BOOST : 0;

  return followScore + recencyScore + engagementScore + tagAffinityScore + creatorScore;
}

const getRankedHomeFeed = async (userId, { tab = "for-you", q = "", page = 1, limit = 12 } = {}) => {
  const viewerId = userId?.toString();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(30, Math.max(1, Number(limit) || 12));

  // 1. Load user's social graph, blocks, and interaction signals in parallel
  const [followingDocs, blockDocs, recentLikes, recentBookmarks] = await Promise.all([
    viewerId && mongoose.isValidObjectId(viewerId)
      ? Follow.find({ followerId: viewerId }).select("followingId").lean()
      : [],
    viewerId && mongoose.isValidObjectId(viewerId)
      ? Block.find({ $or: [{ blockerId: viewerId }, { blockedId: viewerId }] })
          .select("blockerId blockedId")
          .lean()
      : [],
    viewerId && mongoose.isValidObjectId(viewerId)
      ? Like.find({ userId: viewerId }).sort({ createdAt: -1 }).limit(30).select("postId").lean()
      : [],
    viewerId && mongoose.isValidObjectId(viewerId)
      ? Bookmark.find({ userId: viewerId }).sort({ createdAt: -1 }).limit(20).select("postId").lean()
      : [],
  ]);

  const followingIds = followingDocs.map((d) => d.followingId.toString());
  const followingSet = new Set(followingIds);

  const blockedSet = new Set();
  blockDocs.forEach((b) => {
    blockedSet.add(b.blockerId.toString());
    blockedSet.add(b.blockedId.toString());
  });
  if (viewerId) blockedSet.delete(viewerId);

  // Build user interest profile from liked/bookmarked posts
  const signalPostIds = Array.from(
    new Set([...recentLikes.map((l) => l.postId), ...recentBookmarks.map((b) => b.postId)])
  );
  const signalPosts = signalPostIds.length
    ? await Post.find({ _id: { $in: signalPostIds } }).select("tags authorId").lean()
    : [];
  const preferredTags = new Set();
  const interactedCreators = new Set();
  signalPosts.forEach((sp) => {
    (sp.tags || []).forEach((t) => preferredTags.add(String(t).toLowerCase()));
    if (sp.authorId) interactedCreators.add(sp.authorId.toString());
  });

  // 2. Build MongoDB query according to feed tab
  const query = {
    isDeleted: { $ne: true },
    isDraft: { $ne: true },
    isArchived: { $ne: true },
  };

  if (blockedSet.size > 0) {
    query.authorId = { $nin: Array.from(blockedSet) };
  }

  if (tab === "following") {
    const allowedAuthors = viewerId ? [viewerId, ...followingIds] : [];
    const filtered = allowedAuthors.filter((id) => !blockedSet.has(id));
    if (!filtered.length) {
      return { posts: [], hasMore: false, page: safePage };
    }
    query.authorId = { $in: filtered };
  } else if (tab === "recommended") {
    const excluded = new Set([...blockedSet, ...(viewerId ? [viewerId] : []), ...followingIds]);
    query.authorId = { $nin: Array.from(excluded) };
    query.$or = [{ visibility: "public" }, { visibility: { $exists: false } }];
  }

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { content: { $regex: escaped, $options: "i" } },
        { location: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
      ],
    });
  }

  // Fetch candidate window (bounded, never entire collection)
  const candidateWindow = Math.min(120, safePage * safeLimit + safeLimit * 2);
  const candidates = await Post.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(candidateWindow)
    .populate("authorId", "username fullName avatar isPrivate isActive isSuspended deletedAt emailVerified")
    .lean();

  // Filter strictly by author status, privacy, and visibility
  const eligible = [];
  for (const post of candidates) {
    const author = post.authorId;
    if (!author || author.deletedAt || author.isSuspended || author.isActive === false) continue;
    if (await canViewPost(post, viewerId)) {
      eligible.push(post);
    }
  }

  // Score & sort (chronological for "following", ranked for "for-you" and "recommended")
  if (tab !== "following") {
    eligible.sort((a, b) => {
      const scoreB = computePostScore(b, { followingSet, preferredTags, interactedCreators });
      const scoreA = computePostScore(a, { followingSet, preferredTags, interactedCreators });
      return scoreB - scoreA;
    });
  }

  // Paginate cleanly without duplicates
  const start = (safePage - 1) * safeLimit;
  const pageSlice = eligible.slice(start, start + safeLimit);
  const hasMore = eligible.length > start + safeLimit;

  if (!pageSlice.length) {
    return { posts: [], hasMore: false, page: safePage };
  }

  // 3. Batch-hydrate likes, bookmarks, and comments (zero N+1)
  const pagePostIds = pageSlice.map((p) => p._id);
  const [viewerLikes, viewerBookmarks, comments] = await Promise.all([
    viewerId && mongoose.isValidObjectId(viewerId)
      ? Like.find({ userId: viewerId, postId: { $in: pagePostIds } }).select("postId").lean()
      : [],
    viewerId && mongoose.isValidObjectId(viewerId)
      ? Bookmark.find({ userId: viewerId, postId: { $in: pagePostIds } }).select("postId").lean()
      : [],
    Comment.find({
      postId: { $in: pagePostIds },
      parentCommentId: null,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("userId", "username fullName avatar")
      .lean(),
  ]);

  const likedPostSet = new Set(viewerLikes.map((l) => l.postId.toString()));
  const savedPostSet = new Set(viewerBookmarks.map((b) => b.postId.toString()));
  const commentsByPost = new Map();
  comments.forEach((c) => {
    const pid = c.postId.toString();
    if (!commentsByPost.has(pid)) commentsByPost.set(pid, []);
    const arr = commentsByPost.get(pid);
    if (arr.length < 3 && c.userId) {
      arr.push({
        id: c._id.toString(),
        _id: c._id.toString(),
        text: c.content,
        content: c.content,
        createdAt: c.createdAt,
        author: {
          id: c.userId._id.toString(),
          username: c.userId.username,
          name: c.userId.fullName || c.userId.username,
          avatar: c.userId.avatar || "/default-avatar.svg",
        },
      });
    }
  });

  const hydrated = pageSlice.map((post) => {
    const pid = post._id.toString();
    const author = post.authorId;
    const authorIdStr = author._id.toString();
    const isOwner = Boolean(viewerId && authorIdStr === viewerId);
    const isFollowing = followingSet.has(authorIdStr);
    return {
      ...post,
      id: pid,
      _id: pid,
      authorId: {
        _id: authorIdStr,
        id: authorIdStr,
        username: author.username,
        name: author.fullName || author.username,
        avatar: author.avatar || "/default-avatar.svg",
        isVerified: Boolean(author.emailVerified),
        isFollowing,
      },
      isLiked: likedPostSet.has(pid),
      isSaved: savedPostSet.has(pid),
      isSuggested: !isOwner && !isFollowing,
      comments: commentsByPost.get(pid) || [],
    };
  });

  return {
    posts: hydrated,
    hasMore,
    page: safePage,
    nextCursor: hydrated[hydrated.length - 1]?.createdAt || null,
  };
};

// Keep legacy getUserFeed for feed.routes.js compatibility
const getUserFeed = async (userId, page = 1, limit = 20) => {
  const res = await getRankedHomeFeed(userId, { tab: "for-you", page, limit });
  return res.posts;
};

module.exports = { getUserFeed, getRankedHomeFeed, computePostScore };
