const store = require("../../config/store");

const listNotifications = async (req, res, next) => {
  try {
    const tab = req.query.tab || "all";
    const userId = req.user?.id || req.user?._id;
    const data = store.getNotifications(userId, tab);
    res.json({
      success: true,
      tab,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

const unreadCount = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const count = store.getNotificationUnreadCount(userId);
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
};

const readAll = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = store.markAllNotificationsRead(userId);
    res.json({ success: true, message: "All notifications marked as read", ...result });
  } catch (err) {
    next(err);
  }
};

const markSingleRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const result = store.markNotificationRead(id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const result = store.deleteNotification(id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const replyComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Reply text is required" });
    }
    const userId = req.user?.id || req.user?._id || "default_user";
    const reply = store.replyToNotificationComment(id, text.trim(), userId);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(201).json({ success: true, reply });
  } catch (err) {
    next(err);
  }
};

const toggleLikeComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id || "default_user";
    const result = store.toggleLikeNotificationComment(id, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const respondFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "accept" | "decline" | "confirmed" | "deleted"
    const userId = req.user?.id || req.user?._id || "default_user";
    const result = store.respondNotificationFriendRequest(id, action, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getSidebar = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id || "default_user";
    const sidebar = store.getNotificationSidebar(userId);
    res.json({ success: true, ...sidebar });
  } catch (err) {
    next(err);
  }
};

const respondSidebarFriendRequest = async (req, res, next) => {
  try {
    const { id, action } = req.params;
    const userId = req.user?.id || req.user?._id || "default_user";
    const result = store.respondSidebarFriendRequest(id, action, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Friend request not found" });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const toggleWishBirthday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id || "default_user";
    const result = store.toggleWishBirthday(id, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Birthday person not found" });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const toggleSuggestedFriend = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id || "default_user";
    const result = store.toggleSuggestedFriend(id, userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Suggested person not found" });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listNotifications,
  unreadCount,
  readAll,
  markSingleRead,
  deleteNotification,
  replyComment,
  toggleLikeComment,
  respondFriendRequest,
  getSidebar,
  respondSidebarFriendRequest,
  toggleWishBirthday,
  toggleSuggestedFriend,
};