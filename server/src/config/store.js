const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "../../data/db.json");

const defaultInitialState = {
  posts: [],
  stories: [
    {
      id: "your-story",
      name: "Your story",
      avatar: "/recreation/avatar_left_elena_hires.png",
      fallback: "/recreation/avatar_left_elena.png",
      isYours: true,
    },
  ],
  following: [],
  bookmarks: [],
  drafts: [],
  currentUser: {
    _id: "user_elena_vance",
    name: "Elena Vance",
    username: "elenavance",
    avatar: "/recreation/avatar_left_elena_hires.png",
    fallbackAvatar: "/recreation/avatar_left_elena.png",
    isVerified: true,
    roleTag: "Creative Vanguard",
    pronouns: "she/her",
    bio: "Visual designer & street photographer based between SF and Tokyo. Exploring spatial interfaces, slow coffee rituals, and high-fidelity 35mm grain. Founder at @filmphotocollective.",
    website: "https://elenavance.design",
    location: "San Francisco, CA & Tokyo, JP",
    joined: "Joined Staple March 2024",
    followingCount: 0,
    followersCount: 0,
    postsCount: 0,
  },
  people: [
    {
      id: "marcus",
      name: "Marcus Chen",
      username: "marcus_v",
      avatar: "/recreation/avatar_marcus_hires.png",
      fallback: "/recreation/avatar_marcus.png",
      isVerified: true,
      subtitle: "14 mutual friends",
      isFollowing: false,
      bio: "Analog street photography • Leica M6 • Tokyo & SF",
    },
    {
      id: "sarah",
      name: "Sarah Lin",
      username: "sarah_lin",
      avatar: "/recreation/avatar_sarah_lin_hires.png",
      fallback: "/recreation/avatar_sarah_lin.png",
      isVerified: false,
      subtitle: "8 mutual friends",
      isFollowing: false,
      bio: "Typography, book design & architecture in Copenhagen.",
    },
    {
      id: "karan",
      name: "Karan Varma",
      username: "karan.v",
      avatar: null,
      initials: "KV",
      isVerified: true,
      subtitle: "Suggested creator",
      isFollowing: false,
      bio: "Spatial audio engineer & experimental synthesist.",
    },
  ],
  groups: [
    {
      id: "photo",
      name: "Film Photography Club",
      category: "Creative Arts",
      description: "Dedicated to analog capture, darkroom techniques, and 35mm / medium format visual essays.",
      members: "18.4K members • 12 posts/day",
      memberCount: 18420,
      joined: false,
      isPrivate: false,
      icon: "camera",
      discussions: [
        { id: "disc_1", title: "Best lab for Kodak Portra 400 push processing in SF?", author: "Elena Vance", replies: 14 },
        { id: "disc_2", title: "Ilford HP5+ grain comparisons in Rodinal 1:50", author: "Marcus Chen", replies: 28 },
      ],
    },
    {
      id: "hikers",
      name: "Urban Hikers & Explorers",
      category: "Outdoors & Adventure",
      description: "Documenting brutalist concrete structures, hidden urban waterways, and high-altitude rooftop views.",
      members: "9.2K members • 8 friends are in",
      memberCount: 9240,
      joined: false,
      isPrivate: false,
      icon: "footprints",
      discussions: [
        { id: "disc_3", title: "Twin Peaks night ascent & long exposure meetup", author: "Julian Thorne", replies: 19 },
      ],
    },
    {
      id: "spatial",
      name: "Spatial Interface Guild",
      category: "Design & Technology",
      description: "Exploring post-glass computing, ambient typography, and tactile UI patterns.",
      members: "6.1K members • 5 posts/day",
      memberCount: 6150,
      joined: true,
      isPrivate: true,
      icon: "layers",
      discussions: [
        { id: "disc_4", title: "Dynamic blur shaders in Safari 18 vs Chromium", author: "Elena Vance", replies: 32 },
      ],
    },
  ],
};

class PersistentStore {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          ...defaultInitialState,
          ...parsed,
          currentUser: {
            ...defaultInitialState.currentUser,
            ...(parsed.currentUser || {}),
          },
        };
      }
    } catch (err) {
      console.warn("Could not load db.json, creating new database instance:", err.message);
    }
    const fresh = JSON.parse(JSON.stringify(defaultInitialState));
    this.saveData(fresh);
    return fresh;
  }

  saveData(dataToSave = this.data) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write to db.json:", err.message);
    }
  }

  get currentUser() {
    return this.data.currentUser;
  }

  get people() {
    return this.data.people;
  }

  get groups() {
    return this.data.groups;
  }

  get posts() {
    return this.data.posts;
  }

  get stories() {
    return this.data.stories;
  }

  get bookmarks() {
    return this.data.bookmarks;
  }

  getFeed(tab = "for-you", query = "") {
    let list = this.data.posts;

    if (tab === "following") {
      const followedSet = new Set(this.data.following);
      list = list.filter((p) => {
        const authorHandle = p.authorId?.username || p.authorId?.id || p.authorId?._id;
        return followedSet.has(authorHandle) || p.authorId?.username === this.currentUser.username;
      });
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.authorId?.name?.toLowerCase().includes(q) ||
          p.authorId?.username?.toLowerCase().includes(q) ||
          (p.location && p.location.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return list;
  }

  getPostById(postId) {
    return this.data.posts.find((p) => p._id === postId);
  }

  createPost({ authorId, content, media = [], tags = [], location = "", visibility = "public" }) {
    const author =
      typeof authorId === "object" && authorId.name
        ? authorId
        : this.currentUser;

    const extractedTags = tags.length > 0
      ? tags
      : (content.match(/#[a-zA-Z0-9_]+/g) || []);

    const newPost = {
      _id: "post_" + Date.now(),
      authorId: {
        _id: author._id || "user_elena_vance",
        name: author.name || "Elena Vance",
        username: author.username || "elenavance",
        avatar: author.avatar || "/recreation/avatar_left_elena_hires.png",
        fallbackAvatar: "/recreation/avatar_left_elena.png",
        isVerified: author.isVerified ?? true,
      },
      time: "Just now",
      location: location || "",
      visibility: visibility || "public",
      content: content.trim(),
      tags: extractedTags,
      media: media || [],
      isLiked: false,
      likesCount: 0,
      isSaved: false,
      commentsCount: 0,
      comments: [],
      type: media.length > 0 ? "media" : "standard",
      tab: "for-you",
      createdAt: new Date().toISOString(),
    };

    this.data.posts.unshift(newPost);
    this.data.currentUser.postsCount = (this.data.currentUser.postsCount || 0) + 1;
    this.saveData();
    return newPost;
  }

  updatePost(postId, updates) {
    const post = this.getPostById(postId);
    if (!post) return null;

    if (updates.content !== undefined) post.content = updates.content.trim();
    if (updates.tags !== undefined) post.tags = updates.tags;
    if (updates.location !== undefined) post.location = updates.location;
    if (updates.visibility !== undefined) post.visibility = updates.visibility;

    this.saveData();
    return post;
  }

  deletePost(postId) {
    const idx = this.data.posts.findIndex((p) => p._id === postId);
    if (idx !== -1) {
      this.data.posts.splice(idx, 1);
      this.data.bookmarks = this.data.bookmarks.filter((id) => id !== postId);
      this.data.currentUser.postsCount = Math.max(0, (this.data.currentUser.postsCount || 1) - 1);
      this.saveData();
      return true;
    }
    return false;
  }

  toggleLike(postId) {
    const post = this.getPostById(postId);
    if (!post) return null;

    post.isLiked = !post.isLiked;
    post.likesCount = Math.max(0, (post.likesCount || 0) + (post.isLiked ? 1 : -1));

    if (post.likedBy) {
      post.likedBy.othersCount = post.likesCount;
    }

    this.saveData();
    return {
      postId,
      isLiked: post.isLiked,
      likesCount: post.likesCount,
    };
  }

  toggleBookmark(postId) {
    const post = this.getPostById(postId);
    if (!post) return null;

    post.isSaved = !post.isSaved;
    if (post.isSaved) {
      if (!this.data.bookmarks.includes(postId)) this.data.bookmarks.push(postId);
    } else {
      this.data.bookmarks = this.data.bookmarks.filter((id) => id !== postId);
    }

    this.saveData();
    return {
      postId,
      isSaved: post.isSaved,
      bookmarksCount: this.data.bookmarks.length,
    };
  }

  getBookmarkedPosts() {
    const bookmarkSet = new Set(this.data.bookmarks);
    return this.data.posts.filter((p) => bookmarkSet.has(p._id));
  }

  addComment(postId, { user, text }) {
    const post = this.getPostById(postId);
    if (!post) return null;

    const author = user || this.currentUser;
    const newComment = {
      _id: "comm_" + Date.now(),
      author: {
        name: author.name || "Elena Vance",
        username: author.username || "elenavance",
        avatar: author.avatar || "/recreation/avatar_left_elena_hires.png",
      },
      content: text.trim(),
      createdAt: "Just now",
      replies: [],
    };

    if (!post.comments) post.comments = [];
    post.comments.push(newComment);
    post.commentsCount = (post.commentsCount || 0) + 1;

    this.saveData();
    return {
      comment: newComment,
      commentsCount: post.commentsCount,
      comments: post.comments,
    };
  }

  addReply(postId, commentId, { user, text }) {
    const post = this.getPostById(postId);
    if (!post || !post.comments) return null;

    const comment = post.comments.find((c) => c._id === commentId);
    if (!comment) return null;

    const author = user || this.currentUser;
    const reply = {
      _id: "reply_" + Date.now(),
      author: {
        name: author.name || "Elena Vance",
        username: author.username || "elenavance",
        avatar: author.avatar || "/recreation/avatar_left_elena_hires.png",
      },
      content: text.trim(),
      createdAt: "Just now",
    };

    if (!comment.replies) comment.replies = [];
    comment.replies.push(reply);
    post.commentsCount = (post.commentsCount || 0) + 1;

    this.saveData();
    return {
      reply,
      commentsCount: post.commentsCount,
      comments: post.comments,
    };
  }

  deleteComment(postId, commentId) {
    const post = this.getPostById(postId);
    if (!post || !post.comments) return false;

    const initialLen = post.comments.length;
    post.comments = post.comments.filter((c) => c._id !== commentId);

    if (post.comments.length < initialLen) {
      post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
      this.saveData();
      return true;
    }
    return false;
  }

  getComments(postId) {
    const post = this.getPostById(postId);
    return post ? post.comments || [] : [];
  }

  votePoll(postId, optionId) {
    const post = this.getPostById(postId);
    if (!post || !post.poll) return null;

    const poll = post.poll;
    const opt = poll.options.find((o) => o.id === optionId);
    if (opt) {
      if (poll.selectedOption && poll.selectedOption !== optionId) {
        const prevOpt = poll.options.find((o) => o.id === poll.selectedOption);
        if (prevOpt && prevOpt.votes > 0) prevOpt.votes -= 1;
      }
      if (poll.selectedOption !== optionId) {
        opt.votes += 1;
        poll.totalVotes += 1;
      }
      poll.selectedOption = optionId;
    }

    this.saveData();
    return poll;
  }

  toggleAudio(postId) {
    const post = this.getPostById(postId);
    if (!post || !post.audio) return null;

    post.audio.isPlaying = !post.audio.isPlaying;
    this.saveData();
    return post.audio;
  }

  // Stories
  getStories() {
    // Filter expired stories (older than 24 hours)
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    this.data.stories = this.data.stories.filter((s) => {
      if (s.isYours) return true;
      if (!s.createdAt) return true;
      return now - new Date(s.createdAt).getTime() < dayMs;
    });
    return this.data.stories;
  }

  viewStory(storyId) {
    const story = this.data.stories.find((s) => s.id === storyId);
    if (story) {
      story.isViewed = true;
      this.saveData();
    }
    return story;
  }

  addStory({ name, avatar, mediaUrl, caption }) {
    const newStory = {
      id: "story_" + Date.now(),
      name: name || this.currentUser.username,
      avatar: avatar || this.currentUser.avatar,
      fallback: this.currentUser.fallbackAvatar,
      mediaUrl: mediaUrl || "/profile/post_1_kyoto_lanterns.png",
      caption: caption || "",
      isYours: true,
      isViewed: false,
      createdAt: new Date().toISOString(),
    };
    this.data.stories.push(newStory);
    this.saveData();
    return newStory;
  }

  deleteStory(storyId) {
    this.data.stories = this.data.stories.filter((s) => s.id !== storyId || s.isYours === false);
    this.saveData();
    return true;
  }

  // Trending
  getTrending() {
    const tagCounts = {};
    for (const post of this.data.posts) {
      if (post.tags && Array.isArray(post.tags)) {
        for (const tag of post.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count], idx) => ({
        id: "trend_" + idx,
        tag,
        count: `${count} post${count > 1 ? "s" : ""}`,
        type: "tag",
      }));

    return sortedTags;
  }

  // Groups
  getGroups() {
    return this.data.groups;
  }

  getGroupById(groupId) {
    return this.data.groups.find((g) => g.id === groupId);
  }

  createGroup({ name, category, description, isPrivate = false }) {
    const newGroup = {
      id: "group_" + Date.now(),
      name: name.trim(),
      category: category || "General",
      description: description || "",
      members: "1 member • Just created",
      memberCount: 1,
      joined: true,
      isPrivate: !!isPrivate,
      icon: "users",
      discussions: [],
    };
    this.data.groups.unshift(newGroup);
    this.saveData();
    return newGroup;
  }

  toggleGroup(groupId) {
    const group = this.getGroupById(groupId);
    if (!group) return null;

    group.joined = !group.joined;
    group.memberCount = (group.memberCount || 10) + (group.joined ? 1 : -1);
    group.members = `${(group.memberCount / 1000).toFixed(1)}K members`;
    this.saveData();
    return group;
  }

  // Sidebar
  getSidebarData() {
    return {
      people: this.data.people,
      trending: this.getTrending(),
      groups: this.data.groups,
      currentUser: this.currentUser,
    };
  }

  toggleFollow(personId) {
    const person = this.data.people.find((p) => p.id === personId);
    if (!person) return null;

    person.isFollowing = !person.isFollowing;
    const handle = person.username || person.id;

    if (person.isFollowing) {
      if (!this.data.following.includes(handle)) {
        this.data.following.push(handle);
      }
    } else {
      this.data.following = this.data.following.filter((id) => id !== handle);
    }

    this.data.currentUser.followingCount = this.data.following.length;
    this.saveData();
    return person;
  }

  // Update Profile
  updateProfile(updates) {
    this.data.currentUser = {
      ...this.data.currentUser,
      ...updates,
    };
    this.saveData();
    return this.data.currentUser;
  }
}

const store = new PersistentStore();
module.exports = store;
