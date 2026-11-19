
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    {
      sessionId,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: userId.toString(),
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
      issuer: "social-platform",
      audience: "social-platform-api",
    }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
};
