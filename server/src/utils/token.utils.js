
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 bytes");
  }
  return secret;
};

const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    {
      sessionId,
    },
    getAccessSecret(),
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
  getAccessSecret,
};
