import api from "../../api/axios";

// Fetch list of conversations
export const fetchConversations = async (q = "", tab = "all") => {
  const { data } = await api.get(`/messages/conversations?q=${encodeURIComponent(q)}&tab=${tab}`);
  return data.conversations || [];
};

// Fetch notes
export const fetchNotes = async () => {
  const { data } = await api.get("/messages/notes");
  return data.notes || [];
};

export const searchPeople = async (query) => {
  const { data } = await api.get(`/messages/people?q=${encodeURIComponent(query)}`);
  return data.people || [];
};

// Update personal note
export const updateUserNote = async (note) => {
  const { data } = await api.post("/messages/notes", { note });
  return data.notes || [];
};

// Delete personal note
export const deleteUserNote = async () => {
  const { data } = await api.delete("/messages/notes");
  return data.notes || [];
};

// Reply to a user's note
export const replyToNote = async (id, text) => {
  const { data } = await api.post(`/messages/notes/${id}/reply`, { text });
  return data;
};

// Fetch single conversation with messages
export const fetchConversation = async (id) => {
  const { data } = await api.get(`/messages/conversations/${id}`);
  return data.conversation;
};

// Send message (supports replyTo and forwarded)
export const sendMessage = async (id, { text, type = "text", mediaUrl = null, replyTo = null, forwarded = false }) => {
  const { data } = await api.post(`/messages/conversations/${id}/messages`, {
    text,
    type,
    mediaUrl,
    replyTo,
    forwarded,
  });
  return data;
};

// React to message with emoji
export const reactToMessage = async (chatId, messageId, emoji) => {
  const { data } = await api.post(`/messages/conversations/${chatId}/messages/${messageId}/react`, {
    emoji,
  });
  return data;
};

// Forward message to multiple target chats
export const forwardMessage = async (sourceChatId, messageId, targetChatIds) => {
  const { data } = await api.post(`/messages/conversations/${sourceChatId}/messages/${messageId}/forward`, {
    targetChatIds,
  });
  return data;
};

// Unsend message
export const unsendMessage = async (chatId, messageId) => {
  const { data } = await api.delete(`/messages/conversations/${chatId}/messages/${messageId}`);
  return data;
};

// Toggle like on message
export const toggleLikeMessage = async (chatId, messageId) => {
  const { data } = await api.post(`/messages/conversations/${chatId}/messages/${messageId}/like`);
  return data;
};

// Delete conversation
export const deleteConversation = async (id) => {
  const { data } = await api.delete(`/messages/conversations/${id}`);
  return data;
};

// Toggle mute notifications
export const toggleMuteConversation = async (id) => {
  const { data } = await api.post(`/messages/conversations/${id}/mute`);
  return data;
};

// Toggle block user
export const toggleBlockConversation = async (id) => {
  const { data } = await api.post(`/messages/conversations/${id}/block`);
  return data;
};

// Create new conversation
export const createConversation = async (userData) => {
  const { data } = await api.post("/messages/conversations", userData);
  return data.conversation;
};
