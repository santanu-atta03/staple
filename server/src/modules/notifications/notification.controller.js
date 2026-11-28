const store = require("../../config/store");
const mongoose = require("mongoose");
const Follow = require("../follows/follow.model");
const User = require("../users/user.model");

async function syncMutualFollowInDb(userIdA, userIdB) {
  if (
    mongoose.connection.readyState !== 1 ||
    !mongoose.isValidObjectId(userIdA) ||
    !mongoose.isValidObjectId(userIdB)
  ) {
    return null;
  }
  try {
    await Promise.all([
      Follow.updateOne(
        { followerId: userIdA, followingId: userIdB },
        { $setOnInsert: { followerId: userIdA, followingId: userIdB } },
        { upsert: true }
      ),
      Follow.updateOne(
        { followerId: userIdB, followingId: userIdA },
        { $setOnInsert: { followerId: userIdB, followingId: userIdA } },
        { upsert: true }
      ),
    ]);
    const [aFollowers, aFollowing, bFollowers, bFollowing] = await Promise.all([
      Follow.countDocuments({ followingId: userIdA }),
      Follow.countDocuments({ followerId: userIdA }),
      Follow.countDocuments({ followingId: userIdB }),
      Follow.countDocuments({ followerId: userIdB }),
    ]);
    await Promise.all([
      User.findByIdAndUpdate(userIdA, { $set: { followersCount: aFollowers, followingCount: aFollowing } }),
      User.findByIdAndUpdate(userIdB, { $set: { followersCount: bFollowers, followingCount: bFollowing } }),
    ]);
    return {
      aFollowers,
      aFollowing,
      bFollowers,
      bFollowing,
    };
  } catch {
    return null;
  }
}

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

    const isConfirmed =
      action === "accept" || action === "confirm" || action === "confirmed";
    const item = (store.data.notifications || []).find((n) => n.id === id);
    const senderId = item?.senderId;
    const uid = userId.toString();

    let dbCounts = null;
    if (isConfirmed && senderId) {
      dbCounts = await syncMutualFollowInDb(uid, senderId);
    }

    // Emit live follow and notification updates via socket
    try {
      const { getIO } = require("../../config/socket");
      const io = getIO();
      if (io) {
        const unreadCount = store.getNotificationUnreadCount(uid);

        io.to(`user:${uid}`).emit("notification:new", { unreadCount });
        if (senderId) {
          const senderUnread = store.getNotificationUnreadCount(senderId);
          io.to(`user:${senderId}`).emit("notification:new", { unreadCount: senderUnread });

          const userProfile = store.getUserProfile(uid, senderId);
          const senderProfile = store.getUserProfile(senderId, uid);

          io.to(`user:${uid}`).emit("follow:updated", {
            targetUsername: userProfile?.username,
            isFollowing: true,
            followersCount: dbCounts?.aFollowers ?? userProfile?.followersCount ?? 1,
            followingCount: dbCounts?.aFollowing ?? userProfile?.followingCount ?? 1,
          });
          io.to(`user:${senderId}`).emit("follow:updated", {
            targetUsername: senderProfile?.username,
            isFollowing: true,
            followersCount: dbCounts?.bFollowers ?? senderProfile?.followersCount ?? 1,
            followingCount: dbCounts?.bFollowing ?? senderProfile?.followingCount ?? 1,
          });
        }
      }
    } catch (e) {}

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

    const isConfirmed =
      action === "accept" || action === "confirm" || action === "confirmed";
    const uid = userId.toString();
    const sidebar = store.getNotificationSidebar(uid);
    const reqItem = (sidebar?.friendRequests || []).find((r) => r.id === id || r.fromUserId === id);
    const senderId = reqItem?.fromUserId || id.replace(/^req_/, "");

    let dbCounts = null;
    if (isConfirmed && senderId && senderId !== uid) {
      dbCounts = await syncMutualFollowInDb(uid, senderId);
    }

    // Emit live follow and notification updates via socket
    try {
      const { getIO } = require("../../config/socket");
      const io = getIO();
      if (io) {
        const unreadCount = store.getNotificationUnreadCount(uid);
        io.to(`user:${uid}`).emit("notification:new", { unreadCount });

        if (senderId && senderId !== uid) {
          const senderUnread = store.getNotificationUnreadCount(senderId);
          io.to(`user:${senderId}`).emit("notification:new", { unreadCount: senderUnread });

          const userProfile = store.getUserProfile(uid, senderId);
          const senderProfile = store.getUserProfile(senderId, uid);

          io.to(`user:${uid}`).emit("follow:updated", {
            targetUsername: userProfile?.username,
            isFollowing: true,
            followersCount: dbCounts?.aFollowers ?? userProfile?.followersCount ?? 1,
            followingCount: dbCounts?.aFollowing ?? userProfile?.followingCount ?? 1,
          });
          io.to(`user:${senderId}`).emit("follow:updated", {
            targetUsername: senderProfile?.username,
            isFollowing: true,
            followersCount: dbCounts?.bFollowers ?? senderProfile?.followersCount ?? 1,
            followingCount: dbCounts?.bFollowing ?? senderProfile?.followingCount ?? 1,
          });
        }
      }
    } catch (e) {}

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