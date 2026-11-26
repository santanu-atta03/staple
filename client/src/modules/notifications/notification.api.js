import api from "../../api/axios";

// Fetch notifications list filtered by tab (all, likes, comments, mentions, friends)
export const fetchNotifications = async (tab = "all") => {
  const { data } = await api.get(`/notifications?tab=${tab}`);
  return data;
};

// Fetch unread count badge
export const fetchUnreadCount = async () => {
  const { data } = await api.get("/notifications/unread-count");
  return data.unreadCount || 0;
};

// Mark all notifications as read
export const markAllNotificationsRead = async () => {
  const { data } = await api.patch("/notifications/read-all");
  return data;
};

// Mark a single notification as read
export const markNotificationRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

// Delete / dismiss a notification
export const deleteNotification = async (id) => {
  const { data } = await api.delete(`/notifications/${id}`);
  return data;
};

// Reply to a comment notification
export const replyNotificationComment = async (id, text) => {
  const { data } = await api.post(`/notifications/${id}/reply`, { text });
  return data.reply;
};

// Toggle like on a comment notification
export const toggleLikeNotificationComment = async (id) => {
  const { data } = await api.post(`/notifications/${id}/like`);
  return data;
};

// Accept or decline friend request in notification item
export const respondNotificationFriendRequest = async (id, action) => {
  const { data } = await api.post(`/notifications/${id}/action`, { action });
  return data;
};

// Fetch right sidebar widgets (friendRequests, birthdays, suggestedFriends)
export const fetchNotificationSidebar = async () => {
  const { data } = await api.get("/notifications/sidebar");
  return data;
};

// Right sidebar friend request action
export const respondSidebarFriendRequest = async (id, action) => {
  const { data } = await api.post(`/notifications/sidebar/friend-requests/${id}/${action}`);
  return data;
};

// Toggle birthday wish
export const toggleWishBirthday = async (id) => {
  const { data } = await api.post(`/notifications/sidebar/birthdays/${id}/wish`);
  return data;
};

// Toggle add / request suggested friend
export const toggleSuggestedFriend = async (id) => {
  const { data } = await api.post(`/notifications/sidebar/suggested/${id}/toggle`);
  return data;
};