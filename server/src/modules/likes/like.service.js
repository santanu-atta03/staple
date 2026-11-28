const redis = require("../../config/redis");
const Like = require("./like.model");
const Post = require("../posts/post.model");
const Block = require("../users/block.model");
const Follow = require("../follows/follow.model");
const Notification = require("../notifications/notification.model");
const { getIO } = require("../../config/socket");
const { socialQueue } = require("../../queues/social.queue");

const togglePostLike = async ({ userId, postId, authorId }) => {
  const likeSetKey = `post:likes:${postId}`;
  const uid = userId.toString();
  const pid = postId.toString();

  // Check MongoDB directly to prevent duplicate likes or race conditions
  const deleted = await Like.findOneAndDelete({ userId, postId });
  let liked = false;

  if (deleted) {
    await redis.srem(likeSetKey, uid);
    liked = false;
  } else {
    await Like.updateOne(
      { userId, postId },
      { $setOnInsert: { userId, postId } },
      { upsert: true }
    );
    await redis.sadd(likeSetKey, uid);
    await redis.expire(likeSetKey, 86400);
    liked = true;
  }

  const totalLikes = await Like.countDocuments({ postId });
  await Post.updateOne({ _id: postId }, { $set: { likesCount: totalLikes } });

  await socialQueue.add("SYNC_LIKE", {
    userId: uid,
    postId: pid,
    authorId: authorId.toString(),
    action: liked ? "LIKE" : "UNLIKE",
  });

  const io = getIO();
  if (io) {
    io.to(`post:${pid}`).emit("post:liked", {
      postId: pid,
      userId: uid,
      liked,
      likesCount: totalLikes,
    });
  }

  // Create LIKE notification (skip self-like & avoid duplicate notification for same actor/post)
  if (liked && authorId && authorId.toString() !== uid) {
    const existingNotif = await Notification.findOne({
      recipientId: authorId,
      actorId: userId,
      type: "LIKE",
      entityId: postId,
    }).lean();

    if (!existingNotif) {
      const notification = await Notification.create({
        recipientId: authorId,
        actorId: userId,
        type: "LIKE",
        entityId: postId,
      });
      const unreadCount = await redis.incr(`notif:unread:${authorId}`);
      if (io) {
        io.to(`user:${authorId}`).emit("notification:new", {
          notification,
          unreadCount,
        });
      }
    }
  }

  return { liked, totalLikes, likesCount: totalLikes };
};

const getPostLikes = async (postId, viewerId = null, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 50);
  const skip = (safePage - 1) * safeLimit;

  let blockedUserIds = [];
  if (viewerId) {
    const blocks = await Block.find({
      $or: [{ blockerId: viewerId }, { blockedId: viewerId }],
    })
      .select("blockerId blockedId")
      .lean();
    blockedUserIds = blocks.map((b) =>
      b.blockerId.toString() === viewerId.toString() ? b.blockedId : b.blockerId
    );
  }

  const query = {
    postId,
    ...(blockedUserIds.length ? { userId: { $nin: blockedUserIds } } : {}),
  };

  const [likes, totalCount] = await Promise.all([
    Like.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("userId", "username fullName avatar emailVerified isActive")
      .lean(),
    Like.countDocuments(query),
  ]);

  const activeLikes = likes.filter((l) => l.userId && l.userId.isActive !== false);
  const likerIds = activeLikes.map((l) => l.userId._id);

  let followingSet = new Set();
  if (viewerId && likerIds.length) {
    const follows = await Follow.find({
      followerId: viewerId,
      followingId: { $in: likerIds },
    })
      .select("followingId")
      .lean();
    followingSet = new Set(follows.map((f) => f.followingId.toString()));
  }

  const users = activeLikes.map((l) => ({
    _id: l.userId._id,
    id: l.userId._id,
    username: l.userId.username,
    fullName: l.userId.fullName,
    name: l.userId.fullName || l.userId.username,
    avatar: l.userId.avatar || "/default-avatar.svg",
    isVerified: Boolean(l.userId.emailVerified),
    isFollowing: followingSet.has(l.userId._id.toString()),
    likedAt: l.createdAt,
  }));

  return {
    users,
    page: safePage,
    limit: safeLimit,
    totalCount,
    hasMore: skip + likes.length < totalCount,
  };
};

module.exports = { togglePostLike, getPostLikes };