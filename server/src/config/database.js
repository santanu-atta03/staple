
const mongoose = require("mongoose");
const logger = require("pino")();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error({ err: error }, "MongoDB connection failed");
    throw error;
  }
};

module.exports = connectDB;
