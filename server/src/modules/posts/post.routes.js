const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const rateLimit = require("../../middleware/rateLimit.middleware");
const postController = require("./post.controller");

router.post("/", authMiddleware, rateLimit("post", 15, 60), postController.createPost);
router.get("/user/:userId", authMiddleware.optionalAuthenticate, postController.getUserPosts);
router.get("/:postId", authMiddleware.optionalAuthenticate, postController.getPost);
router.patch("/:postId", authMiddleware, postController.updatePost);
router.delete("/:postId", authMiddleware, postController.deletePost);

module.exports = router;