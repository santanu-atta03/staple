const redis = require("../../config/redis");
const Follow = require("./follow.model");
const { socialQueue } = require("../../queues/social.queue");

const ensureFollowerSetWarm = async (targetUserId) => {
  const key = `followers:${targetUserId}`;
  const exists = await redis.exists(key);

  if (!exists) {
    const docs = await Follow.find({ followingId: targetUserId })
      .select("followerId")
      .lean();

    if (docs.length) {
      await redis.sadd(key, ...docs.map((d) => d.followerId.toString()));
    }
    await redis.expire(key, 86400);
  }
  return key;
};

const toggleFollowUser = async (followerId, followingId) => {
  const fId = followerId.toString();
  const tId = followingId.toString();

  if (fId === tId) {
    const err = new Error("You cannot follow yourself");
    err.statusCode = 400;
    throw err;
  }

  const followersKey = await ensureFollowerSetWarm(tId);
  const followingKey = `following:${fId}`;

  const isFollowing = await redis.sismember(followersKey, fId);

  if (isFollowing) {
    await redis.srem(followersKey, fId);
    await redis.srem(followingKey, tId);
    await socialQueue.add("SYNC_FOLLOW", {
      followerId: fId,
      followingId: tId,
      action: "UNFOLLOW",
    });
  } else {
    await redis.sadd(followersKey, fId);
    await redis.sadd(followingKey, tId);
    await socialQueue.add("SYNC_FOLLOW", {
      followerId: fId,
      followingId: tId,
      action: "FOLLOW",
    });
  }

  const followerCount = await redis.scard(followersKey);
  return { following: !isFollowing, followerCount };
};

const getFollowerIds = async (userId) => {
  const key = await ensureFollowerSetWarm(userId.toString());
  return redis.smembers(key);
};

const getFollowersList = async (userId, page = 1, limit = 20, fetchLimit = limit) => {
  const skip = (page - 1) * limit;
  const docs = await Follow.find({ followingId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(fetchLimit)
    .populate("followerId", "username fullName avatar")
    .lean();

  return docs.map((d) => d.followerId).filter(Boolean);
};

const getFollowingList = async (userId, page = 1, limit = 20, fetchLimit = limit) => {
  const skip = (page - 1) * limit;
  const docs = await Follow.find({ followerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(fetchLimit)
    .populate("followingId", "username fullName avatar")
    .lean();

  return docs.map((d) => d.followingId).filter(Boolean);
};

module.exports = {
  toggleFollowUser,
  getFollowerIds,
  getFollowersList,
  getFollowingList,
};