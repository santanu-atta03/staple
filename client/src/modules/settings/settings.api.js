import axios from "axios";

const API_BASE = "/api/v1/settings";

/**
 * Fetch full settings document from backend DB
 */
export async function fetchSettings() {
  try {
    const res = await axios.get(API_BASE);
    return res.data;
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    throw err;
  }
}

/**
 * Update general settings sections (privacy, notifications, appearance, content)
 */
export async function updateSettings(data) {
  try {
    const res = await axios.patch(API_BASE, data);
    return res.data;
  } catch (err) {
    console.error("Failed to update settings:", err);
    throw err;
  }
}

/**
 * Update profile photo immediately or reset to default
 */
export async function updateAvatar(avatar) {
  try {
    const res = await axios.post(`${API_BASE}/avatar`, { avatar });
    return res.data;
  } catch (err) {
    console.error("Failed to update avatar:", err);
    throw err;
  }
}

/**
 * Update profile information and sync with currentUser in database
 */
export async function updateProfileSettings(data) {
  try {
    const res = await axios.patch(`${API_BASE}/profile`, data);
    return res.data;
  } catch (err) {
    console.error("Failed to update profile settings:", err);
    throw err;
  }
}

/**
 * Update password
 */
export async function updatePassword({ currentPassword, newPassword }) {
  try {
    const res = await axios.post(`${API_BASE}/password`, { currentPassword, newPassword });
    return res.data;
  } catch (err) {
    console.error("Failed to update password:", err);
    throw err;
  }
}

/**
 * Revoke an active device session
 */
export async function revokeSession(sessionId) {
  try {
    const res = await axios.post(`${API_BASE}/sessions/${sessionId}/revoke`);
    return res.data;
  } catch (err) {
    console.error("Failed to revoke session:", err);
    throw err;
  }
}

/**
 * Revoke all other active device sessions
 */
export async function revokeAllOtherSessions() {
  try {
    const res = await axios.post(`${API_BASE}/sessions/revoke-all`);
    return res.data;
  } catch (err) {
    console.error("Failed to revoke all other sessions:", err);
    throw err;
  }
}

/**
 * Toggle active state of a Close Friend
 */
export async function toggleCloseFriend(friendId) {
  try {
    const res = await axios.post(`${API_BASE}/close-friends/${friendId}/toggle`);
    return res.data;
  } catch (err) {
    console.error("Failed to toggle close friend:", err);
    throw err;
  }
}

/**
 * Add a new friend to Close Friends
 */
export async function addCloseFriend(friendData) {
  try {
    const res = await axios.post(`${API_BASE}/close-friends`, friendData);
    return res.data;
  } catch (err) {
    console.error("Failed to add close friend:", err);
    throw err;
  }
}

/**
 * Add a muted keyword or hashtag
 */
export async function addMutedWord(word) {
  try {
    const res = await axios.post(`${API_BASE}/muted-words`, { word });
    return res.data;
  } catch (err) {
    console.error("Failed to add muted word:", err);
    throw err;
  }
}

/**
 * Remove a muted keyword or hashtag
 */
export async function removeMutedWord(word) {
  try {
    const res = await axios.delete(`${API_BASE}/muted-words/${encodeURIComponent(word)}`);
    return res.data;
  } catch (err) {
    console.error("Failed to remove muted word:", err);
    throw err;
  }
}

/**
 * Block an account
 */
export async function blockUser(userData) {
  try {
    const res = await axios.post(`${API_BASE}/blocked`, userData);
    return res.data;
  } catch (err) {
    console.error("Failed to block user:", err);
    throw err;
  }
}

/**
 * Unblock a previously blocked account
 */
export async function unblockUser(userId) {
  try {
    const res = await axios.post(`${API_BASE}/blocked/${userId}/unblock`);
    return res.data;
  } catch (err) {
    console.error("Failed to unblock user:", err);
    throw err;
  }
}

/**
 * Submit feedback or support inquiry ticket
 */
export async function submitSupportTicket(ticketData) {
  try {
    const res = await axios.post(`${API_BASE}/support`, ticketData);
    return res.data;
  } catch (err) {
    console.error("Failed to submit support ticket:", err);
    throw err;
  }
}

/**
 * Trigger archival data export
 */
export async function triggerArchiveExport() {
  try {
    const res = await axios.post(`${API_BASE}/archive`);
    return res.data;
  } catch (err) {
    console.error("Failed to trigger archive export:", err);
    throw err;
  }
}
