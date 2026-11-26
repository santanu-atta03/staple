const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const rateLimit = require("../../middleware/rateLimit.middleware");
const followController = require("./follow.controller");

router.use(authMiddleware.optionalAuthenticate);

router.post(
  "/:userId",
  authMiddleware,
  rateLimit("follow", 30, 60),
  followController.toggleFollow
);
router.get("/:userId/followers", followController.getFollowers);
router.get("/:userId/following", followController.getFollowing);

module.exports = router;