const commentService = require("./comment.service");

const createComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { postId } = req.params;
    const { content } = req.body;

    const comment = await commentService.addComment({
      postId,
      userId,
      content,
    });
    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};

const getPostComments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const comments = await commentService.getCommentsByPost(
      req.params.postId,
      page
    );
    res.json({ success: true, comments });
  } catch (err) {
    next(err);
  }
};

const removeComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    await commentService.deleteComment({
      commentId: req.params.commentId,
      userId,
    });
    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createComment, getPostComments, removeComment };