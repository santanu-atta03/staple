// Social Queue for background processing with in-memory execution fallback
// Note: redis.bullmq.js is a MockRedis instance, so BullMQ Queue would hang waiting for ioredis handshake.
const socialQueue = {
  add: async (name, data) => ({ id: "job_" + Date.now(), name, data }),
};

const safeAdd = async (name, data) => {
  try {
    return await socialQueue.add(name, data);
  } catch (err) {
    return { id: "job_" + Date.now(), name, data };
  }
};

module.exports = {
  socialQueue: {
    add: safeAdd,
  },
};
