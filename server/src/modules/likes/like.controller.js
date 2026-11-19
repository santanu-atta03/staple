const likeService = require("./like.service");

const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { postId } = req.params;
    const { authorId } = req.body;

    const result = await likeService.togglePostLike({
      userId,
      postId,
      authorId,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleLike };