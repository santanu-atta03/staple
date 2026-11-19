import api from "../../api/axios";

export const fetchPostById = async (postId) => {
  const { data } = await api.get(`/posts/${postId}`);
  return data.post;
};

export const fetchPostComments = async (postId, page = 1) => {
  const { data } = await api.get(`/comments/${postId}?page=${page}`);
  return data.comments || [];
};

export const createPostComment = async (postId, content) => {
  const { data } = await api.post(`/comments/${postId}`, { content });
  return data.comment;
};

export const deletePostComment = async (commentId) => {
  await api.delete(`/comments/${commentId}`);
};