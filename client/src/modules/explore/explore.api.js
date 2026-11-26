import api from "../../api/axios";

// Fetch Explore Feed (Supports category, view, search query, sorting)
export const fetchExploreFeed = async ({
  category = "for-you",
  view = "all",
  q = "",
  sort = "trending",
} = {}) => {
  const queryParams = new URLSearchParams({
    category,
    view,
    q,
    sort,
  }).toString();

  const { data } = await api.get(`/explore?${queryParams}`);
  return data.items || [];
};

// Fetch Explore Sidebar (Audio trends, popular creators, trending communities)
export const fetchExploreSidebar = async () => {
  const { data } = await api.get("/explore/sidebar");
  return {
    audioTrends: data.audioTrends || [],
    creators: data.creators || [],
    communities: data.communities || [],
  };
};

// Fetch single explore item details
export const fetchSingleExplorePost = async (postId) => {
  const { data } = await api.get(`/explore/posts/${postId}`);
  return data.post;
};

// Toggle like on explore post
export const toggleExplorePostLike = async (postId) => {
  const { data } = await api.post(`/likes/${postId}`);
  return {
    ...data,
    isLiked: data.liked,
    likesCount: data.totalLikes,
  };
};

// Toggle bookmark on explore post
export const toggleExplorePostBookmark = async (postId) => {
  const { data } = await api.post(`/explore/posts/${postId}/bookmark`);
  return data;
};

// Add comment to explore post
export const addExplorePostComment = async (postId, text) => {
  const { data } = await api.post(`/explore/posts/${postId}/comments`, { text });
  return data;
};

// Follow / Unfollow creator
export const toggleFollowCreator = async (creatorId) => {
  const { data } = await api.post(`/explore/creators/${creatorId}/follow`);
  return data;
};

// Join / Leave community
export const toggleJoinCommunity = async (communityId) => {
  const { data } = await api.post(`/explore/communities/${communityId}/join`);
  return data;
};
