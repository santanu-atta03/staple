const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const store = require("../config/store");
const authenticate = require("../middleware/auth.middleware");
const User = require("../modules/users/user.model");
const Follow = require("../modules/follows/follow.model");
const followService = require("../modules/follows/follow.service");
const Post = require("../modules/posts/post.model");

router.use(authenticate.optionalAuthenticate || authenticate);

// GET Feed (supports tab='for-you' | 'following' and search query 'q')
router.get("/feed", (req, res) => {
  const { tab = "for-you", q = "" } = req.query;
  const userId = req.user.id;
  const posts = store.getFeed(tab, q, userId);
  res.json({
    success: true,
    tab,
    count: posts.length,
    posts,
  });
});

// CREATE Post
router.post("/posts", (req, res) => {
  const { content, media, tags, location } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "Post content is required" });
  }

  const post = store.createPost({
    authorId: req.user,
    content,
    media,
    tags,
    location,
  });

  if (!post) return res.status(401).json({ success: false, message: "Authentication required" });
  res.status(201).json({ success: true, post });
});

// GET Single Post
router.get("/posts/:postId", (req, res) => {
  const post = store.getPostById(req.params.postId);
  if (!post || (post.visibility && post.visibility !== "public" && !store.ownsPost(post, req.user.id))) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, post });
});

// DELETE Post
router.delete("/posts/:postId", (req, res) => {
  const success = store.deletePost(req.params.postId, req.user.id);
  if (!success) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, message: "Post deleted" });
});

// TOGGLE LIKE
router.post("/likes/:postId", (req, res) => {
  const userId = req.user.id;
  const result = store.toggleLike(req.params.postId, userId);
  if (!result) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, ...result });
});

// ADD COMMENT
router.post("/comments/:postId", (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Comment text is required" });
  }

  const result = store.addComment(req.params.postId, {
    user: req.user,
    text,
  });

  if (!result) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  res.status(201).json({ success: true, ...result });
});

// GET COMMENTS
router.get("/comments/:postId", (req, res) => {
  const post = store.getPostById(req.params.postId);
  if (!post || (post.visibility && post.visibility !== "public" && !store.ownsPost(post, req.user.id))) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  const comments = store.getComments(req.params.postId);
  res.json({ success: true, comments });
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
router.post("/posts/:postId/bookmark", (req, res) => {
  const userId = req.user.id;
  const result = store.toggleBookmark(req.params.postId, userId);
  if (!result) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, ...result });
});

// GET BOOKMARKED POSTS
router.get("/bookmarks", (req, res) => {
  const userId = req.user.id;
  const posts = store.getBookmarkedPosts(userId);
  res.json({ success: true, count: posts.length, posts });
});

// EDIT POST
router.patch("/posts/:postId", (req, res) => {
  const post = store.updatePost(req.params.postId, req.body, req.user.id);
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, post });
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
        const follows = users.length && userId && mongoose.isValidObjectId(userId)
          ? await Follow.find({
              followerId: userId,
              followingId: { $in: users.map((person) => person._id) },
            }).select("followingId").lean()
          : [];
        const followingIds = new Set(follows.map((follow) => follow.followingId.toString()));

        return res.json({
          success: true,
          people: users.map((person) => ({
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
    const userId = req.user?._id || req.user?.id || "default_user";
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.params.personId)) {
      try {
        const person = await User.findOne({
          _id: req.params.personId,
          isActive: true,
          emailVerified: true,
          isPrivate: false,
        }).select("_id username fullName avatar");
        if (person) {
          const result = await followService.toggleFollowUser(userId, person._id);
          store.toggleFollow(person._id.toString(), userId);
          return res.json({
            success: true,
            person: {
              id: person._id.toString(),
              name: person.fullName || person.username,
              username: person.username,
              avatar: person.avatar || "/default-avatar.svg",
              isFollowing: result.following,
            },
          });
        }
      } catch (dbErr) {
        // fallback
      }
    }
    const storeResult = store.toggleFollow(req.params.personId, userId);
    return res.json({
      success: true,
      person: storeResult || { id: req.params.personId, isFollowing: true },
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

// SEARCH PEOPLE
router.get("/search/people", (req, res) => {
  const { q = "" } = req.query;
  const userId = req.user?._id || req.user?.id;
  const people = store.searchUsers(q, userId);
  res.json({ success: true, count: people.length, people });
});

// SEARCH (Posts + People)
router.get("/search", (req, res) => {
  const { q = "" } = req.query;
  const userId = req.user?._id || req.user?.id;
  const posts = store.getFeed("for-you", q, userId);
  const people = store.searchUsers(q, userId);
  res.json({ success: true, query: q, posts, people });
});

module.exports = router;
