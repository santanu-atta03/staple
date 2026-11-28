const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const rateLimit = require("../../middleware/rateLimit.middleware");
const postController = require("./post.controller");

router.post("/", authMiddleware, rateLimit("post", 15, 60), postController.createPost);
router.get("/me/drafts", authMiddleware, postController.getMyDrafts);
router.get("/me/archived", authMiddleware, postController.getMyArchived);
router.get("/user/:userId", authMiddleware.optionalAuthenticate, postController.getUserPosts);
router.get("/:postId", authMiddleware.optionalAuthenticate, postController.getPost);
router.patch("/:postId", authMiddleware, postController.updatePost);
router.post("/:postId/archive", authMiddleware, postController.toggleArchivePost);
router.post("/:postId/publish", authMiddleware, postController.publishDraft);
router.post("/:postId/report", authMiddleware, postController.reportPost);
router.delete("/:postId", authMiddleware, postController.deletePost);

module.exports = router;