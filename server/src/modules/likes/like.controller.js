const likeService = require("./like.service");
const Post = require("../posts/post.model");
const { canViewPost } = require("../posts/post.service");

const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .select("authorId visibility isDeleted")
      .lean();
    if (!(await canViewPost(post, userId))) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const result = await likeService.togglePostLike({
      userId,
      postId,
      authorId: post.authorId,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleLike };