const likeService = require("./like.service");
const Post = require("../posts/post.model");
const { canViewPost } = require("../posts/post.service");

const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .select("authorId visibility isDeleted isDraft isArchived")
      .lean();
    if (!post || post.isDeleted || post.isDraft || !(await canViewPost(post, userId))) {
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

const getLikes = async (req, res, next) => {
  try {
    const viewerId = req.user?._id || req.user?.id || null;
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .select("authorId visibility isDeleted isDraft isArchived")
      .lean();
    if (!post || post.isDeleted || post.isDraft || !(await canViewPost(post, viewerId))) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const result = await likeService.getPostLikes(postId, viewerId, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleLike, getLikes };