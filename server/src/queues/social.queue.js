const { Queue, Worker } = require("bullmq");
const redis = require("../config/redis");
const bullRedis = require("../config/redis.bullmq");
const Like = require("../modules/likes/like.model");
const Follow = require("../modules/follows/follow.model");
const Notification = require("../modules/notifications/notification.model");
const Feed = require("../modules/feed/feed.model");
const { getIO } = require("../config/socket");

const socialQueue = new Queue("social-events", { connection: bullRedis });

const socialWorker = new Worker(
  "social-events",
  async (job) => {
    const { name, data } = job;
    const io = getIO();

    if (name === "SYNC_LIKE") {
      const { userId, postId, authorId, action } = data;

      if (action === "LIKE") {
        await Like.updateOne(
          { userId, postId },
          { $setOnInsert: { userId, postId } },
          { upsert: true }
        );

        if (userId !== authorId) {
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
      } else {
        await Like.deleteOne({ userId, postId });
      }
    }

    if (name === "SYNC_FOLLOW") {
      const { followerId, followingId, action } = data;

      if (action === "FOLLOW") {
        await Follow.updateOne(
          { followerId, followingId },
          { $setOnInsert: { followerId, followingId } },
          { upsert: true }
        );

        const notification = await Notification.create({
          recipientId: followingId,
          actorId: followerId,
          type: "FOLLOW",
          entityId: followerId,
        });
        const unreadCount = await redis.incr(`notif:unread:${followingId}`);

        if (io) {
          io.to(`user:${followingId}`).emit("notification:new", {
            notification,
            unreadCount,
          });
        }
      } else {
        await Follow.deleteOne({ followerId, followingId });
      }
    }

    if (name === "FANOUT_POST") {
      const { postId, authorId, followerIds } = data;
      if (!followerIds || !followerIds.length) return;

      const feedDocs = followerIds.map((followerId) => ({
        userId: followerId,
        postId,
        authorId,
      }));

      await Feed.insertMany(feedDocs, { ordered: false }).catch(() => {});

      const pipeline = redis.pipeline();
      followerIds.forEach((followerId) => {
        const key = `feed:user:${followerId}`;
        pipeline.lpush(key, postId.toString());
        pipeline.ltrim(key, 0, 199);
        pipeline.expire(key, 3600);

        // Notify online followers that a new post is available
        if (io && followerId !== authorId) {
          io.to(`user:${followerId}`).emit("feed:new_post", { postId, authorId });
        }
      });
      await pipeline.exec();
    }
  },
  { connection: bullRedis, concurrency: 10 }
);

module.exports = { socialQueue, socialWorker };