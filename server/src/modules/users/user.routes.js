const router = require("express").Router();
const userController = require("./user.controller");
const authenticate = require("../../middleware/auth.middleware");

// Mount optional authentication to scope self/following/posts view
router.use(authenticate.optionalAuthenticate);

// Specific user sub-resources (before /:username parameter route)
router.get("/search", userController.searchUsers);
router.get("/suggestions", authenticate, userController.getSuggestedAccounts);
router.get("/profile/:username", userController.getProfile);
router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});
router.get("/me/follow-requests", authenticate, userController.getFollowRequests);
router.get("/me/follow-requests/sent", authenticate, userController.getSentFollowRequests);
router.delete("/me/follow-requests/:targetUsername", authenticate, userController.cancelSentFollowRequest);
router.post("/me/follow-requests/:requestId/respond", authenticate, userController.respondFollowRequest);
router.delete("/me/followers/:followerUsername", authenticate, userController.removeFollower);
router.get("/:username/mutual-followers", authenticate, userController.getMutualFollowers);
router.get("/:username/posts", userController.getUserPosts);
router.get("/:username/highlights", userController.getHighlights);
router.get("/:username/followers", userController.getFollowers);
router.get("/:username/following", userController.getFollowing);

// Profile Updates
router.patch("/me", authenticate, userController.updateMe);
router.patch("/profile", authenticate, userController.updateMe);
router.put("/profile", authenticate, userController.updateMe);
router.post("/:username/highlights", authenticate, userController.addHighlight);
router.post("/:username/follow", authenticate, userController.toggleFollow);
router.post("/:username/block", authenticate, userController.toggleBlockUser);
router.post("/:username/report", authenticate, userController.reportUser);

// Single User Profile by Username
router.get("/:username", userController.getProfile);

module.exports = router;
