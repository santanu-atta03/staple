const express = require("express");
const router = express.Router();
const store = require("../config/store");
const { getIO } = require("../config/socket");
const authenticate = require("../middleware/auth.middleware");
const User = require("../modules/users/user.model");

router.use(authenticate);

const emitConversationUpdate = (io, conversation, event) => {
  for (const participantId of conversation.participants || []) {
    io.to(`user:${participantId}`).emit("conversation:updated", event);
  }
};

// GET Notes
router.get("/notes", (req, res) => {
  const userId = req.user.id;
  const notes = store.getNotes(userId);
  res.json({ success: true, notes });
});

// POST Update User Note
router.post("/notes", (req, res) => {
  const userId = req.user.id;
  const { note } = req.body;
  const notes = store.updateUserNote(userId, note);
  try {
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit("notes:updated", { notes });
  } catch (e) {}
  res.json({ success: true, notes });
});

// DELETE User Note
router.delete("/notes", (req, res) => {
  const userId = req.user.id;
  const notes = store.deleteUserNote(userId);
  try {
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit("notes:updated", { notes });
  } catch (e) {}
  res.json({ success: true, notes });
});

// POST Reply to Note
router.post("/notes/:id/reply", (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user.id;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Reply text is required" });
  }

  // Send message to this user's conversation
  const result = store.sendMessage(id, { text: `Replying to note: "${text.trim()}"`, senderId: userId });
  if (!result) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }
  try {
    const io = getIO();
    if (io) {
      io.to(`chat:${id}`).emit("message:received", { chatId: id, message: result.message });
      emitConversationUpdate(io, result.conversation, { conversationId: id });
    }
  } catch (e) {}

  res.json({ success: true, message: result.message, conversationId: id });
});

// GET Conversations List
router.get("/conversations", (req, res) => {
  const userId = req.user.id;
  const { q = "", tab = "all" } = req.query;
  const conversations = store.getConversations(userId, q, tab);
  res.json({
    success: true,
    count: conversations.length,
    conversations,
  });
});

router.get("/people", async (req, res, next) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2) {
    return res.json({ success: true, people: [] });
  }

  try {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const people = await User.find({
      _id: { $ne: req.user.id },
      isActive: true,
      emailVerified: true,
      $or: [
        { username: { $regex: escapedQuery, $options: "i" } },
        { fullName: { $regex: escapedQuery, $options: "i" } },
      ],
    })
      .select("_id username fullName avatar")
      .sort({ username: 1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      people: people.map((person) => ({
        id: person._id.toString(),
        name: person.fullName || person.username,
        username: person.username,
        avatar: person.avatar || "/default-avatar.svg",
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// POST Create Conversation
router.post("/conversations", async (req, res, next) => {
  const currentUserId = req.user.id;
  try {
    const target = await User.findById(req.body?.userId).select(
      "_id username email fullName avatar bio website location pronouns cover isPrivate"
    );
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    store.initializeUser(target);
    const conv = store.createConversation({
      userId: target._id.toString(),
      name: target.fullName || target.username,
      username: target.username,
      avatar: target.avatar || "/default-avatar.svg",
      currentUserId,
    });
    if (!conv) {
      return res.status(400).json({ success: false, message: "Could not create conversation" });
    }
    return res.status(201).json({ success: true, conversation: conv });
  } catch (error) {
    return next(error);
  }
});

// GET Single Conversation with Messages
router.get("/conversations/:id", (req, res) => {
  const conv = store.getConversationById(req.params.id, req.user.id);
  if (!conv) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }
  res.json({ success: true, conversation: conv });
});

// DELETE Conversation
router.delete("/conversations/:id", (req, res) => {
  const result = store.deleteConversation(req.params.id, req.user.id);
  if (!result.success) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }
  res.json({ success: true, message: "Conversation deleted" });
});

// POST Send Message (with Reply & Forward support)
router.post("/conversations/:id/messages", (req, res) => {
  const userId = req.user.id;
  const { text, type = "text", mediaUrl = null, replyTo = null, forwarded = false } = req.body;
  if (!text && !mediaUrl) {
    return res.status(400).json({ success: false, message: "Message content or attachment is required" });
  }

  const result = store.sendMessage(req.params.id, { text, type, mediaUrl, replyTo, forwarded, senderId: userId });
  if (!result) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }

  // Real-time broadcast via Socket.io
  const io = getIO();
  if (io) {
    io.to(`chat:${req.params.id}`).emit("message:received", {
      chatId: req.params.id,
      message: result.message,
    });
    emitConversationUpdate(io, result.conversation, {
      chatId: req.params.id,
      lastMessage: result.conversation.lastMessage,
      time: result.conversation.time,
    });
  }

  res.status(201).json({ success: true, ...result });
});

// POST React to a Message with Emoji
router.post("/conversations/:id/messages/:messageId/react", (req, res) => {
  const { emoji } = req.body;
  if (!emoji) {
    return res.status(400).json({ success: false, message: "Emoji is required" });
  }

  const result = store.reactToMessage(req.params.id, req.params.messageId, emoji, req.user.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }

  const io = getIO();
  if (io) {
    io.to(`chat:${req.params.id}`).emit("message:reacted", result);
  }

  res.json({ success: true, ...result });
});

// POST Forward Message to Target Chats
router.post("/conversations/:id/messages/:messageId/forward", (req, res) => {
  const { targetChatIds } = req.body;
  if (!Array.isArray(targetChatIds) || targetChatIds.length === 0) {
    return res.status(400).json({ success: false, message: "targetChatIds array is required" });
  }

  const results = store.forwardMessage(req.params.id, req.params.messageId, targetChatIds, req.user.id);
  if (!results) {
    return res.status(404).json({ success: false, message: "Message or source chat not found" });
  }

  const io = getIO();
  if (io) {
    results.forEach((r) => {
      io.to(`chat:${r.chatId}`).emit("message:received", {
        chatId: r.chatId,
        message: r.message,
      });
      emitConversationUpdate(io, r.conversation, {
        chatId: r.chatId,
        lastMessage: r.conversation.lastMessage,
        time: r.conversation.time,
      });
    });
  }

  res.json({ success: true, count: results.length, forwarded: results });
});

// DELETE Unsend Message
router.delete("/conversations/:id/messages/:messageId", (req, res) => {
  const conversation = store.getConversationById(req.params.id, req.user.id);
  const result = store.unsendMessage(req.params.id, req.params.messageId, req.user.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }

  const io = getIO();
  if (io) {
    io.to(`chat:${req.params.id}`).emit("message:unsent", {
      chatId: req.params.id,
      messageId: req.params.messageId,
      lastMessage: result.lastMessage,
    });
    emitConversationUpdate(io, conversation, {
      chatId: req.params.id,
      lastMessage: result.lastMessage,
      time: "Just now",
    });
  }

  res.json({ success: true, ...result });
});

// POST Toggle Like on a Message
router.post("/conversations/:id/messages/:messageId/like", (req, res) => {
  const result = store.toggleLikeMessage(req.params.id, req.params.messageId, req.user.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }

  // Real-time broadcast via Socket.io
  const io = getIO();
  if (io) {
    io.to(`chat:${req.params.id}`).emit("message:liked", result);
  }

  res.json({ success: true, ...result });
});

// POST Toggle Mute Conversation
router.post("/conversations/:id/mute", (req, res) => {
  const result = store.toggleMuteConversation(req.params.id, req.user.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }
  res.json({ success: true, ...result });
});

// POST Toggle Block User
router.post("/conversations/:id/block", (req, res) => {
  const result = store.toggleBlockConversation(req.params.id, req.user.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }
  res.json({ success: true, ...result });
});

module.exports = router;
