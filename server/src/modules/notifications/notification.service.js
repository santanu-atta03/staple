const redis = require("../../config/redis");
const Notification = require("./notification.model");

const getUnreadCount = async (userId) => {
  const countKey = `notif:unread:${userId}`;
  let count = await redis.get(countKey);

  if (count === null) {
    count = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
    await redis.set(countKey, count, "EX", 600);
  }

  return Number(count);
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true } }
  );
  await redis.set(`notif:unread:${userId}`, 0, "EX", 600);
};

module.exports = { getUnreadCount, markAllAsRead };