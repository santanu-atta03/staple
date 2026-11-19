
const express = require("express");
const mongoose = require("mongoose");
const redis = require("../config/redis");

const router = express.Router();

router.get("/", async (req, res) => {
  let redisStatus = "disconnected";

  try {
    await redis.ping();
    redisStatus = "connected";
  } catch (error) {
    redisStatus = "disconnected";
  }

  const mongoStatus =
    mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  const healthy =
    redisStatus === "connected" &&
    mongoStatus === "connected";

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    services: {
      api: "running",
      mongodb: mongoStatus,
      redis: redisStatus,
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
