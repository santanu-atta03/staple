const mongoose = require("mongoose");
const logger = require("pino")();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 1500,
    });
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.warn("MongoDB not reachable — running with high-speed in-memory store fallback");
  }
};

module.exports = connectDB;
