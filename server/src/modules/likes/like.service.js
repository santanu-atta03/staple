const redis = require("../../config/redis");
const Like = require("./like.model");
const Post = require("../posts/post.model");
const { socialQueue } = require("../../queues/social.queue");

const togglePostLike = async ({ userId, postId, authorId }) => {
  const likeSetKey = `post:likes:${postId}`;

  // Warm Redis set from MongoDB if key doesn't exist yet
  const exists = await redis.exists(likeSetKey);
  if (!exists) {
    const existingLikes = await Like.find({ postId }).select("userId").lean();
    if (existingLikes.length) {
      await redis.sadd(
        likeSetKey,
        ...existingLikes.map((l) => l.userId.toString())
      );
    }
    await redis.expire(likeSetKey, 86400); // 24h TTL
  }

  const alreadyLiked = await redis.sismember(likeSetKey, userId.toString());

  if (alreadyLiked) {
    await redis.srem(likeSetKey, userId.toString());
    await Like.deleteOne({ userId, postId });
    await Post.updateOne({ _id: postId }, { $inc: { likesCount: -1 } });
    await socialQueue.add("SYNC_LIKE", {
      userId: userId.toString(),
      postId: postId.toString(),
      authorId: authorId.toString(),
      action: "UNLIKE",
    });
  } else {
    await redis.sadd(likeSetKey, userId.toString());
    await Like.updateOne(
      { userId, postId },
      { $setOnInsert: { userId, postId } },
      { upsert: true }
    );
    await Post.updateOne({ _id: postId }, { $inc: { likesCount: 1 } });
    await socialQueue.add("SYNC_LIKE", {
      userId: userId.toString(),
      postId: postId.toString(),
      authorId: authorId.toString(),
      action: "LIKE",
    });
  }

  const totalLikes = await redis.scard(likeSetKey);
  return { liked: !alreadyLiked, totalLikes };
};

module.exports = { togglePostLike };