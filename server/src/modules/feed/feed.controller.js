const feedService = require("./feed.service");

const getFeed = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const posts = await feedService.getUserFeed(userId, page, limit);
    res.json({ success: true, page, posts });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeed };