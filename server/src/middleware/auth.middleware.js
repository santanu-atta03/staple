
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Session = require("../modules/auth/session.model");
const User = require("../modules/users/user.model");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET,
      {
        issuer: "social-platform",
        audience: "social-platform-api",
      }
    );

    if (
      !decoded.sessionId ||
      !mongoose.isValidObjectId(decoded.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // Check that the login session is still active.
    const session = await Session.findOne({
      _id: decoded.sessionId,
      userId: decoded.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select("_id");

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or revoked",
      });
    }

    const user = await User.findOne({
      _id: decoded.sub,
      isActive: true,
    }).select("_id username");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account unavailable",
      });
    }

    req.user = {
      id: user._id,
      username: user.username,
      sessionId: session._id,
    };

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};

module.exports = authenticate;
