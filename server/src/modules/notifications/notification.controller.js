const notificationService = require("./notification.service");

const listNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const notifications = await notificationService.getUserNotifications(
      userId,
      page
    );
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

const unreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
};

const readAll = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    await notificationService.markAllAsRead(userId);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

module.exports = { listNotifications, unreadCount, readAll };