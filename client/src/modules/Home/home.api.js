import api from "../../api/axios";

export const fetchFeedPage = async (tab = "for-you", query = "", { page = 1, limit = 12, signal } = {}) => {
  const { data } = await api.get(
    `/feed?tab=${encodeURIComponent(tab)}&q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    { signal }
  );
  return {
    posts: data.posts || [],
    hasMore: Boolean(data.hasMore),
    page: data.page || page,
  };
};

export const fetchFeed = async (tab = "for-you", query = "") => {
  const { posts } = await fetchFeedPage(tab, query);
  return posts;
};

export const createNewPost = async ({ content, media = [], tags = [], location = "", visibility = "public" }) => {
  const { data } = await api.post("/posts", { content, media, tags, location, visibility });
  return data.post;
};

export const deletePost = async (postId) => {
  const { data } = await api.delete(`/posts/${postId}`);
  return data;
};

export const togglePostLike = async (postId) => {
  const { data } = await api.post(`/likes/${postId}`);
  return data;
};

export const fetchPostLikes = async (postId, { page = 1, limit = 20 } = {}) => {
  const { data } = await api.get(`/likes/${postId}?page=${page}&limit=${limit}`);
  return {
    users: data.users || [],
    hasMore: Boolean(data.hasMore),
    totalCount: data.totalCount || 0,
    page: data.page || page,
  };
};

export const addPostComment = async (postId, text) => {
  const { data } = await api.post(`/comments/${postId}`, { content: text, text });
  return data;
};

export const fetchPostComments = async (postId, { page = 1, limit = 20, sort = "newest" } = {}) => {
  const { data } = await api.get(`/comments/${postId}?page=${page}&limit=${limit}&sort=${sort}`);
  return data.comments || [];
};

export const fetchPostCommentsPage = async (postId, { page = 1, limit = 20, sort = "newest" } = {}) => {
  const { data } = await api.get(`/comments/${postId}?page=${page}&limit=${limit}&sort=${sort}`);
  return {
    comments: data.comments || [],
    hasMore: Boolean(data.hasMore),
    totalCount: data.totalCount || 0,
    page: data.page || page,
  };
};

export const fetchCommentReplies = async (postId, commentId, { page = 1, limit = 10 } = {}) => {
  const { data } = await api.get(`/comments/${postId}/${commentId}/replies?page=${page}&limit=${limit}`);
  return {
    replies: data.replies || [],
    hasMore: Boolean(data.hasMore),
    totalCount: data.totalCount || 0,
    page: data.page || page,
  };
};

export const editComment = async (commentId, content) => {
  const { data } = await api.patch(`/comments/${commentId}`, { content });
  return data;
};

export const toggleCommentReaction = async (commentId, type = "like") => {
  const { data } = await api.post(`/comments/${commentId}/reaction`, { type });
  return data;
};

export const toggleHideComment = async (commentId) => {
  const { data } = await api.patch(`/comments/${commentId}/hide`);
  return data;
};

export const sharePost = async (postId) => {
  const { data } = await api.post(`/posts/${postId}/share`);
  return data;
};

export const voteOnPoll = async (postId, optionId) => {
  const { data } = await api.post(`/posts/${postId}/poll`, { optionId });
  return data.poll;
};

export const toggleBookmark = async (postId) => {
  const { data } = await api.post(`/posts/${postId}/bookmark`);
  return data;
};

export const toggleAudioPlayback = async (postId) => {
  const { data } = await api.post(`/posts/${postId}/audio`);
  return data.audio;
};

export const fetchStoriesList = async () => {
  const { data } = await api.get("/stories");
  return data.stories || [];
};

export const markStoryViewed = async (storyId) => {
  const { data } = await api.post(`/stories/${storyId}/view`);
  return data.story;
};

export const fetchSidebarData = async () => {
  const { data } = await api.get("/sidebar");
  return data;
};

export const toggleFollowPerson = async (personId) => {
  const { data } = await api.post(`/sidebar/follow/${personId}`);
  return data.person;
};

export const toggleGroupMembership = async (groupId) => {
  const { data } = await api.post(`/sidebar/join-group/${groupId}`);
  return data.group;
};

export const searchPeople = async (query = "") => {
  const { data } = await api.get(`/search/people?q=${encodeURIComponent(query)}`);
  return data.people || [];
};

export const sendFriendRequestApi = async (userId) => {
  const { data } = await api.post(`/notifications/sidebar/suggested/${userId}/toggle`);
  return data;
};

export const uploadNewStory = async ({ caption, mediaUrl }) => {
  const { data } = await api.post("/stories", { caption, mediaUrl });
  return data.story;
};

export const deleteStory = async (storyId) => {
  const { data } = await api.delete(`/stories/${storyId}`);
  return data;
};

export const fetchBookmarks = async () => {
  const { data } = await api.get("/bookmarks");
  return data.posts || [];
};

export const replyToComment = async (postId, commentId, text) => {
  const { data } = await api.post(`/comments/${postId}/${commentId}/reply`, { text });
  return data;
};

export const deleteComment = async (postId, commentId) => {
  const { data } = await api.delete(`/comments/${postId}/${commentId}`);
  return data;
};

export const editPost = async (postId, updates) => {
  const { data } = await api.patch(`/posts/${postId}`, updates);
  return data.post;
};

export const fetchGroups = async () => {
  const { data } = await api.get("/groups");
  return data.groups || [];
};

export const createNewGroup = async ({ name, category, description, isPrivate }) => {
  const { data } = await api.post("/groups", { name, category, description, isPrivate });
  return data.group;
};

export const fetchProfile = async () => {
  const { data } = await api.get("/users/profile");
  return data.user;
};

export const updateProfile = async (updates) => {
  const { data } = await api.patch("/users/profile", updates);
  return data.user;
};

export const uploadMediaFiles = async (files) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }
  const { data } = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.media || [];
};
