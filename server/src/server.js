
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
    // Connect MongoDB
    await connectDB();

    // Check Redis connection
    await redis.ping();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    initSocket(httpServer);

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`Staple server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log("Shutting down server...");

      httpServer.close(async () => {
        try {
          await redis.quit();
          await mongoose.disconnect();

          console.log("Server shut down successfully.");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (error) {
    console.error("Server startup failed:", error);

    await redis.quit().catch(() => {});
    await mongoose.disconnect().catch(() => {});

    process.exit(1);
  }
};

startServer();
