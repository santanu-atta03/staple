const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Session = require("../modules/auth/session.model");
const User = require("../modules/users/user.model");
const store = require("../config/store");
const { getAccessSecret } = require("../utils/token.utils");

const reject = (res, status, message) =>
  res.status(status).json({ success: false, message });

const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return reject(res, 401, "Authentication required");
  }

  let decoded;
  try {
    decoded = jwt.verify(authorization.slice(7), getAccessSecret(), {
      issuer: "social-platform",
      audience: "social-platform-api",
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (error.name === "Error" && error.message.includes("JWT_ACCESS_SECRET")) {
      return next(error);
    }
    return reject(res, 401, "Invalid or expired access token");
  }

  if (!decoded.sessionId || !decoded.sub) {
    return reject(res, 401, "Invalid authentication token");
  }

  // 1. Try Mongo if connected
  if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(decoded.sub)) {
    try {
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
        }).select("_id username email fullName avatar bio emailVerified"),
      ]);

      if (session && user) {
        req.user = {
          id: user._id.toString(),
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          name: user.fullName || user.username,
          fullName: user.fullName,
          avatar: user.avatar || "/default-avatar.svg",
          bio: user.bio || "",
          emailVerified: user.emailVerified,
          sessionId: session._id.toString(),
        };
        store.initializeUser(req.user);
        return next();
      }
    } catch (dbError) {
      // Fall through to store fallback
    }
  }

  // 2. Fallback to resilient store
  const storeUser = store.findUser(decoded.sub);
  if (!storeUser) {
    return reject(res, 401, "Session expired or account unavailable");
  }

  req.user = {
    id: (storeUser._id || storeUser.id).toString(),
    _id: (storeUser._id || storeUser.id).toString(),
    username: storeUser.username,
    email: storeUser.email,
    name: storeUser.fullName || storeUser.name || storeUser.username,
    fullName: storeUser.fullName || storeUser.name || storeUser.username,
    avatar: storeUser.avatar || "/default-avatar.svg",
    bio: storeUser.bio || "",
    emailVerified: storeUser.emailVerified !== false,
    sessionId: decoded.sessionId,
  };
  return next();
};

const optionalAuthenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(authorization.slice(7), getAccessSecret(), {
      issuer: "social-platform",
      audience: "social-platform-api",
      algorithms: ["HS256"],
    });
    if (decoded?.sub) {
      if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(decoded.sub)) {
        try {
          const user = await User.findOne({ _id: decoded.sub, isActive: true }).select(
            "_id username email fullName avatar bio emailVerified"
          );
          if (user) {
            req.user = {
              id: user._id.toString(),
              _id: user._id.toString(),
              username: user.username,
              email: user.email,
              name: user.fullName || user.username,
              fullName: user.fullName,
              avatar: user.avatar || "/default-avatar.svg",
              bio: user.bio || "",
              emailVerified: user.emailVerified,
              sessionId: decoded.sessionId,
            };
            return next();
          }
        } catch {
          // ignore
        }
      }
      const storeUser = store.findUser(decoded.sub);
      if (storeUser) {
        req.user = {
          id: (storeUser._id || storeUser.id).toString(),
          _id: (storeUser._id || storeUser.id).toString(),
          username: storeUser.username,
          email: storeUser.email,
          name: storeUser.fullName || storeUser.name || storeUser.username,
          fullName: storeUser.fullName || storeUser.name || storeUser.username,
          avatar: storeUser.avatar || "/default-avatar.svg",
          bio: storeUser.bio || "",
          emailVerified: storeUser.emailVerified !== false,
          sessionId: decoded.sessionId,
        };
        return next();
      }
    }
  } catch {
    // Token invalid or expired - proceed as unauthenticated guest
  }
  req.user = null;
  return next();
};

authenticate.optionalAuthenticate = optionalAuthenticate;
authenticate.authenticate = authenticate;

module.exports = authenticate;
