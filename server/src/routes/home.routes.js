const express = require("express");
const router = express.Router();
const store = require("../config/store");

// GET Feed (supports tab='for-you' | 'following' and search query 'q')
router.get("/feed", (req, res) => {
  const { tab = "for-you", q = "" } = req.query;
  const posts = store.getFeed(tab, q);
  res.json({
    success: true,
    tab,
    count: posts.length,
    posts,
  });
});

// CREATE Post
router.post("/posts", (req, res) => {
  const { content, media, tags, location, author } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "Post content is required" });
  }

  const post = store.createPost({
    authorId: author || req.user || store.currentUser,
    content,
    media,
    tags,
    location,
  });

  res.status(201).json({ success: true, post });
});

// GET Single Post
router.get("/posts/:postId", (req, res) => {
  const post = store.getPostById(req.params.postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, post });
});

// DELETE Post
router.delete("/posts/:postId", (req, res) => {
  const success = store.deletePost(req.params.postId);
  if (!success) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, message: "Post deleted" });
});

// TOGGLE LIKE
router.post("/likes/:postId", (req, res) => {
  const result = store.toggleLike(req.params.postId);
  if (!result) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, ...result });
});

// ADD COMMENT
router.post("/comments/:postId", (req, res) => {
  const { text, author } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Comment text is required" });
  }

  const result = store.addComment(req.params.postId, {
    user: author || req.user || store.currentUser,
    text,
  });

  if (!result) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  res.status(201).json({ success: true, ...result });
});

// GET COMMENTS
router.get("/comments/:postId", (req, res) => {
  const comments = store.getComments(req.params.postId);
  res.json({ success: true, comments });
});

// VOTE ON POLL
router.post("/posts/:postId/poll", (req, res) => {
  const { optionId } = req.body;
  if (!optionId) {
    return res.status(400).json({ success: false, message: "optionId is required" });
  }

  const poll = store.votePoll(req.params.postId, optionId);
  if (!poll) {
    return res.status(404).json({ success: false, message: "Poll or post not found" });
  }

  res.json({ success: true, poll });
});

// TOGGLE BOOKMARK
router.post("/posts/:postId/bookmark", (req, res) => {
  const result = store.toggleBookmark(req.params.postId);
  if (!result) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, ...result });
});

// GET BOOKMARKED POSTS
router.get("/bookmarks", (req, res) => {
  const posts = store.getBookmarkedPosts();
  res.json({ success: true, count: posts.length, posts });
});

// EDIT POST
router.patch("/posts/:postId", (req, res) => {
  const post = store.updatePost(req.params.postId, req.body);
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  res.json({ success: true, post });
});

// ADD REPLY TO COMMENT
router.post("/comments/:postId/:commentId/reply", (req, res) => {
  const { text, author } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Reply text is required" });
  }
  const result = store.addReply(req.params.postId, req.params.commentId, {
    user: author || req.user || store.currentUser,
    text,
  });
  if (!result) {
    return res.status(404).json({ success: false, message: "Comment or post not found" });
  }
  res.status(201).json({ success: true, ...result });
});

// DELETE COMMENT
router.delete("/comments/:postId/:commentId", (req, res) => {
  const success = store.deleteComment(req.params.postId, req.params.commentId);
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
  const stories = store.getStories();
  res.json({ success: true, stories });
});

router.post("/stories/:storyId/view", (req, res) => {
  const story = store.viewStory(req.params.storyId);
  res.json({ success: true, story });
});

router.post("/stories", (req, res) => {
  const story = store.addStory(req.body);
  res.status(201).json({ success: true, story });
});

router.delete("/stories/:storyId", (req, res) => {
  store.deleteStory(req.params.storyId);
  res.json({ success: true, message: "Story deleted" });
});

// GROUPS
router.get("/groups", (req, res) => {
  res.json({ success: true, groups: store.getGroups() });
});

router.get("/groups/:groupId", (req, res) => {
  const group = store.getGroupById(req.params.groupId);
  if (!group) return res.status(404).json({ success: false, message: "Group not found" });
  res.json({ success: true, group });
});

router.post("/groups", (req, res) => {
  const { name, category, description, isPrivate } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Group name is required" });
  }
  const group = store.createGroup({ name, category, description, isPrivate });
  res.status(201).json({ success: true, group });
});

// USER PROFILE
router.get("/users/profile", (req, res) => {
  res.json({ success: true, user: store.currentUser });
});

router.patch("/users/profile", (req, res) => {
  const updated = store.updateProfile(req.body);
  res.json({ success: true, user: updated });
});

// SIDEBAR SUGGESTIONS
router.get("/sidebar", (req, res) => {
  const data = store.getSidebarData();
  res.json({ success: true, ...data });
});

router.post("/sidebar/follow/:personId", (req, res) => {
  const person = store.toggleFollow(req.params.personId);
  if (!person) {
    return res.status(404).json({ success: false, message: "Person not found" });
  }
  res.json({ success: true, person });
});

router.post("/sidebar/join-group/:groupId", (req, res) => {
  const group = store.toggleGroup(req.params.groupId);
  if (!group) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }
  res.json({ success: true, group });
});

// SEARCH
router.get("/search", (req, res) => {
  const { q = "" } = req.query;
  const posts = store.getFeed("for-you", q);
  const people = store.people.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.username.toLowerCase().includes(q.toLowerCase())
  );
  res.json({ success: true, query: q, posts, people });
});

module.exports = router;
