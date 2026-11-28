const commentService = require("./comment.service");

const createComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { postId, commentId } = req.params;
    const content = req.body.content || req.body.text;
    const parentCommentId = commentId || req.body.parentCommentId || null;

    const comment = await commentService.addComment({
      postId,
      userId,
      content,
      parentCommentId,
    });
    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};

const getPostComments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sort = String(req.query.sort || "newest").toLowerCase();
    const viewerId = req.user?._id || req.user?.id || null;

    const result = await commentService.getCommentsByPost(
      req.params.postId,
      page,
      limit,
      viewerId,
      sort
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getCommentReplies = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const viewerId = req.user?._id || req.user?.id || null;

    const result = await commentService.getRepliesByComment(req.params.commentId, {
      page,
      limit,
      viewerId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const content = req.body.content || req.body.text;
    const comment = await commentService.editComment({
      commentId: req.params.commentId,
      userId,
      content,
    });
    res.json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};

const removeComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await commentService.deleteComment({
      commentId: req.params.commentId,
      userId,
    });
    res.json({ success: true, message: "Comment deleted", ...result });
  } catch (err) {
    next(err);
  }
};

const toggleHide = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await commentService.toggleHideComment({
      commentId: req.params.commentId,
      userId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const reactToComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const type = req.body?.type || "like";
    const result = await commentService.toggleCommentReaction({
      commentId: req.params.commentId,
      userId,
      type,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  removeComment,
  toggleHide,
  reactToComment,
};
