const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const rateLimit = require("../../middleware/rateLimit.middleware");
const likeController = require("./like.controller");

router.get("/:postId", authMiddleware.optionalAuthenticate, likeController.getLikes);

router.post(
  "/:postId",
  authMiddleware,
  rateLimit("like", 40, 60),
  likeController.toggleLike
);

module.exports = router;