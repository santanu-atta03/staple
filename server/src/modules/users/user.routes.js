const router = require("express").Router();
const userController = require("./user.controller");
const authenticate = require("../../middleware/auth.middleware");

// Mount optional authentication to scope self/following/posts view
router.use(authenticate.optionalAuthenticate);

// Specific user sub-resources (before /:username parameter route)
router.get("/search", userController.searchUsers);
router.get("/profile/:username", userController.getProfile);
router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});
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

// Single User Profile by Username
router.get("/:username", userController.getProfile);

module.exports = router;
