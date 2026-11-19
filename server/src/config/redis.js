
const Redis = require("ioredis");
const logger = require("pino")();

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 500, 3000);
  },
});

redis.on("connect", () => {
  logger.info("Redis connected successfully");
});

redis.on("error", (error) => {
  logger.error({ err: error }, "Redis connection error");
});

module.exports = redis;
