const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Authenticate socket connection using access token
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = (decoded._id || decoded.id).toString();
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Join personal room for notifications & live feed updates
    socket.join(`user:${socket.userId}`);

    socket.on("post:join", (postId) => socket.join(`post:${postId}`));
    socket.on("post:leave", (postId) => socket.leave(`post:${postId}`));
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };