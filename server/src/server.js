require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./config/database");
const { initSocket } = require("./config/socket");
const redis = require("./config/redis");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Attempt MongoDB connection (falls back to memory store if unavailable)
    try {
      await connectDB();
    } catch (err) {
      console.warn("MongoDB connection bypassed, running with in-memory store.");
    }

    // Attempt Redis connection
    try {
      await redis.ping();
    } catch (err) {
      console.warn("Redis ping bypassed, running with in-memory cache.");
    }

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    try {
      initSocket(httpServer);
    } catch (err) {
      console.warn("Socket.io initialized in basic mode.");
    }

    // Start server
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Staple server running on port ${PORT}`);
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
