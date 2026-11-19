
const argon2 = require("argon2");

const User = require("../users/user.model");
const Session = require("./session.model");

const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../../utils/token.utils");

const REFRESH_DAYS = Number(
  process.env.REFRESH_TOKEN_DAYS || 7
);

const createSession = async (userId) => {
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date(
    Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000
  );

  const session = await Session.create({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
  });

  const accessToken = generateAccessToken(
    userId,
    session._id
  );

  return {
    accessToken,
    refreshToken,
    sessionId: session._id,
  };
};

const registerUser = async (data) => {
  const passwordHash = await argon2.hash(data.password);

  const user = await User.create({
    username: data.username.toLowerCase(),
    email: data.email.toLowerCase(),
    passwordHash,
    fullName: data.fullName || "",
  });

  return {
    id: user._id,
    username: user.username,
    email: user.email,
  };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({
    email: email.toLowerCase(),
    isActive: true,
  }).select("+passwordHash");

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isValid = await argon2.verify(
    user.passwordHash,
    password
  );

  if (!isValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const session = await createSession(user._id);

  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    ...session,
  };
};

const refreshSession = async (oldToken) => {
  const oldHash = hashToken(oldToken);
  const newRefreshToken = generateRefreshToken();

  const expiresAt = new Date(
    Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000
  );

  // Atomic rotation: only one request can consume
  // the previous refresh token successfully.
  const session = await Session.findOneAndUpdate(
    {
      refreshTokenHash: oldHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        refreshTokenHash: hashToken(newRefreshToken),
        expiresAt,
      },
    },
    {
      new: true,
    }
  );

  if (!session) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const accessToken = generateAccessToken(
    session.userId,
    session._id
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

const logoutSession = async (refreshToken) => {
  const result = await Session.updateOne(
    {
      refreshTokenHash: hashToken(refreshToken),
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
      $unset: {
        refreshTokenHash: 1,
      },
    }
  );

  return result.modifiedCount > 0;
};

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
};
