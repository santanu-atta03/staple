const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const store = require("../config/store");
const authenticate = require("../middleware/auth.middleware");
const User = require("../modules/users/user.model");
const Follow = require("../modules/follows/follow.model");
const followService = require("../modules/follows/follow.service");
const Post = require("../modules/posts/post.model");
const Like = require("../modules/likes/like.model");
const Bookmark = require("../modules/bookmarks/bookmark.model");
const Comment = require("../modules/comments/comment.model");
const postService = require("../modules/posts/post.service");
const feedService = require("../modules/feed/feed.service");

router.use(authenticate);

// GET Feed (supports tab='for-you' | 'following' | 'recommended', q, page, limit)
router.get("/feed", async (req, res, next) => {
  try {
    const { tab = "for-you", q = "", page = 1, limit = 12 } = req.query;
    const userId = req.user.id;
    if (mongoose.connection.readyState === 1) {
      const result = await feedService.getRankedHomeFeed(userId, { tab, q, page, limit });
      return res.json({
        success: true,
        tab,
        count: result.posts.length,
        hasMore: result.hasMore,
        page: result.page,
        nextCursor: result.nextCursor,
        posts: result.posts,
      });
    }
    const posts = store.getFeed(tab, q, userId);
    return res.json({
      success: true,
      tab,
      count: posts.length,
      hasMore: false,
      page: 1,
      posts,
    });
  } catch (err) {
    return next(err);
  }
});

// CREATE Post
router.post("/posts", async (req, res, next) => {
  try {
    const { content = "", media = [], tags = [], taggedUsers = [], location = "", visibility = "public", isDraft = false } = req.body;
    if (!String(content).trim() && (!Array.isArray(media) || media.length === 0)) {
      return res.status(400).json({ success: false, message: "Post content or media is required" });
    }

    if (mongoose.connection.readyState === 1) {
      const post = await postService.createPost({
        authorId: req.user.id,
        content: String(content).trim(),
        media,
        tags,
        taggedUsers,
        location,
        visibility,
        isDraft,
      });
      return res.status(201).json({ success: true, post });
    }

    const post = store.createPost({
      authorId: req.user,
      content,
      media,
      tags,
      location,
    });

    if (!post) return res.status(401).json({ success: false, message: "Authentication required" });
    return res.status(201).json({ success: true, post });
  } catch (err) {
    return next(err);
  }
});

// GET Single Post
router.get("/posts/:postId", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.postId)) {
      const result = await postService.getPostById(req.params.postId, req.user.id);
      return res.json({ success: true, post: result.post });
    }
    const post = store.getPostById(req.params.postId);
    if (!post || (post.visibility && post.visibility !== "public" && !store.ownsPost(post, req.user.id))) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    return res.json({ success: true, post });
  } catch (err) {
    return next(err);
  }
});

// DELETE Post
router.delete("/posts/:postId", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.postId)) {
      await postService.deletePost({ postId: req.params.postId, userId: req.user.id });
      return res.json({ success: true, message: "Post deleted" });
    }
    const success = store.deletePost(req.params.postId, req.user.id);
    if (!success) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    return res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    return next(err);
  }
});

// TOGGLE LIKE
router.post("/likes/:postId", async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.postId)) {
      const post = await Post.findById(req.params.postId);
      if (!post || !(await postService.canViewPost(post, userId))) {
        return res.status(404).json({ success: false, message: "Post not found" });
      }
      const existing = await Like.findOne({ userId, postId: post._id });
      let isLiked = false;
      if (existing) {
        await Like.deleteOne({ _id: existing._id });
        isLiked = false;
      } else {
        await Like.create({ userId, postId: post._id });
        isLiked = true;
      }
      const likesCount = await Like.countDocuments({ postId: post._id });
      post.likesCount = likesCount;
      await post.save();
      return res.json({ success: true, isLiked, likesCount });
    }
    const result = store.toggleLike(req.params.postId, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// ADD COMMENT
router.post("/comments/:postId", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.postId)) {
      const post = await Post.findById(req.params.postId);
      if (!post || !(await postService.canViewPost(post, req.user.id))) {
        return res.status(404).json({ success: false, message: "Post not found" });
      }
      const comment = await Comment.create({
        postId: post._id,
        userId: req.user.id,
        content: text.trim(),
      });
      await comment.populate("userId", "username fullName avatar");
      const commentsCount = await Comment.countDocuments({ postId: post._id, isDeleted: { $ne: true } });
      post.commentsCount = commentsCount;
      await post.save();
      return res.status(201).json({
        success: true,
        commentsCount,
        comment: {
          id: comment._id.toString(),
          _id: comment._id.toString(),
          text: comment.content,
          content: comment.content,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId._id.toString(),
            username: comment.userId.username,
            name: comment.userId.fullName || comment.userId.username,
            avatar: comment.userId.avatar || "/default-avatar.svg",
          },
        },
      });
    }

    const result = store.addComment(req.params.postId, {
      user: req.user,
      text,
    });
    if (!result) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET COMMENTS
router.get("/comments/:postId", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.postId)) {
      const post = await Post.findById(req.params.postId).lean();
      if (!post || !(await postService.canViewPost(post, req.user.id))) {
        return res.status(404).json({ success: false, message: "Post not found" });
      }
      const docs = await Comment.find({ postId: post._id, isDeleted: { $ne: true } })
        .sort({ createdAt: 1 })
        .populate("userId", "username fullName avatar")
        .lean();
      return res.json({
        success: true,
        comments: docs
          .filter((c) => c.userId)
          .map((c) => ({
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
          })),
      });
    }
    const post = store.getPostById(req.params.postId);
    if (!post || (post.visibility && post.visibility !== "public" && !store.ownsPost(post, req.user.id))) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const comments = store.getComments(req.params.postId);
    return res.json({ success: true, comments });
  } catch (err) {
    return next(err);
  }
});

// VOTE ON POLL
router.post("/posts/:postId/poll", (req, res) => {
  const { optionId } = req.body;
  if (!optionId) {
    return res.status(400).json({ success: false, message: "optionId is required" });
  }

  const poll = store.votePoll(req.params.postId, optionId, req.user.id);
  if (!poll) {
    return res.status(404).json({ success: false, message: "Poll or post not found" });
  }

  res.json({ success: true, poll });
});

// TOGGLE BOOKMARK
router.post("/posts/:postId/bookmark", async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.postId)) {
      const post = await Post.findById(req.params.postId).lean();
      if (!post || !(await postService.canViewPost(post, userId))) {
        return res.status(404).json({ success: false, message: "Post not found" });
      }
      const existing = await Bookmark.findOne({ userId, postId: post._id });
      let isSaved = false;
      if (existing) {
        await Bookmark.deleteOne({ _id: existing._id });
        isSaved = false;
      } else {
        await Bookmark.create({ userId, postId: post._id });
        isSaved = true;
      }
      return res.json({ success: true, isSaved });
    }
    const result = store.toggleBookmark(req.params.postId, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET BOOKMARKED POSTS
router.get("/bookmarks", async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(userId)) {
      const bookmarks = await Bookmark.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate({
          path: "postId",
          populate: { path: "authorId", select: "username fullName avatar isPrivate" },
        })
        .lean();
      const visible = [];
      for (const b of bookmarks) {
        if (b.postId && (await postService.canViewPost(b.postId, userId))) {
          visible.push({
            ...b.postId,
            id: b.postId._id.toString(),
            _id: b.postId._id.toString(),
            isSaved: true,
          });
        }
      }
      return res.json({ success: true, count: visible.length, posts: visible });
    }
    const posts = store.getBookmarkedPosts(userId);
    return res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    return next(err);
  }
});

// EDIT POST
router.patch("/posts/:postId", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.postId)) {
      const post = await postService.updatePost({
        postId: req.params.postId,
        userId: req.user.id,
        content: req.body.content,
        media: req.body.media,
        tags: req.body.tags,
        location: req.body.location,
      });
      return res.json({ success: true, post });
    }
    const post = store.updatePost(req.params.postId, req.body, req.user.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    return res.json({ success: true, post });
  } catch (err) {
    return next(err);
  }
});

// ADD REPLY TO COMMENT
router.post("/comments/:postId/:commentId/reply", (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Reply text is required" });
  }
  const result = store.addReply(req.params.postId, req.params.commentId, {
    user: req.user,
    text,
  });
  if (!result) {
    return res.status(404).json({ success: false, message: "Comment or post not found" });
  }
  res.status(201).json({ success: true, ...result });
});

// DELETE COMMENT
router.delete("/comments/:postId/:commentId", (req, res) => {
  const success = store.deleteComment(req.params.postId, req.params.commentId, req.user.id);
  if (!success) {
    return res.status(404).json({ success: false, message: "Comment not found" });
  }
  res.json({ success: true, message: "Comment deleted" });
});

// TOGGLE AUDIO
router.post("/posts/:postId/audio", (req, res) => {
  const audio = store.toggleAudio(req.params.postId);
  if (!audio) {
    return res.status(404).json({ success: false, message: "Audio or post not found" });
  }
  res.json({ success: true, audio });
});

// STORIES
router.get("/stories", (req, res) => {
  const stories = store.getStories(req.user.id);
  res.json({ success: true, stories });
});

router.post("/stories/:storyId/view", (req, res) => {
  const story = store.viewStory(req.params.storyId, req.user.id);
  res.json({ success: true, story });
});

router.post("/stories", (req, res) => {
  const story = store.addStory(req.body, req.user);
  if (!story) return res.status(400).json({ success: false, message: "Could not create story" });
  res.status(201).json({ success: true, story });
});

router.delete("/stories/:storyId", (req, res) => {
  if (!store.deleteStory(req.params.storyId, req.user.id)) {
    return res.status(404).json({ success: false, message: "Story not found" });
  }
  res.json({ success: true, message: "Story deleted" });
});

// GROUPS
router.get("/groups", (req, res) => {
  res.json({ success: true, groups: store.getGroups(req.user.id) });
});

router.get("/groups/:groupId", (req, res) => {
  const group = store.getGroupById(req.params.groupId, req.user.id);
  if (!group) return res.status(404).json({ success: false, message: "Group not found" });
  res.json({ success: true, group });
});

router.post("/groups", (req, res) => {
  const { name, category, description, isPrivate } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Group name is required" });
  }
  const group = store.createGroup({ name, category, description, isPrivate }, req.user.id);
  if (!group) return res.status(400).json({ success: false, message: "Could not create group" });
  res.status(201).json({ success: true, group });
});

// USER PROFILE
router.get("/users/profile", (req, res) => {
  res.json({ success: true, user: store.findUser(req.user.id) });
});

router.patch("/users/profile", (req, res) => {
  const updated = store.updateProfileSettings(req.user.id, req.body);
  res.json({ success: true, user: updated.user });
});

// SIDEBAR SUGGESTIONS
router.get("/sidebar", async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (mongoose.connection.readyState === 1) {
      try {
        const [users, trends] = await Promise.all([
          User.find({
            ...(userId && mongoose.isValidObjectId(userId) ? { _id: { $ne: userId } } : {}),
            isActive: true,
            emailVerified: true,
            isPrivate: false,
          })
            .select("_id username fullName avatar")
            .sort({ createdAt: -1 })
            .limit(3)
            .lean(),
          Post.aggregate([
            {
              $match: {
                isDeleted: { $ne: true },
                $or: [{ visibility: "public" }, { visibility: { $exists: false } }],
                tags: { $exists: true, $ne: [] },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "authorId",
                foreignField: "_id",
                as: "author",
              },
            },
            { $unwind: "$author" },
            {
              $match: {
                "author.emailVerified": true,
                "author.isActive": true,
                "author.isPrivate": false,
              },
            },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 5 },
          ]),
        ]);
        const filteredUsers = users.filter(
          (person) => !userId || person._id.toString() !== userId.toString()
        );
        const follows = filteredUsers.length && userId && mongoose.isValidObjectId(userId)
          ? await Follow.find({
              followerId: userId,
              followingId: { $in: filteredUsers.map((person) => person._id) },
            }).select("followingId").lean()
          : [];
        const followingIds = new Set(follows.map((follow) => follow.followingId.toString()));

        return res.json({
          success: true,
          people: filteredUsers.map((person) => ({
            id: person._id.toString(),
            name: person.fullName || person.username,
            username: person.username,
            avatar: person.avatar || "/default-avatar.svg",
            isFollowing: followingIds.has(person._id.toString()),
          })),
          trending: trends.map((trend, index) => ({
            id: `tag_${index}`,
            tag: trend._id,
            count: `${trend.count} posts`,
          })),
          groups: store.getGroups(userId),
        });
      } catch (dbErr) {
        // Fall back to store
      }
    }

    const fallback = store.getSidebarData(userId);
    return res.json({ success: true, ...fallback });
  } catch (error) {
    return next(error);
  }
});

router.post("/sidebar/follow/:personId", async (req, res, next) => {
  try {
    const userId = (req.user?._id || req.user?.id || "").toString();
    const targetParam = req.params.personId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (userId === targetParam.toString()) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(targetParam)) {
      try {
        const person = await User.findOne({
          _id: targetParam,
          isActive: true,
          emailVerified: true,
          isPrivate: false,
        }).select("_id username fullName avatar");
        if (person) {
          const targetId = person._id.toString();
          const existing = await Follow.findOne({ followerId: userId, followingId: targetId });
          let isFollowing = false;
          if (existing) {
            await Follow.deleteOne({ _id: existing._id });
            isFollowing = false;
          } else {
            await Follow.create({ followerId: userId, followingId: targetId });
            isFollowing = true;
          }
          const [targetFollowersCount, viewerFollowingCount] = await Promise.all([
            Follow.countDocuments({ followingId: targetId }),
            Follow.countDocuments({ followerId: userId }),
          ]);
          await Promise.all([
            User.findByIdAndUpdate(targetId, { $set: { followersCount: targetFollowersCount } }),
            User.findByIdAndUpdate(userId, { $set: { followingCount: viewerFollowingCount } }),
          ]);
          store.toggleFollow(targetId, userId);

          if (isFollowing) {
            const actor = await User.findById(userId).select("username fullName avatar").lean();
            if (!Array.isArray(store.data.notifications)) store.data.notifications = [];
            const alreadyNotified = store.data.notifications.some(
              (n) => n.recipientId === targetId && n.senderId === userId && n.type === "follow" && !n.isRead
            );
            if (!alreadyNotified) {
              store.data.notifications.unshift({
                id: `notif_follow_${userId}_${Date.now()}`,
                recipientId: targetId,
                senderId: userId,
                section: "today",
                type: "follow",
                unread: true,
                isRead: false,
                user: actor?.username || "user",
                avatar: actor?.avatar || "/default-avatar.svg",
                badgeType: "friend",
                titlePrefix: actor?.fullName || actor?.username || "Someone",
                userName: actor?.fullName || actor?.username || "Someone",
                titleSuffix: " started following you.",
                subtext: "Just now",
                time: "Just now",
                isFriendRequest: false,
                createdAt: new Date().toISOString(),
              });
              store.saveData();
            }
          }

          try {
            const { getIO } = require("../config/socket");
            const io = getIO();
            if (io) {
              io.to(`user:${userId}`).emit("follow:updated", {
                targetUsername: person.username,
                isFollowing,
                followersCount: targetFollowersCount,
                followingCount: viewerFollowingCount,
              });
              io.to(`user:${targetId}`).emit("follow:updated", {
                targetUsername: person.username,
                isFollowing,
                followersCount: targetFollowersCount,
              });
              if (isFollowing) {
                io.to(`user:${targetId}`).emit("notification:new", {
                  unreadCount: store.getNotificationUnreadCount(targetId),
                });
              }
            }
          } catch {}

          return res.json({
            success: true,
            person: {
              id: targetId,
              name: person.fullName || person.username,
              username: person.username,
              avatar: person.avatar || "/default-avatar.svg",
              isFollowing,
              followersCount: targetFollowersCount,
            },
          });
        }
      } catch (dbErr) {
        // fallback
      }
    }
    const storeResult = store.toggleFollow(targetParam, userId);
    if (!storeResult) {
      return res.status(400).json({ success: false, message: "Cannot follow this user" });
    }
    return res.json({
      success: true,
      person: storeResult,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/sidebar/join-group/:groupId", (req, res) => {
  const group = store.toggleGroup(req.params.groupId, req.user.id);
  if (!group) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }
  res.json({ success: true, group });
});

// Helper to search users across MongoDB + store without excluding followed users
async function searchRegisteredUsers(query, viewerId) {
  const q = String(query || "").trim();
  const viewerIdStr = viewerId ? viewerId.toString() : null;
  const results = [];
  const seen = new Set();

  if (mongoose.connection.readyState === 1 && q.length >= 1) {
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const users = await User.find({
        ...(viewerIdStr && mongoose.isValidObjectId(viewerIdStr)
          ? { _id: { $ne: viewerIdStr } }
          : {}),
        isActive: true,
        emailVerified: true,
        $or: [
          { username: { $regex: escaped, $options: "i" } },
          { fullName: { $regex: escaped, $options: "i" } },
        ],
      })
        .select("_id username fullName avatar bio")
        .limit(20)
        .lean();

      const follows =
        users.length && viewerIdStr && mongoose.isValidObjectId(viewerIdStr)
          ? await Follow.find({
              followerId: viewerIdStr,
              followingId: { $in: users.map((u) => u._id) },
            })
              .select("followingId")
              .lean()
          : [];
      const followingIds = new Set(follows.map((f) => f.followingId.toString()));

      users.forEach((u) => {
        const uid = u._id.toString();
        const isFollowing = followingIds.has(uid);
        seen.add(uid);
        seen.add((u.username || "").toLowerCase());
        results.push({
          id: uid,
          _id: uid,
          name: u.fullName || u.username,
          username: u.username,
          avatar: u.avatar || "/default-avatar.svg",
          bio: u.bio || "",
          subtitle: `@${u.username}`,
          isFollowing,
          friendStatus: isFollowing ? "friends" : "idle",
        });
      });
    } catch {}
  }

  const storeMatches = store.searchUsers(q, viewerIdStr);
  storeMatches.forEach((p) => {
    const pid = (p.id || p._id || "").toString();
    const uname = (p.username || "").toLowerCase();
    if (!seen.has(pid) && (!uname || !seen.has(uname))) {
      seen.add(pid);
      if (uname) seen.add(uname);
      results.push(p);
    }
  });

  return results;
}

// SEARCH PEOPLE
router.get("/search/people", async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const userId = req.user?._id || req.user?.id;
    const people = await searchRegisteredUsers(q, userId);
    res.json({ success: true, count: people.length, people });
  } catch (err) {
    next(err);
  }
});

// SEARCH (Posts + People)
router.get("/search", async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const userId = req.user?._id || req.user?.id;
    const posts = store.getFeed("for-you", q, userId);
    const people = await searchRegisteredUsers(q, userId);
    res.json({ success: true, query: q, posts, people });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
