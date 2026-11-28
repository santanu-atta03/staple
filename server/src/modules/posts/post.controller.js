const postService = require("./post.service");

const createPost = async (req, res, next) => {
  try {
    const authorId = req.user._id || req.user.id;
    const { content, media, tags, taggedUsers, location, visibility, isDraft, commentsDisabled } = req.body;
    const post = await postService.createPost({
      authorId,
      content,
      media,
      tags,
      taggedUsers,
      location,
      visibility,
      isDraft,
      commentsDisabled,
    });
    res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const getPost = async (req, res, next) => {
  try {
    const result = await postService.getPostById(
      req.params.postId,
      req.user?._id || req.user?.id
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { content, media, tags, location, visibility, commentsDisabled, hideLikesCount } = req.body;
    const post = await postService.updatePost({
      postId: req.params.postId,
      userId,
      content,
      media,
      tags,
      location,
      visibility,
      commentsDisabled,
      hideLikesCount,
    });
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    await postService.deletePost({ postId: req.params.postId, userId });
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    next(err);
  }
};

const getUserPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const posts = await postService.getPostsByUser(
      req.params.userId,
      page,
      20,
      req.user?._id || req.user?.id
    );
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

const getMyDrafts = async (req, res, next) => {
  try {
    const drafts = await postService.getUserDrafts(req.user._id || req.user.id);
    res.json({ success: true, drafts });
  } catch (err) {
    next(err);
  }
};

const getMyArchived = async (req, res, next) => {
  try {
    const posts = await postService.getUserArchived(req.user._id || req.user.id);
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

const toggleArchivePost = async (req, res, next) => {
  try {
    const post = await postService.toggleArchivePost({
      postId: req.params.postId,
      userId: req.user._id || req.user.id,
    });
    res.json({ success: true, isArchived: post.isArchived, post });
  } catch (err) {
    next(err);
  }
};

const publishDraft = async (req, res, next) => {
  try {
    const post = await postService.publishDraft({
      postId: req.params.postId,
      userId: req.user._id || req.user.id,
    });
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const reportPost = async (req, res, next) => {
  try {
    const Report = require("../users/report.model");
    const reason = String(req.body?.reason || "").trim();
    if (!reason || reason.length < 3) {
      return res.status(400).json({ success: false, message: "Please provide a reason for reporting" });
    }
    const report = await Report.create({
      reporterId: req.user._id || req.user.id,
      targetType: "post",
      targetId: req.params.postId,
      reason: reason.slice(0, 500),
    });
    res.status(201).json({ success: true, reportId: report._id.toString() });
  } catch (err) {
    next(err);
  }
};

const sharePost = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await postService.sharePost({
      postId: req.params.postId,
      userId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPost,
  getPost,
  updatePost,
  deletePost,
  getUserPosts,
  getMyDrafts,
  getMyArchived,
  toggleArchivePost,
  publishDraft,
  reportPost,
  sharePost,
};