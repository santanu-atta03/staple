const followService = require("./follow.service");

const toggleFollow = async (req, res, next) => {
  try {
    const followerId = req.user._id || req.user.id;
    const { userId: followingId } = req.params;

    const result = await followService.toggleFollowUser(followerId, followingId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const followers = await followService.getFollowersList(userId, page);
    res.json({ success: true, followers });
  } catch (err) {
    next(err);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const following = await followService.getFollowingList(userId, page);
    res.json({ success: true, following });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleFollow, getFollowers, getFollowing };