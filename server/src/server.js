const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const http = require("http");
const app = require("./app");
const connectDB = require("./config/database");
const { initSocket } = require("./config/socket");
const redis = require("./config/redis");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5055;

const startServer = async () => {
  try {
    if (!process.env.JWT_ACCESS_SECRET || Buffer.byteLength(process.env.JWT_ACCESS_SECRET) < 32) {
      throw new Error("JWT_ACCESS_SECRET must contain at least 32 bytes");
    }

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    initSocket(httpServer);

    // Start server immediately so frontend proxy never encounters ECONNREFUSED
    httpServer.listen(PORT, () => {
      console.log(`Staple server running on port ${PORT}`);
    });

    // Connect to database asynchronously in the background
    connectDB().catch((err) => {
      console.warn("MongoDB connection background notice:", err.message);
    });

    // Attempt Redis connection
    redis.ping().catch(() => {
      console.warn("Redis ping bypassed, running with in-memory cache.");
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log("Shutting down server...");
      httpServer.close(async () => {
        try {
          await redis.quit().catch(() => {});
          await mongoose.disconnect().catch(() => {});
          console.log("Server shut down successfully.");
          process.exit(0);
        } catch (error) {
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Server startup fatal error:", error);
    process.exit(1);
  }
};

startServer();
