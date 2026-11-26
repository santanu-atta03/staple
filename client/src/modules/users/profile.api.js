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
