const express = require("express");
const router = express.Router();
const store = require("../config/store");
const { getIO } = require("../config/socket");
const authenticate = require("../middleware/auth.middleware");
const authService = require("../modules/auth/auth.service");

router.use(authenticate);

// GET /api/v1/settings -> Full settings document isolated per user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = store.getUserSettings(userId);
    const user = store.findUser(userId);
    const liveSessions = await authService
      .getActiveSessions(userId, req.user.sessionId)
      .catch(() => null);
    if (Array.isArray(liveSessions) && settings?.account) {
      settings.account.sessions = liveSessions;
    }
    res.json({
      success: true,
      settings,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/v1/settings -> Update general settings
router.patch("/", (req, res) => {
  try {
    const userId = req.user.id;
    const updated = store.updateUserSettings(userId, req.body);
    try {
      const io = getIO();
      if (io) io.to(`user:${userId}`).emit("settings:updated", { userId, settings: updated });
    } catch (e) {}
    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/avatar -> Immediately update or reset profile photo
router.post("/avatar", async (req, res) => {
  try {
    const userId = req.user.id;
    const avatar = req.body.avatar || req.body.avatarUrl;
    const result = store.updateAvatar(userId, avatar);
    const User = require("../modules/users/user.model");
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(userId)) {
      await User.findByIdAndUpdate(userId, { $set: { avatar: result.avatar } }).catch(() => {});
    }
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit("user:updated", {
          username: result.user.username,
          user: result.user,
        });
        io.to(`user:${userId}`).emit("settings:updated", { userId, settings: store.getUserSettings(userId) });
      }
    } catch (e) {}
    res.json({
      success: true,
      message: avatar === "reset" ? "Profile photo reset to default" : "Profile photo updated successfully",
      avatar: result.avatar,
      user: result.user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/v1/settings/profile -> Update profile settings (syncs with user)
router.patch("/profile", (req, res) => {
  try {
    const userId = req.user.id;
    const result = store.updateProfileSettings(userId, req.body);
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit("settings:updated", { userId, settings: result.settings });
        io.to(`user:${userId}`).emit("user:updated", {
          username: result.user.username,
          user: result.user,
        });
      }
    } catch (e) {}
    res.json({
      success: true,
      message: "Profile settings saved successfully",
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/password -> Change password
router.post("/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "A current password and a new password of at least 8 characters are required",
      });
    }
    await authService.changePassword(req.user.id, currentPassword, newPassword, req.user.sessionId);
    res.json({
      success: true,
      message: "Password updated. Other sessions have been revoked.",
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/settings/sessions/:id/revoke -> Revoke active session
router.post("/sessions/:id/revoke", async (req, res) => {
  try {
    const userId = req.user.id;
    await authService.revokeSessionById(userId, req.params.id).catch(() => false);
    store.revokeSession(userId, req.params.id);
    const sessions = await authService.getActiveSessions(userId, req.user.sessionId).catch(() =>
      store.getUserSettings(userId).account?.sessions || []
    );
    res.json({
      success: true,
      message: "Session revoked successfully",
      sessions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/sessions/revoke-all -> Revoke all other sessions
router.post("/sessions/revoke-all", async (req, res) => {
  try {
    const userId = req.user.id;
    await authService.revokeAllSessions(userId, req.user.sessionId).catch(() => 0);
    store.revokeAllOtherSessions(userId);
    const sessions = await authService.getActiveSessions(userId, req.user.sessionId).catch(() =>
      store.getUserSettings(userId).account?.sessions || []
    );
    res.json({
      success: true,
      message: "All other sessions terminated",
      sessions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/close-friends/:id/toggle -> Toggle close friend active state
router.post("/close-friends/:id/toggle", (req, res) => {
  try {
    const userId = req.user.id;
    const friend = store.toggleCloseFriend(userId, req.params.id);
    if (!friend) {
      return res.status(404).json({ success: false, message: "Friend not found" });
    }
    const settings = store.getUserSettings(userId);
    res.json({
      success: true,
      friend,
      closeFriends: settings.closeFriends,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/close-friends -> Add new friend to close friends
router.post("/close-friends", (req, res) => {
  try {
    const userId = req.user.id;
    const { name, handle, role, avatar } = req.body;
    if (!handle) {
      return res.status(400).json({ success: false, message: "Handle is required" });
    }
    const friend = store.addCloseFriend(userId, { name, handle, role, avatar });
    const settings = store.getUserSettings(userId);
    res.status(201).json({
      success: true,
      friend,
      closeFriends: settings.closeFriends,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/muted-words -> Add muted keyword/tag
router.post("/muted-words", (req, res) => {
  try {
    const userId = req.user.id;
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ success: false, message: "Word is required" });
    }
    const mutedWords = store.addMutedWord(userId, word);
    res.json({
      success: true,
      message: "Muted keyword added",
      mutedWords,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/settings/muted-words/:word -> Remove muted keyword/tag
router.delete("/muted-words/:word", (req, res) => {
  try {
    const userId = req.user.id;
    const mutedWords = store.removeMutedWord(userId, req.params.word);
    res.json({
      success: true,
      message: "Muted keyword removed",
      mutedWords,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/blocked -> Block an account
router.post("/blocked", (req, res) => {
  try {
    const userId = req.user.id;
    const { username, name, avatar } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }
    const blockedUsers = store.addBlockedUser(userId, { username, name, avatar });
    res.status(201).json({
      success: true,
      message: `Account @${username} blocked`,
      blockedUsers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/blocked/:id/unblock -> Unblock a user
router.post("/blocked/:id/unblock", (req, res) => {
  try {
    const userId = req.user.id;
    const blockedUsers = store.unblockUser(userId, req.params.id);
    res.json({
      success: true,
      message: "User unblocked successfully",
      blockedUsers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/support -> Submit feedback or support ticket
router.post("/support", (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, category, message, email } = req.body;
    const ticket = store.submitSupportTicket(userId, { subject, category, message, email });
    res.status(201).json({
      success: true,
      message: "Support ticket received. Our team will review it shortly.",
      ticket,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/settings/archive -> Trigger archival export
router.post("/archive", (req, res) => {
  try {
    const userId = req.user.id;
    const user = store.findUser(userId);
    res.json({
      success: true,
      message: "Archive generation initialized",
      archiveUrl: `/downloads/staple_archive_${user.username || "curator"}.zip`,
      size: "1.4 MB",
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
