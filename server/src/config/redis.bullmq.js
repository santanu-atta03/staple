
const Redis = require("ioredis");
const logger = require("pino")();

const bullRedis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 500, 3000);
  },
});

bullRedis.on("connect", () => {
  logger.info("BullMQ Redis connected successfully");
});

bullRedis.on("error", (error) => {
  logger.error({ err: error }, "BullMQ Redis connection error");
});

module.exports = bullRedis;
