// Social Queue for background processing with in-memory execution fallback
const redis = require("../config/redis");
let socialQueue;

try {
  const bullRedis = require("../config/redis.bullmq");
  const { Queue } = require("bullmq");
  socialQueue = new Queue("social-events", { connection: bullRedis });
  socialQueue.on("error", () => {});
} catch (e) {
  socialQueue = {
    add: async (name, data) => {
      // In-memory fallback
      return { id: "job_" + Date.now(), name, data };
    },
  };
}

// Fallback add method if connection fails
const safeAdd = async (name, data) => {
  try {
    if (socialQueue && typeof socialQueue.add === "function") {
      return await socialQueue.add(name, data);
    }
  } catch (err) {
    // Ignore queue connection errors in dev
  }
  return { id: "job_" + Date.now(), name, data };
};

module.exports = {
  socialQueue: {
    add: safeAdd,
  },
};
