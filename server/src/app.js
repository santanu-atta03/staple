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
const exploreRoutes = require("./routes/explore.routes");
const messageRoutes = require("./routes/message.routes");
const settingsRoutes = require("./routes/settings.routes");

const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: true,
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
  });
});

// Modular Routes supported on both /api/v1 and /api
app.use(["/api/v1/health", "/api/health"], healthRoutes);
app.use(["/api/v1/auth", "/api/auth"], authRoutes);
app.use(["/api/v1/users", "/api/users"], authMeRoutes);
app.use(["/api/v1/users", "/api/users"], userRoutes);
app.use(["/api/v1/posts", "/api/posts"], postRoutes);
app.use(["/api/v1/follows", "/api/follows"], followRoutes);
app.use(["/api/v1/likes", "/api/likes"], likeRoutes);
app.use(["/api/v1/comments", "/api/comments"], commentRoutes);
app.use(["/api/v1/feed", "/api/feed"], feedRoutes);
app.use(["/api/v1/notifications", "/api/notifications"], notificationRoutes);
app.use(["/api/v1/uploads", "/api/uploads"], uploadRoutes);
app.use(["/api/v1/explore", "/api/explore"], exploreRoutes);
app.use(["/api/v1/messages", "/api/messages"], messageRoutes);
app.use(["/api/v1/settings", "/api/settings"], settingsRoutes);

// Mount the root-scoped legacy routes last so they cannot shadow module APIs.
app.use(["/api/v1", "/api"], homeRoutes);

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
