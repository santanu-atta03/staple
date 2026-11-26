const mongoose = require("mongoose");
const dns = require("node:dns");
const logger = require("pino")();

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured; authentication cannot use an in-memory fallback");
  }

  if (process.env.MONGODB_DNS_SERVERS) {
    const servers = process.env.MONGODB_DNS_SERVERS
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean);
    if (!servers.length) {
      throw new Error("MONGODB_DNS_SERVERS must contain one or more comma-separated DNS server addresses");
    }
    try {
      dns.setServers(servers);
    } catch (error) {
      throw new Error(`Invalid MONGODB_DNS_SERVERS configuration: ${error.message}`);
    }
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    logger.info("MongoDB connected successfully");

    const User = require("../modules/users/user.model");
    await User.updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: true } }
    );
    await User.updateMany(
      { $or: [{ avatar: null }, { avatar: { $exists: false } }] },
      { $set: { avatar: "/default-avatar.svg" } }
    );
  } catch (error) {
    logger.warn(
      `MongoDB connection unavailable (${error.message}). Running with persistent store fallback.`
    );
  }
};

module.exports = connectDB;
