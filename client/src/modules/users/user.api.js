import api from "../../api/axios";

export const fetchUserProfile = async (username) => {
  const { data } = await api.get(`/users/${username}`);
  return data.user;
};

export const updateMyProfile = async (payload) => {
  const { data } = await api.patch("/users/me", payload);
  return data.user;
};

export const fetchUserPosts = async (userId, page = 1) => {
  const { data } = await api.get(`/posts/user/${userId}?page=${page}`);
  return data.posts || [];
};

export const toggleFollowUser = async (userId) => {
  const { data } = await api.post(`/follows/${userId}`);
  return data;
};

export const fetchFollowers = async (userId) => {
  const { data } = await api.get(`/follows/${userId}/followers`);
  return data.followers || [];
};

export const fetchFollowing = async (userId) => {
  const { data } = await api.get(`/follows/${userId}/following`);
  return data.following || [];
};
