const redis = require("../../config/redis");
const Feed = require("./feed.model");
const Post = require("../posts/post.model");
const Like = require("../likes/like.model");
const Comment = require("../comments/comment.model");

const getUserFeed = async (userId, page = 1, limit = 20) => {
  const start = (page - 1) * limit;
  const stop = start + limit - 1;
  const feedKey = `feed:user:${userId}`;

  let postIds = await redis.lrange(feedKey, start, stop);

  if (!postIds.length) {
    const feedDocs = await Feed.find({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .skip(start)
      .limit(limit)
      .select("postId")
      .lean();

    postIds = feedDocs.map((doc) => doc.postId.toString());

    if (postIds.length && page === 1) {
      await redis.rpush(feedKey, ...postIds);
      await redis.expire(feedKey, 3600);
    }
  }

  if (!postIds.length) return [];

  const posts = await Post.find({ _id: { $in: postIds } })
    .populate("authorId", "username name avatar")
    .lean();

  const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
  const orderedPosts = postIds.map((id) => postMap.get(id)).filter(Boolean);

  // Batch-check Redis for like status, like counts, and comment counts
  const pipeline = redis.pipeline();
  orderedPosts.forEach((post) => {
    const id = post._id.toString();
    pipeline.exists(`post:likes:${id}`);
    pipeline.sismember(`post:likes:${id}`, userId.toString());
    pipeline.scard(`post:likes:${id}`);
    pipeline.get(`post:comments:${id}`);
  });

  const results = await pipeline.exec();

  const enrichedPosts = await Promise.all(
    orderedPosts.map(async (post, idx) => {
      const id = post._id.toString();
      const base = idx * 4;

      const likeSetExists = results[base][1] === 1;
      let isLiked = results[base + 1][1] === 1;
      let likeCount = results[base + 2][1];
      let commentCount = results[base + 3][1];

      // Warm Redis if like set expired or wasn't initialized yet
      if (!likeSetExists) {
        const likes = await Like.find({ postId: id }).select("userId").lean();
        likeCount = likes.length;
        isLiked = likes.some((l) => l.userId.toString() === userId.toString());
        if (likes.length) {
          await redis.sadd(
            `post:likes:${id}`,
            ...likes.map((l) => l.userId.toString())
          );
          await redis.expire(`post:likes:${id}`, 86400);
        }
      }

      // Warm comment counter if missing in Redis
      if (commentCount === null) {
        commentCount = await Comment.countDocuments({ postId: id });
        await redis.set(`post:comments:${id}`, commentCount, "EX", 86400);
      }

      return {
        ...post,
        isLiked,
        likeCount: Number(likeCount),
        commentCount: Number(commentCount),
      };
    })
  );

  return enrichedPosts;
};

module.exports = { getUserFeed };