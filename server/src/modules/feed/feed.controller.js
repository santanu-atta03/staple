const feedService = require("./feed.service");

const getFeed = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const tab = String(req.query.tab || "for-you").toLowerCase();
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 12), 50);

    const result = await feedService.getRankedHomeFeed(userId, { tab, q, page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeed };