require("./queues/social.queue");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const cookieParser = require("cookie-parser");

const authRoutes = require("./modules/auth/auth.routes");
const authMeRoutes = require("./modules/auth/auth.me.routes");
const healthRoutes = require("./routes/health.routes");
const userRoutes = require("./modules/users/user.routes");
const postRoutes = require("./modules/posts/post.routes");
const followRoutes = require("./modules/follows/follow.routes");
const likeRoutes = require("./modules/likes/like.routes");
const commentRoutes = require("./modules/comments/comment.routes");
const feedRoutes = require("./modules/feed/feed.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const uploadRoutes = require("./routes/upload.routes");

const errorMiddleware = require("./middleware/error.middleware");

const app = express();

// Global Error Handler

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(pinoHttp());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Social Platform API is running",
  });
});

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", authMeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/follows", followRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);

// Must remain last
app.use(errorMiddleware);

module.exports = app;
