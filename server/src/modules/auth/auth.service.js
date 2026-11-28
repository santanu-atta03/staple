const argon2 = require("argon2");
const mongoose = require("mongoose");
const User = require("../users/user.model");
const Session = require("./session.model");
const store = require("../../config/store");
const otpService = require("./otp.service");
const oauthService = require("./oauth.service");
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../../utils/token.utils");

const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const DEFAULT_AVATAR = "/default-avatar.svg";

const requireDatabase = () => {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error("Authentication storage is unavailable");
    error.status = 503;
    throw error;
  }
};

const publicUser = (user) => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  name: user.fullName || user.username,
  avatar: user.avatar || DEFAULT_AVATAR,
  bio: user.bio || "",
  role: user.role || "user",
  emailVerified: user.emailVerified === true,
});

const createSession = async (userId, meta = {}) => {
  const refreshToken = generateRefreshToken();
  const rememberMe = meta.rememberMe !== false;
  const days = rememberMe ? Math.max(REFRESH_DAYS, 7) : 1;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: String(meta.userAgent || "Unknown device").slice(0, 300),
    ipAddress: String(meta.ipAddress || "").slice(0, 100),
    lastActiveAt: new Date(),
    rememberMe,
  });

  return {
    accessToken: generateAccessToken(userId, session._id),
    refreshToken,
    sessionId: session._id,
    rememberMe,
  };
};

const completeRegistration = async ({ email, otp }, meta = {}) => {
  requireDatabase();
  const verified = await otpService.verifyRegistrationOTP({ email, otp });
  const user = await User.create({
    email: verified.email,
    username: verified.username,
    fullName: verified.fullName,
    passwordHash: verified.passwordHash,
    emailVerified: true,
    isActive: true,
    avatar: DEFAULT_AVATAR,
    bio: "",
    lastLoginAt: new Date(),
  });

  store.initializeUser(user);
  return {
    user: publicUser(user),
    ...(await createSession(user._id, meta)),
  };
};

const loginUser = async (identity, password, meta = {}) => {
  requireDatabase();
  const identifier = identity.toLowerCase().trim();
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
    deletedAt: null,
  }).select("+passwordHash");

  if (
    !user ||
    !user.passwordHash ||
    user.emailVerified !== true ||
    !(await argon2.verify(user.passwordHash, password).catch(() => false))
  ) {
    const error = new Error("INVALID_CREDENTIALS");
    error.status = 401;
    throw error;
  }

  if (user.isSuspended) {
    const error = new Error("Your account has been suspended. Please contact support.");
    error.status = 403;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("ACCOUNT_DEACTIVATED");
    error.status = 403;
    throw error;
  }

  user.lastLoginAt = new Date();
  await user.save();

  store.initializeUser(user);
  return {
    user: publicUser(user),
    ...(await createSession(user._id, meta)),
  };
};

const oauthLogin = async (provider, credential, preferredName = "") => {
  requireDatabase();
  const identity =
    provider === "google"
      ? await oauthService.verifyGoogleCredential(credential)
      : await oauthService.verifyAppleCredential(credential);
  const identityField = provider === "google" ? "googleSubject" : "appleSubject";
  let user = await User.findOne({ [identityField]: identity.subject });

  if (!user) {
    user = await User.findOne({ email: identity.email });
    if (user) {
      if (user.emailVerified !== true || (user[identityField] && user[identityField] !== identity.subject)) {
        const error = new Error("This email is already associated with another account.");
        error.status = 409;
        throw error;
      }
      user[identityField] = identity.subject;
      if (!user.fullName && (identity.fullName || preferredName)) {
        user.fullName = identity.fullName || preferredName.slice(0, 60);
      }
      await user.save();
    } else {
      const baseUsername =
        identity.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) ||
        provider;
      let username = baseUsername;
      let suffix = 1;
      while (await User.exists({ username })) {
        username = `${baseUsername.slice(0, 27)}${suffix++}`;
      }
      try {
        user = await User.create({
          email: identity.email,
          username,
          fullName: identity.fullName || preferredName.slice(0, 60),
          [identityField]: identity.subject,
          emailVerified: true,
          isActive: true,
          avatar: DEFAULT_AVATAR,
          bio: "",
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        user = await User.findOne({
          $or: [{ [identityField]: identity.subject }, { email: identity.email }],
        });
        if (!user || user.emailVerified !== true) throw error;
      }
    }
  }

  if (!user.isActive || user.emailVerified !== true) {
    const error = new Error("This account is not active.");
    error.status = 403;
    throw error;
  }

  store.initializeUser(user);
  return {
    user: publicUser(user),
    ...(await createSession(user._id)),
  };
};

const checkUsernameAvailability = async (username) => {
  requireDatabase();
  const cleanUsername = username.toLowerCase().trim();
  const [existingUser, existingChallenge] = await Promise.all([
    User.exists({ username: cleanUsername }),
    require("./registration-challenge.model").exists({ username: cleanUsername }),
  ]);
  return !existingUser && !existingChallenge;
};

const refreshSession = async (oldToken, meta = {}) => {
  requireDatabase();
  const oldHash = hashToken(oldToken);
  const existing = await Session.findOne({
    refreshTokenHash: oldHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!existing) {
    const error = new Error("INVALID_REFRESH_TOKEN");
    error.status = 401;
    throw error;
  }

  const user = await User.findOne({
    _id: existing.userId,
    isActive: true,
    isSuspended: { $ne: true },
    emailVerified: true,
    deletedAt: null,
  }).select("_id");
  if (!user) {
    await Session.updateOne(
      { _id: existing._id },
      { $set: { revokedAt: new Date() }, $unset: { refreshTokenHash: 1 } }
    );
    const error = new Error("INVALID_REFRESH_TOKEN");
    error.status = 401;
    throw error;
  }

  const newRefreshToken = generateRefreshToken();
  const days = existing.rememberMe === false ? 1 : Math.max(REFRESH_DAYS, 7);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const session = await Session.findOneAndUpdate(
    {
      _id: existing._id,
      refreshTokenHash: oldHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        refreshTokenHash: hashToken(newRefreshToken),
        expiresAt,
        lastActiveAt: new Date(),
        ...(meta.userAgent ? { userAgent: String(meta.userAgent).slice(0, 300) } : {}),
        ...(meta.ipAddress ? { ipAddress: String(meta.ipAddress).slice(0, 100) } : {}),
      },
    },
    { returnDocument: "after" }
  );
  if (!session) {
    const error = new Error("INVALID_REFRESH_TOKEN");
    error.status = 401;
    throw error;
  }

  return {
    accessToken: generateAccessToken(session.userId, session._id),
    refreshToken: newRefreshToken,
    rememberMe: existing.rememberMe !== false,
  };
};

const logoutSession = async (refreshToken) => {
  requireDatabase();
  const result = await Session.updateOne(
    { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    {
      $set: { revokedAt: new Date() },
      $unset: { refreshTokenHash: 1 },
    }
  );
  return result.modifiedCount > 0;
};

const getActiveSessions = async (userId, currentSessionId) => {
  requireDatabase();
  const sessions = await Session.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select("_id userAgent ipAddress lastActiveAt createdAt expiresAt rememberMe")
    .sort({ lastActiveAt: -1 })
    .lean();

  return sessions.map((s) => ({
    id: s._id.toString(),
    device: s.userAgent || "Unknown device",
    ipAddress: s.ipAddress || "",
    lastActiveAt: s.lastActiveAt || s.createdAt,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    current: Boolean(currentSessionId && s._id.toString() === currentSessionId.toString()),
  }));
};

const revokeSessionById = async (userId, sessionId) => {
  requireDatabase();
  if (!mongoose.isValidObjectId(sessionId)) return false;
  const result = await Session.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() }, $unset: { refreshTokenHash: 1 } }
  );
  return result.modifiedCount > 0;
};

const revokeAllSessions = async (userId, exceptSessionId = null) => {
  requireDatabase();
  const filter = { userId, revokedAt: null };
  if (exceptSessionId && mongoose.isValidObjectId(exceptSessionId)) {
    filter._id = { $ne: exceptSessionId };
  }
  const result = await Session.updateMany(filter, {
    $set: { revokedAt: new Date() },
    $unset: { refreshTokenHash: 1 },
  });
  return result.modifiedCount;
};

const deactivateAccount = async (userId, password) => {
  requireDatabase();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || user.deletedAt) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }
  if (user.passwordHash) {
    if (!password || !(await argon2.verify(user.passwordHash, password).catch(() => false))) {
      const error = new Error("Password is incorrect");
      error.status = 400;
      throw error;
    }
  }
  user.isActive = false;
  user.deactivatedAt = new Date();
  await user.save();
  await revokeAllSessions(user._id, null);
  return true;
};

const reactivateAccount = async (identity, password, meta = {}) => {
  requireDatabase();
  const identifier = String(identity || "").toLowerCase().trim();
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
    deletedAt: null,
  }).select("+passwordHash");

  if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password).catch(() => false))) {
    const error = new Error("INVALID_CREDENTIALS");
    error.status = 401;
    throw error;
  }
  if (user.isSuspended) {
    const error = new Error("Your account has been suspended. Please contact support.");
    error.status = 403;
    throw error;
  }
  user.isActive = true;
  user.deactivatedAt = null;
  user.lastLoginAt = new Date();
  await user.save();
  store.initializeUser(user);
  return {
    user: publicUser(user),
    ...(await createSession(user._id, meta)),
  };
};

const deleteAccount = async (userId, password) => {
  requireDatabase();
  const Follow = require("../follows/follow.model");
  const Bookmark = require("../bookmarks/bookmark.model");
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || user.deletedAt) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }
  if (user.passwordHash) {
    if (!password || !(await argon2.verify(user.passwordHash, password).catch(() => false))) {
      const error = new Error("Password is incorrect");
      error.status = 400;
      throw error;
    }
  }
  const suffix = `${user._id.toString().slice(-6)}_${Date.now()}`;
  user.isActive = false;
  user.deletedAt = new Date();
  user.email = `deleted_${suffix}@deleted.staple.local`;
  user.username = `deleted_${suffix}`;
  user.fullName = "Deleted User";
  user.bio = "";
  user.avatar = DEFAULT_AVATAR;
  user.cover = "";
  user.passwordHash = undefined;
  user.googleSubject = undefined;
  user.appleSubject = undefined;
  await user.save();

  await Promise.all([
    revokeAllSessions(user._id, null),
    Follow.deleteMany({ $or: [{ followerId: user._id }, { followingId: user._id }] }),
    Bookmark.deleteMany({ userId: user._id }),
  ]);
  return true;
};

const changePassword = async (userId, currentPassword, newPassword, currentSessionId) => {
  requireDatabase();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, currentPassword).catch(() => false))) {
    const error = new Error("Current password is incorrect");
    error.status = 400;
    throw error;
  }
  user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await user.save();
  await Session.updateMany(
    { userId, _id: { $ne: currentSessionId }, revokedAt: null },
    { $set: { revokedAt: new Date() }, $unset: { refreshTokenHash: 1 } }
  );
};

const resetPasswordWithOTP = async (email, otp, newPassword) => {
  requireDatabase();
  const cleanEmail = email.toLowerCase().trim();
  await otpService.verifyPasswordResetOTP({ email: cleanEmail, otp });
  const user = await User.findOne({ email: cleanEmail });
  if (!user || user.emailVerified !== true || !user.isActive) {
    const error = new Error("Account is unavailable");
    error.status = 404;
    throw error;
  }
  user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await user.save();
  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() }, $unset: { refreshTokenHash: 1 } }
  );
};

module.exports = {
  completeRegistration,
  loginUser,
  oauthLogin,
  checkUsernameAvailability,
  refreshSession,
  logoutSession,
  getActiveSessions,
  revokeSessionById,
  revokeAllSessions,
  deactivateAccount,
  reactivateAccount,
  deleteAccount,
  changePassword,
  resetPasswordWithOTP,
  requireDatabase,
};
