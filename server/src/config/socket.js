const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Session = require("../modules/auth/session.model");
const User = require("../modules/users/user.model");
const Post = require("../modules/posts/post.model");
const { canViewPost } = require("../modules/posts/post.service");
const store = require("./store");
const { getAccessSecret } = require("../utils/token.utils");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token || mongoose.connection.readyState !== 1) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, getAccessSecret(), {
        issuer: "social-platform",
        audience: "social-platform-api",
        algorithms: ["HS256"],
      });
      if (!decoded.sessionId || !mongoose.isValidObjectId(decoded.sub)) {
        return next(new Error("Invalid authentication token"));
      }

      const [session, user] = await Promise.all([
        Session.findOne({
          _id: decoded.sessionId,
          userId: decoded.sub,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        }).select("_id"),
        User.findOne({
          _id: decoded.sub,
          isActive: true,
          emailVerified: true,
        }).select("_id"),
      ]);
      if (!session || !user) return next(new Error("Session expired"));

      socket.userId = user._id.toString();
      return next();
    } catch (error) {
      return next(new Error("Invalid or expired authentication token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.on("post:join", async (postId) => {
      try {
        const post = await Post.findById(postId)
          .select("authorId visibility isDeleted")
          .lean();
        if (await canViewPost(post, socket.userId)) socket.join(`post:${postId}`);
      } catch (error) {
        socket.emit("error", { message: "Could not join post updates" });
      }
    });
    socket.on("post:leave", (postId) => socket.leave(`post:${postId}`));
    socket.on("chat:join", (chatId) => {
      if (store.getConversationById(chatId, socket.userId)) socket.join(`chat:${chatId}`);
    });
    socket.on("chat:leave", (chatId) => socket.leave(`chat:${chatId}`));
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
