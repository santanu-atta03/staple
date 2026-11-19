const redis = require("../../config/redis");
const User = require("./user.model");

const getProfileByUsername = async (username) => {
  const cacheKey = `profile:${username.toLowerCase()}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return { source: "cache", user: JSON.parse(cached) };
  }

  const user = await User.findOne({ username })
    .select("-password -passwordHash")
    .lean();

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  await redis.set(cacheKey, JSON.stringify(user), "EX", 300);
  return { source: "db", user };
};

const updateUserProfile = async (userId, updates) => {
  const allowedFields = ["name", "bio", "avatar"];
  const filteredUpdates = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  )
    .select("-password -passwordHash")
    .lean();

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  await redis.del(`profile:${user.username.toLowerCase()}`);
  return user;
};

module.exports = { getProfileByUsername, updateUserProfile };