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
router.get("/:postId", authMiddleware.optionalAuthenticate, commentController.getPostComments);
router.delete("/:commentId", authMiddleware, commentController.removeComment);

module.exports = router;