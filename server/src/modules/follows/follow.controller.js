const mongoose = require("mongoose");
const followService = require("./follow.service");
const User = require("../users/user.model");
const Follow = require("./follow.model");
const store = require("../../config/store");

const toggleFollow = async (req, res, next) => {
  try {
    const followerId = req.user?._id || req.user?.id || "default_user";
    const { userId: followingId } = req.params;

    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(followingId)) {
      try {
        const target = await User.findOne({
          _id: followingId,
          isActive: true,
        }).select("_id");
        if (target) {
          const result = await followService.toggleFollowUser(followerId, target._id);
          store.toggleFollow(target._id.toString(), followerId);
          return res.json({ success: true, ...result });
        }
      } catch (dbErr) {
        // fallback to store
      }
    }

    const storeResult = store.toggleFollow(followingId, followerId);
    const following = storeResult ? storeResult.isFollowing : true;
    return res.json({
      success: true,
      following,
      followerCount: following ? 1 : 0,
    });
  } catch (err) {
    next(err);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const target = await User.findById(userId).select("_id isPrivate");
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    const viewerId = req.user?._id || req.user?.id;
    const canView = !target.isPrivate ||
      viewerId?.toString() === target._id.toString() ||
      (viewerId && await Follow.exists({ followerId: viewerId, followingId: target._id }));
    if (!canView) return res.status(404).json({ success: false, message: "User not found" });
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
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const target = await User.findById(userId).select("_id isPrivate");
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    const viewerId = req.user?._id || req.user?.id;
    const canView = !target.isPrivate ||
      viewerId?.toString() === target._id.toString() ||
      (viewerId && await Follow.exists({ followerId: viewerId, followingId: target._id }));
    if (!canView) return res.status(404).json({ success: false, message: "User not found" });
    const page = parseInt(req.query.page, 10) || 1;
    const following = await followService.getFollowingList(userId, page);
    res.json({ success: true, following });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleFollow, getFollowers, getFollowing };