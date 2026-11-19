const redis = require("../config/redis");

const rateLimit = (prefix, maxRequests, windowSeconds) => async (req, res, next) => {
  try {
    const identifier = req.user?._id?.toString() || req.user?.id || req.ip;
    const key = `rl:${prefix}:${identifier}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (current > maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down.",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = rateLimit;