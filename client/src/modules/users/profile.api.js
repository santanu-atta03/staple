import api from "../../api/axios";

// Fetch user profile details and stats
export const fetchUserProfile = async (username) => {
  const { data } = await api.get(`/users/${encodeURIComponent(username)}`);
  return data.user;
};

// Update profile details (Name, bio, website, location, pronouns, etc.)
export const updateUserProfile = async (updates) => {
  const { data } = await api.patch("/users/me", updates);
  return data.user;
};

// Fetch user posts by tab (posts, reels, saved, tagged)
export const fetchUserPosts = async (username, tab = "posts") => {
  const { data } = await api.get(`/users/${encodeURIComponent(username)}/posts?tab=${tab}`);
  return data.posts || [];
};

// Fetch user story highlights
export const fetchUserHighlights = async (username) => {
  const { data } = await api.get(`/users/${encodeURIComponent(username)}/highlights`);
  return data.highlights || [];
};

// Create a new story highlight
export const createUserHighlight = async (username, highlightData) => {
  const { data } = await api.post(`/users/${encodeURIComponent(username)}/highlights`, highlightData);
  return data.highlight;
};

// Fetch followers list
export const fetchUserFollowers = async (username) => {
  const { data } = await api.get(`/users/${encodeURIComponent(username)}/followers`);
  return data.followers || [];
};

// Fetch following list
export const fetchUserFollowing = async (username) => {
  const { data } = await api.get(`/users/${encodeURIComponent(username)}/following`);
  return data.following || [];
};

// Toggle follow / unfollow user
export const toggleFollowUser = async (username) => {
  const { data } = await api.post(`/users/${encodeURIComponent(username)}/follow`);
  return data;
};

export const checkUsernameAvailable = async (username) => {
  const { data } = await api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
  return Boolean(data.available);
};

export const uploadProfileMedia = async (file) => {
  const formData = new FormData();
  formData.append("files", file);
  const { data } = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.media?.[0]?.url || "";
};

export const fetchFollowRequests = async () => {
  const { data } = await api.get("/users/me/follow-requests");
  return data.requests || [];
};

export const respondFollowRequest = async (requestId, action) => {
  const { data } = await api.post(`/users/me/follow-requests/${requestId}/respond`, { action });
  return data;
};

export const removeFollower = async (followerUsername) => {
  const { data } = await api.delete(`/users/me/followers/${encodeURIComponent(followerUsername)}`);
  return data;
};

export const toggleBlockUser = async (username) => {
  const { data } = await api.post(`/users/${encodeURIComponent(username)}/block`);
  return data;
};

export const reportUser = async (username, reason) => {
  const { data } = await api.post(`/users/${encodeURIComponent(username)}/report`, { reason });
  return data;
};
