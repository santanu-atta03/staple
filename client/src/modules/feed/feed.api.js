import api from "../../api/axios";

export const fetchHomeFeed = async (page = 1, limit = 20) => {
  const { data } = await api.get(`/feed?page=${page}&limit=${limit}`);
  return data.posts || [];
};

export const uploadMediaFiles = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const { data } = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.media || [];
};

export const createNewPost = async ({ content, media }) => {
  const { data } = await api.post("/posts", { content, media });
  return data.post;
};

export const deleteUserPost = async (postId) => {
  await api.delete(`/posts/${postId}`);
};

export const togglePostLike = async (postId, authorId) => {
  const { data } = await api.post(`/likes/${postId}`, { authorId });
  return data;
};