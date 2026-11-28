const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const rateLimit = require("../../middleware/rateLimit.middleware");
const commentController = require("./comment.controller");

router.post(
  "/:postId",
  authMiddleware,
  rateLimit("comment", 30, 60),
  commentController.createComment
);
router.post(
  "/:postId/:commentId/reply",
  authMiddleware,
  rateLimit("comment", 30, 60),
  commentController.createComment
);
router.get("/:postId", authMiddleware.optionalAuthenticate, commentController.getPostComments);
router.get("/:postId/:commentId/replies", authMiddleware.optionalAuthenticate, commentController.getCommentReplies);
router.patch("/:commentId", authMiddleware, commentController.updateComment);
router.patch("/:commentId/hide", authMiddleware, commentController.toggleHide);
router.post("/:commentId/like", authMiddleware, rateLimit("like", 40, 60), commentController.reactToComment);
router.post("/:commentId/reaction", authMiddleware, rateLimit("like", 40, 60), commentController.reactToComment);
router.delete("/:commentId", authMiddleware, commentController.removeComment);
router.delete("/:postId/:commentId", authMiddleware, commentController.removeComment);

module.exports = router;
