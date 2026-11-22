require("./queues/social.queue");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const store = require("./config/store");
const homeRoutes = require("./routes/home.routes");
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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads serving
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../../client/public/uploads")));

// Root Health
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Staple Social Platform API is running",
    user: store.currentUser.username,
  });
});

// Current Authenticated User Fallback (Elena Vance)
app.get(["/api/v1/auth/me", "/api/auth/me"], (req, res) => {
  res.json({
    success: true,
    user: store.currentUser,
  });
});

// Primary Home Page APIs (Dynamic feed, posts, likes, comments, polls, audio, stories, sidebar)
app.use("/api", homeRoutes);
app.use("/api/v1", homeRoutes);

// Modular Routes
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

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
