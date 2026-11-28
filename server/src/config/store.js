const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "../../data/db.json");
const requireUserId = (userId) => {
  const uid = userId?.toString();
  if (!uid) throw new Error("Authenticated user ID is required");
  return uid;
};


const defaultInitialState = {
  posts: [],
  stories: [],
  following: [],
  bookmarks: [],
  drafts: [],
  notifications: [],
  notificationSidebar: { friendRequests: [], birthdays: [], suggestedFriends: [] },
  notes: [],
  conversations: [],
  currentUser: null,
  legacyCurrentUser: null,
  settings: {},
  highlights: [],
  profilePosts: [],
  people: [],
  groups: [],
  explorePosts: [],
  audioTrends: [],
  creators: [],
  communities: [],
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

        // Ensure per-user isolation dictionaries exist
        const userSettings = parsed.userSettings || {};
        const userBookmarks = parsed.userBookmarks || {};
        const userLikes = parsed.userLikes || {};
        const userFollowing = parsed.userFollowing || {};
        const userHighlights = parsed.userHighlights || {};
        const userNotes = parsed.userNotes || {};

        return {
          ...defaultInitialState,
          ...parsed,
          userSettings,
          userBookmarks,
          userLikes,
          userFollowing,
          userHighlights,
          userNotes,
          userNotificationSidebars: parsed.userNotificationSidebars || {},
          stories: Array.isArray(parsed.stories) ? parsed.stories : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
          notes: Array.isArray(parsed.notes) ? parsed.notes : [],
          highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
          profilePosts: Array.isArray(parsed.profilePosts) ? parsed.profilePosts : [],
          legacyCurrentUser: parsed.legacyCurrentUser || parsed.currentUser || null,
          explorePosts: Array.isArray(parsed.explorePosts) ? parsed.explorePosts : [],
          audioTrends: Array.isArray(parsed.audioTrends) ? parsed.audioTrends : [],
          creators: Array.isArray(parsed.creators) ? parsed.creators : [],
          communities: Array.isArray(parsed.communities) ? parsed.communities : [],
          people: Array.isArray(parsed.people) ? parsed.people : [],
          groups: Array.isArray(parsed.groups) ? parsed.groups : [],
          following: Array.isArray(parsed.following) ? parsed.following : [],
          bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
          settings: parsed.settings || {},
          users: Array.isArray(parsed.users) ? parsed.users : [],
          currentUser: parsed.currentUser || null,
        };
      }
    } catch (err) {
      console.warn("Could not load db.json, creating new database instance:", err.message);
    }
    const fresh = JSON.parse(JSON.stringify(defaultInitialState));
    fresh.userSettings = {};
    fresh.userBookmarks = {};
    fresh.userLikes = {};
    fresh.userFollowing = {};
    fresh.userHighlights = {};
    fresh.userNotes = {};
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

  getFeed(tab = "for-you", query = "", userId = null) {
    const uid = userId?.toString();
    let list = (this.data.posts || []).filter(
      (post) =>
        !post.visibility ||
        post.visibility === "public" ||
        post.authorId?._id?.toString() === uid
    );

    if (tab === "following") {
      const followingList = this.data.userFollowing?.[uid] || [];
      const followedSet = new Set(followingList);
      const currentUsername = this.findUser(uid)?.username;
      list = list.filter((p) => {
        const authorHandle = p.authorId?.username || p.authorId?.id || p.authorId?._id;
        return followedSet.has(authorHandle) || p.authorId?.username === currentUsername;
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

    const likedSet = new Set(this.data.userLikes?.[uid] || []);
    const bookmarkedSet = new Set(this.data.userBookmarks?.[uid] || []);

    return list.map((p) => ({
      ...p,
      isLiked: likedSet.has(p._id),
      isSaved: bookmarkedSet.has(p._id),
    }));
  }

  getPostById(postId) {
    return this.data.posts.find((p) => p._id === postId);
  }

  createPost({ authorId, content, media = [], tags = [], location = "", visibility = "public" }) {
    const author = authorId;
    if (!author?._id && !author?.id) return null;

    const extractedTags = tags.length > 0
      ? tags
      : (content.match(/#[a-zA-Z0-9_]+/g) || []);

    const newPost = {
      _id: `post_${require("crypto").randomUUID()}`,
      authorId: {
        _id: (author._id || author.id).toString(),
        name: author.name || author.fullName || author.username,
        username: author.username,
        avatar: author.avatar || "/default-avatar.svg",
        fallbackAvatar: author.avatar || "/default-avatar.svg",
        isVerified: false,
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
    const owner = this.findUser(author._id || author.id);
    if (owner) owner.postsCount = (owner.postsCount || 0) + 1;
    this.saveData();
    return newPost;
  }

  ownsPost(post, userId) {
    const ownerId = post?.authorId?._id || post?.authorId?.id || post?.authorId;
    return Boolean(userId && ownerId?.toString() === userId.toString());
  }

  updatePost(postId, updates, userId) {
    const post = this.getPostById(postId);
    if (!post || !this.ownsPost(post, userId)) return null;

    if (updates.content !== undefined) post.content = updates.content.trim();
    if (updates.tags !== undefined) post.tags = updates.tags;
    if (updates.location !== undefined) post.location = updates.location;
    if (updates.visibility !== undefined) post.visibility = updates.visibility;

    this.saveData();
    return post;
  }

  deletePost(postId, userId) {
    const idx = this.data.posts.findIndex((p) => p._id === postId);
    if (idx !== -1 && this.ownsPost(this.data.posts[idx], userId)) {
      this.data.posts.splice(idx, 1);
      for (const bookmarks of Object.values(this.data.userBookmarks || {})) {
        const bookmarkIndex = bookmarks.indexOf(postId);
        if (bookmarkIndex !== -1) bookmarks.splice(bookmarkIndex, 1);
      }
      const ownerId = userId.toString();
      const owner = this.findUser(ownerId);
      if (owner) owner.postsCount = Math.max(0, (owner.postsCount || 1) - 1);
      this.saveData();
      return true;
    }
    return false;
  }

  toggleLike(postId, userId = null) {
    const post = this.getPostById(postId);
    if (!post) return null;

    const uid = userId?.toString();
    if (!uid) return null;
    if (!this.data.userLikes) this.data.userLikes = {};
    if (!Array.isArray(this.data.userLikes[uid])) this.data.userLikes[uid] = [];

    const isCurrentlyLiked = this.data.userLikes[uid].includes(postId);
    if (isCurrentlyLiked) {
      this.data.userLikes[uid] = this.data.userLikes[uid].filter((id) => id !== postId);
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    } else {
      this.data.userLikes[uid].push(postId);
      post.likesCount = (post.likesCount || 0) + 1;
    }

    if (post.likedBy) {
      post.likedBy.othersCount = post.likesCount;
    }

    this.saveData();
    return {
      postId,
      isLiked: !isCurrentlyLiked,
      likesCount: post.likesCount,
    };
  }

  toggleBookmark(postId, userId = null) {
    const post = this.getPostById(postId) || (this.data.explorePosts || []).find((e) => e._id === postId);
    if (!post) return null;

    const uid = userId?.toString();
    if (!uid) return null;
    if (!this.data.userBookmarks) this.data.userBookmarks = {};
    if (!Array.isArray(this.data.userBookmarks[uid])) this.data.userBookmarks[uid] = [];

    const isCurrentlySaved = this.data.userBookmarks[uid].includes(postId);
    if (isCurrentlySaved) {
      this.data.userBookmarks[uid] = this.data.userBookmarks[uid].filter((id) => id !== postId);
    } else {
      this.data.userBookmarks[uid].push(postId);
    }

    this.saveData();
    return {
      postId,
      isSaved: !isCurrentlySaved,
      bookmarksCount: this.data.userBookmarks[uid].length,
    };
  }

  getBookmarkedPosts(userId = null) {
    const uid = userId?.toString();
    if (!uid) return [];
    const bookmarkSet = new Set(this.data.userBookmarks?.[uid] || []);
    const all = [...(this.data.posts || []), ...(this.data.explorePosts || [])];
    return all.filter((p) => bookmarkSet.has(p._id));
  }

  addComment(postId, { user, text }) {
    const post = this.getPostById(postId);
    if (!post) return null;

    const author = user;
    if (!author?._id && !author?.id) return null;
    const newComment = {
      _id: "comm_" + Date.now(),
      author: {
        userId: (author._id || author.id).toString(),
        name: author.name || author.fullName || author.username,
        username: author.username,
        avatar: author.avatar || "/default-avatar.svg",
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

    const author = user;
    if (!author?._id && !author?.id) return null;
    const reply = {
      _id: "reply_" + Date.now(),
      author: {
        userId: (author._id || author.id).toString(),
        name: author.name || author.fullName || author.username,
        username: author.username,
        avatar: author.avatar || "/default-avatar.svg",
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

  deleteComment(postId, commentId, userId) {
    const post = this.getPostById(postId);
    if (!post || !post.comments) return false;

    const initialLen = post.comments.length;
    const comment = post.comments.find((item) => item._id === commentId);
    if (
      !comment ||
      (comment.userId !== userId?.toString() && !this.ownsPost(post, userId))
    ) return false;
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

  votePoll(postId, optionId, userId) {
    const post = this.getPostById(postId);
    const uid = userId?.toString();
    if (!post || !post.poll || !uid) return null;

    const poll = post.poll;
    const opt = poll.options.find((o) => o.id === optionId);
    if (opt) {
      if (!poll.votesByUser) poll.votesByUser = {};
      const previousOptionId = poll.votesByUser[uid];
      if (previousOptionId && previousOptionId !== optionId) {
        const prevOpt = poll.options.find((o) => o.id === previousOptionId);
        if (prevOpt && prevOpt.votes > 0) prevOpt.votes -= 1;
      }
      if (previousOptionId !== optionId) {
        opt.votes += 1;
        if (!previousOptionId) poll.totalVotes += 1;
      }
      poll.votesByUser[uid] = optionId;
    }

    this.saveData();
    return { ...poll, selectedOption: poll.votesByUser[uid] || null };
  }

  toggleAudio(postId) {
    const post = this.getPostById(postId);
    if (!post || !post.audio) return null;

    post.audio.isPlaying = !post.audio.isPlaying;
    this.saveData();
    return post.audio;
  }

  // Stories
  getStories(userId) {
    // Filter expired stories (older than 24 hours)
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    this.data.stories = this.data.stories.filter((s) => {
      if (s.isYours) return true;
      if (!s.createdAt) return true;
      return now - new Date(s.createdAt).getTime() < dayMs;
    });
    const uid = userId?.toString();
    return this.data.stories.map((story) => ({
      ...story,
      isYours: Boolean(uid && story.authorId?.toString() === uid),
      isViewed: Boolean(uid && story.viewedBy?.includes(uid)),
    }));
  }

  viewStory(storyId, userId) {
    const uid = userId?.toString();
    if (!uid) return null;
    const story = this.data.stories.find((s) => s.id === storyId);
    if (story) {
      if (!Array.isArray(story.viewedBy)) story.viewedBy = [];
      if (!story.viewedBy.includes(uid)) story.viewedBy.push(uid);
      this.saveData();
    }
    return story ? { ...story, isYours: story.authorId?.toString() === uid, isViewed: true } : null;
  }

  addStory({ mediaUrl, caption }, user) {
    const uid = user?._id?.toString() || user?.id?.toString();
    if (!uid) return null;
    const newStory = {
      id: `story_${require("crypto").randomUUID()}`,
      authorId: uid,
      name: user.username,
      username: user.username,
      avatar: user.avatar || "/default-avatar.svg",
      fallback: user.avatar || "/default-avatar.svg",
      mediaUrl: mediaUrl || "/profile/post_1_kyoto_lanterns.png",
      caption: caption || "",
      isYours: true,
      isViewed: false,
      viewedBy: [],
      createdAt: new Date().toISOString(),
    };
    this.data.stories.push(newStory);
    this.saveData();
    return newStory;
  }

  deleteStory(storyId, userId) {
    const uid = userId?.toString();
    const story = this.data.stories.find(
      (item) => item.id === storyId && item.authorId?.toString() === uid
    );
    if (!story) return false;
    this.data.stories = this.data.stories.filter((s) => s.id !== storyId);
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
  getGroups(userId) {
    const uid = userId?.toString();
    const joined = new Set(this.data.userGroups?.[uid] || []);
    return (this.data.groups || []).map((group) => ({
      ...group,
      joined: joined.has(group.id),
    }));
  }

  getGroupById(groupId, userId) {
    return this.getGroups(userId).find((group) => group.id === groupId);
  }

  createGroup({ name, category, description, isPrivate = false }, userId) {
    if (!userId) return null;
    const newGroup = {
      id: `group_${require("crypto").randomUUID()}`,
      ownerId: userId.toString(),
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

  toggleGroup(groupId, userId) {
    const uid = userId?.toString();
    if (!uid) return null;
    const group = this.data.groups.find((item) => item.id === groupId);
    if (!group) return null;

    if (!this.data.userGroups) this.data.userGroups = {};
    if (!Array.isArray(this.data.userGroups[uid])) this.data.userGroups[uid] = [];
    const isJoined = this.data.userGroups[uid].includes(groupId);
    this.data.userGroups[uid] = isJoined
      ? this.data.userGroups[uid].filter((id) => id !== groupId)
      : [...this.data.userGroups[uid], groupId];
    this.saveData();
    return { ...group, joined: !isJoined };
  }

  // Sidebar
  getSidebarData(userId) {
    const uid = userId?.toString();
    const following = new Set(this.data.userFollowing?.[uid] || []);
    return {
      people: this.data.people.map((person) => ({
        ...person,
        isFollowing: following.has(person.username || person.id),
      })),
      trending: this.getTrending(),
      groups: this.getGroups(uid),
      currentUser: this.findUser(uid),
    };
  }

  toggleFollow(personId, userId) {
    const uid = userId?.toString();
    if (!uid) return null;
    let person = (this.data.people || []).find((p) => p.id === personId || p.username === personId);
    if (!person) {
      const u = this.findUser(personId);
      if (u) {
        person = {
          id: (u._id || u.id).toString(),
          name: u.fullName || u.name || u.username,
          username: u.username,
          avatar: u.avatar || "/default-avatar.svg",
        };
      } else {
        person = {
          id: personId,
          name: personId,
          username: personId,
          avatar: "/default-avatar.svg",
        };
      }
    }

    const targetId = (person.id || person._id || person.username || "").toString();
    const handle = (person.username || targetId).toString();

    if (!this.data.userFollowing) this.data.userFollowing = {};
    if (!Array.isArray(this.data.userFollowing[uid])) this.data.userFollowing[uid] = [];
    const isFollowing =
      this.data.userFollowing[uid].includes(handle) ||
      this.data.userFollowing[uid].includes(targetId);

    if (!isFollowing) {
      if (!this.data.userFollowing[uid].includes(handle)) {
        this.data.userFollowing[uid].push(handle);
      }
      if (targetId && targetId !== handle && !this.data.userFollowing[uid].includes(targetId)) {
        this.data.userFollowing[uid].push(targetId);
      }
    } else {
      this.data.userFollowing[uid] = this.data.userFollowing[uid].filter(
        (id) => id !== handle && id !== targetId
      );
    }

    const user = this.findUser(uid);
    if (user) {
      // Calculate distinct following count
      user.followingCount = new Set(this.data.userFollowing[uid]).size;
    }

    // Calculate actual followers count for target
    let targetFollowersCount = 0;
    Object.keys(this.data.userFollowing).forEach((followerUid) => {
      const list = this.data.userFollowing[followerUid] || [];
      if (list.includes(handle) || list.includes(targetId)) {
        targetFollowersCount += 1;
      }
    });

    const targetUserObj = this.findUser(targetId) || this.findUser(handle);
    if (targetUserObj) {
      targetUserObj.followersCount = targetFollowersCount;
    }
    if (person && typeof person === "object") {
      person.followersCount = targetFollowersCount;
    }

    this.saveData();
    return { ...person, isFollowing: !isFollowing, followersCount: targetFollowersCount };
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

  // Get User Profile with Stats & Status (supports viewerUserId for isolated context)
  getUserProfile(username = "", viewerUserId = null) {
    const handle = (username || "").toLowerCase();

    // Check if target is viewer's own profile
    let isSelf = false;
    let targetUser = null;

    if (viewerUserId) {
      const viewer = this.findUser(viewerUserId);
      if (viewer && (handle === "me" || handle === (viewer.username || "").toLowerCase() || handle === viewer._id || handle === viewer.id)) {
        isSelf = true;
        targetUser = viewer;
      }
    }

    if (!targetUser) {
      if (handle === "me" && this.currentUser) {
        isSelf = true;
        targetUser = this.currentUser;
      } else {
        targetUser = this.findUser(handle);
      }
    }

    // If viewing an actual registered user account:
    if (targetUser) {
      const posts = this.getUserPosts(targetUser.username, "posts", viewerUserId);
      const followingList = this.data.userFollowing?.[targetUser._id || targetUser.id] || [];
      const isFollowing = viewerUserId
        ? (this.data.userFollowing?.[viewerUserId] || []).includes(targetUser.username) || (this.data.userFollowing?.[viewerUserId] || []).includes(targetUser._id || targetUser.id)
        : false;

      const targetIdStr = (targetUser._id || targetUser.id || "").toString();
      const targetHandle = (targetUser.username || "").toLowerCase();
      let calculatedFollowers = 0;
      Object.keys(this.data.userFollowing || {}).forEach((fUid) => {
        const list = this.data.userFollowing[fUid] || [];
        if (
          list.some(
            (val) => val === targetIdStr || (typeof val === "string" && val.toLowerCase() === targetHandle)
          )
        ) {
          calculatedFollowers += 1;
        }
      });

      return {
        _id: targetUser._id || targetUser.id,
        id: targetUser._id || targetUser.id,
        name: targetUser.name || targetUser.username,
        username: targetUser.username,
        avatar: targetUser.avatar || "/default-avatar.svg",
        fallbackAvatar: targetUser.fallbackAvatar || targetUser.avatar || "/default-avatar.svg",
        isVerified: !!targetUser.isVerified,
        roleTag: targetUser.roleTag || "",
        pronouns: targetUser.pronouns || "",
        bio: targetUser.bio || "",
        website: targetUser.website || "",
        location: targetUser.location || "",
        joined: targetUser.joined || "Joined Staple",
        cover: targetUser.cover || "",
        postsCount: posts.length,
        followersCount: calculatedFollowers,
        followingCount: new Set(followingList).size,
        isSelf: isSelf || (viewerUserId && (viewerUserId === targetUser._id || viewerUserId === targetUser.id)),
        isFollowing,
      };
    }

    // Fallback: check creators/people in sidebar
    const person =
      (this.data.people || []).find(
        (p) => (p.username || "").toLowerCase() === handle || p.id === handle
      ) ||
      (this.data.creators || []).find(
        (c) => (c.username || "").toLowerCase() === handle || c.id === handle
      );

    if (person) {
      const isFollowing = (this.data.userFollowing?.[viewerUserId] || []).includes(person.username || person.id);
      return {
        _id: person.id || `user_${person.username}`,
        name: person.name,
        username: person.username,
        avatar: person.avatar,
        fallbackAvatar: person.fallback,
        isVerified: !!person.isVerified,
        roleTag: person.roleTag || "Creator",
        pronouns: person.pronouns || "they/them",
        bio: person.bio || person.subtitle || "Visual designer & creative archivist on Staple.",
        website: person.website || "https://staple.social",
        location: person.location || "San Francisco, CA",
        joined: person.joined || "Joined Staple 2024",
        cover: person.cover || "/profile/clean_cover.png",
        postsCount: person.postsCount || 12,
        followersCount: person.followersCount || "4.8k",
        followingCount: person.followingCount || 230,
        isSelf: false,
        isFollowing,
      };
    }

    return null;
  }

  // Get User Posts by Tab (posts, reels, saved, tagged) strictly isolated
  getUserPosts(username = "", tab = "posts", viewerUserId = null) {
    const handle = (username || "").toLowerCase();
    if (handle === "me" && !viewerUserId) return [];
    const targetUser = handle === "me" ? this.findUser(viewerUserId) : this.findUser(handle);
    if (!targetUser) return [];
    const targetId = targetUser._id || targetUser.id;
    const targetUsername = targetUser.username;
    const isOwner =
      Boolean(viewerUserId) && targetId.toString() === viewerUserId.toString();
    const followsTarget =
      Boolean(viewerUserId) &&
      (this.data.userFollowing?.[viewerUserId] || []).some(
        (identifier) =>
          identifier === targetUsername || identifier === targetId.toString()
      );

    if (targetUser?.isPrivate && !isOwner && !followsTarget) return [];
    if (tab === "saved" && !isOwner) return [];

    if (tab === "posts") {
      return (this.data.posts || [])
        .filter((p) => {
          const authId = p.authorId?._id || p.authorId?.id;
          const authUname = (p.authorId?.username || "").toLowerCase();
          return authId === targetId || authUname === targetUsername.toLowerCase();
        })
        .map((p) => ({
          id: p._id,
          image: p.media?.[0]?.url || "",
          caption: p.content,
          likes: (p.likesCount || 0).toLocaleString(),
          likesCount: p.likesCount || 0,
          comments: (p.commentsCount || (p.comments ? p.comments.length : 0)).toLocaleString(),
          commentsCount: p.commentsCount || (p.comments ? p.comments.length : 0),
          hasCarousel: p.media && p.media.length > 1,
          type: p.media && p.media.some((m) => m.type === "video" || m.url.endsWith(".mp4")) ? "reel" : "photo",
          time: p.time || "",
          location: p.location || "",
          authorId: p.authorId,
          views: p.views,
        }));
    }

    if (tab === "reels") {
      const userPosts = this.getUserPosts(username, "posts", viewerUserId);
      return userPosts.filter((p) => p.type === "reel");
    }

    if (tab === "saved") {
      const savedIds = new Set(this.data.userBookmarks?.[targetId] || []);
      if (savedIds.size === 0) return [];
      const allExplores = [...(this.data.explorePosts || []), ...(this.data.posts || [])];
      return allExplores
        .filter((p) => savedIds.has(p._id))
        .map((e) => ({
          id: e._id,
          image: e.media?.[0]?.url || "",
          caption: e.caption || e.content,
          likes: (e.likesCount || 0).toLocaleString(),
          comments: (e.commentsCount || 0).toLocaleString(),
          type: e.isReel ? "reel" : "photo",
          location: e.location,
        }));
    }

    if (tab === "tagged") {
      return [];
    }

    return [];
  }

  // Get Highlights
  getHighlights(username = "", viewerUserId = null) {
    const handle = (username || "").toLowerCase();
    if (handle === "me" && !viewerUserId) return [];
    const targetUser = handle === "me" ? this.findUser(viewerUserId) : this.findUser(handle);
    const targetId = targetUser?._id?.toString() || targetUser?.id?.toString() || handle;
    return this.data.userHighlights?.[targetId] || [];
  }

  // Add Highlight
  addHighlight({ title, image, stories = [] }, userId) {
    const uid = userId?.toString();
    if (!uid) return null;
    if (!this.data.userHighlights) this.data.userHighlights = {};
    if (!Array.isArray(this.data.userHighlights[uid])) this.data.userHighlights[uid] = [];

    const newHl = {
      id: `hl_${require("crypto").randomUUID()}`,
      ownerId: uid,
      title: title || "Memories",
      image: image || "/profile/hl_film.png",
      storiesCount: stories.length || 1,
      stories: stories.length > 0 ? stories : [{ id: "s1", url: image || "/profile/hl_film.png", time: "Just now" }],
      createdAt: new Date().toISOString(),
    };

    this.data.userHighlights[uid].push(newHl);
    this.saveData();
    return newHl;
  }

  // Get Followers
  getFollowers() {
    return [];
  }

  // Get Following
  getFollowing(username = "", viewerUserId = null) {
    const targetUser = this.findUser(username) || (viewerUserId ? this.findUser(viewerUserId) : null);
    const uid = targetUser?._id?.toString() || targetUser?.id?.toString();
    const following = new Set(this.data.userFollowing?.[uid] || []);
    return (this.data.people || []).map((p) => ({
      id: p.id,
      name: p.name,
      username: p.username,
      avatar: p.avatar,
      isFollowing: following.has(p.username || p.id),
      subtitle: p.subtitle || "Visual creator",
    }));
  }

  // Toggle Follow by Username
  toggleFollowUser(username, userId) {
    const uid = userId?.toString();
    if (!uid) return null;
    const handle = (username || "").toLowerCase();
    if (!this.data.userFollowing) this.data.userFollowing = {};
    if (!Array.isArray(this.data.userFollowing[uid])) this.data.userFollowing[uid] = [];
    const isCurrentlyFollowing = this.data.userFollowing[uid].includes(handle);

    if (isCurrentlyFollowing) {
      this.data.userFollowing[uid] = this.data.userFollowing[uid].filter((h) => h !== handle);
    } else {
      this.data.userFollowing[uid].push(handle);
    }

    const user = this.findUser(uid);
    if (user) user.followingCount = this.data.userFollowing[uid].length;
    this.saveData();

    return {
      username,
      isFollowing: !isCurrentlyFollowing,
      followingCount: this.data.userFollowing[uid].length,
    };
  }

  // ================= EXPLORE METHODS =================

  getExploreFeed({ userId = null, category = "for-you", view = "all", q = "", sort = "trending" } = {}) {
    // 1. Gather explore posts
    let items = [...(this.data.explorePosts || [])];

    // 2. Also dynamically include published user posts that have media
    const userMediaPosts = (this.data.posts || [])
      .filter((p) => p.media && p.media.length > 0 && (!p.visibility || p.visibility === "public"))
      .map((p) => ({
        _id: p._id,
        title: p.content.slice(0, 45) || "User Visual",
        caption: p.content,
        category: p.category || (p.tags && p.tags[0] ? p.tags[0].replace("#", "") : "photography"),
        isReel: p.media.some((m) => m.type === "video" || m.url.endsWith(".mp4")),
        authorId: p.authorId,
        time: p.time || "",
        location: p.location || "San Francisco, CA",
        media: p.media,
        tags: p.tags || [],
        likesCount: p.likesCount || 0,
        isLiked: false,
        isSaved: false,
        commentsCount: p.commentsCount || 0,
        comments: p.comments || [],
        views: `${Math.max(1, (p.likesCount || 0) * 8 + 12)}K`,
        gridSpan: "col-span-1 aspect-square",
        createdAt: p.createdAt || new Date().toISOString(),
      }));

    // Merge: unique by _id
    const existingIds = new Set(items.map((i) => i._id));
    for (const ump of userMediaPosts) {
      if (!existingIds.has(ump._id)) {
        items.push(ump);
      }
    }

    // 3. Category Filter
    if (category && category !== "for-you") {
      const catLower = category.toLowerCase();
      items = items.filter((item) => {
        if (item.category && item.category.toLowerCase().includes(catLower)) return true;
        if (item.tags && item.tags.some((t) => t.toLowerCase().includes(catLower))) return true;
        if (item.pillTags && item.pillTags.some((pt) => pt.toLowerCase().includes(catLower))) return true;
        return false;
      });
    }

    // 4. View Filter: All | Photos | Reels
    if (view === "photos") {
      items = items.filter((item) => !item.isReel);
    } else if (view === "reels") {
      items = items.filter((item) => item.isReel);
    }

    // 5. Search Query Filter
    if (q && q.trim()) {
      const query = q.trim().toLowerCase();
      items = items.filter((item) => {
        return (
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.caption && item.caption.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.authorId?.name && item.authorId.name.toLowerCase().includes(query)) ||
          (item.authorId?.username && item.authorId.username.toLowerCase().includes(query)) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(query))) ||
          (item.pillTags && item.pillTags.some((pt) => pt.toLowerCase().includes(query)))
        );
      });
    }

    // 6. Sorting: trending | popular | recent
    if (sort === "popular") {
      items.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sort === "recent") {
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      // trending: score based on likes and comments
      items.sort((a, b) => {
        const scoreA = (a.likesCount || 0) * 1.5 + (a.commentsCount || 0) * 3;
        const scoreB = (b.likesCount || 0) * 1.5 + (b.commentsCount || 0) * 3;
        return scoreB - scoreA;
      });
    }

    // Per-user isolated bookmark and like status
    const targetUserId = userId?.toString();
    const bookmarkedSet = new Set(targetUserId ? (this.data.userBookmarks?.[targetUserId] || []) : []);
    const likedSet = new Set(targetUserId ? (this.data.userLikes?.[targetUserId] || []) : []);

    items = items.map((it) => ({
      ...it,
      isSaved: bookmarkedSet.has(it._id),
      isLiked: likedSet.has(it._id),
    }));

    return items;
  }

  getExplorePostById(postId, userId = null) {
    const fromExplore = (this.data.explorePosts || []).find((p) => p._id === postId);
    if (fromExplore) {
      const uid = userId?.toString();
      return {
        ...fromExplore,
        isLiked: Boolean(uid && this.data.userLikes?.[uid]?.includes(postId)),
        isSaved: Boolean(uid && this.data.userBookmarks?.[uid]?.includes(postId)),
      };
    }
    const post = this.getPostById(postId);
    if (!post || (post.visibility && post.visibility !== "public" && !this.ownsPost(post, userId))) return null;
    const uid = userId?.toString();
    return {
      ...post,
      isLiked: Boolean(uid && this.data.userLikes?.[uid]?.includes(postId)),
      isSaved: Boolean(uid && this.data.userBookmarks?.[uid]?.includes(postId)),
    };
  }

  toggleExploreLike(postId, userId = null) {
    let post = (this.data.explorePosts || []).find((p) => p._id === postId);
    if (!post) {
      post = this.getPostById(postId);
    }
    if (!post || !userId) return null;

    const uid = userId.toString();
    if (!this.data.userLikes) this.data.userLikes = {};
    if (!Array.isArray(this.data.userLikes[uid])) {
      this.data.userLikes[uid] = [];
    }

    const isCurrentlyLiked = this.data.userLikes[uid].includes(postId);
    if (isCurrentlyLiked) {
      this.data.userLikes[uid] = this.data.userLikes[uid].filter((id) => id !== postId);
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    } else {
      this.data.userLikes[uid].push(postId);
      post.likesCount = (post.likesCount || 0) + 1;
    }
    this.saveData();
    return { isLiked: !isCurrentlyLiked, likesCount: post.likesCount };
  }

  toggleExploreBookmark(postId, userId = null) {
    let post = (this.data.explorePosts || []).find((p) => p._id === postId);
    if (!post) {
      post = this.getPostById(postId);
    }
    if (!post || !userId) return null;

    const uid = userId.toString();
    if (!this.data.userBookmarks) this.data.userBookmarks = {};
    if (!Array.isArray(this.data.userBookmarks[uid])) {
      this.data.userBookmarks[uid] = [];
    }

    const isCurrentlySaved = this.data.userBookmarks[uid].includes(postId);
    if (isCurrentlySaved) {
      this.data.userBookmarks[uid] = this.data.userBookmarks[uid].filter((id) => id !== postId);
    } else {
      this.data.userBookmarks[uid].push(postId);
    }

    this.saveData();
    return { isSaved: !isCurrentlySaved };
  }

  addExploreComment(postId, { user, text }) {
    let post = (this.data.explorePosts || []).find((p) => p._id === postId);
    if (!post) {
      post = this.getPostById(postId);
    }
    if (!post || !user?._id && !user?.id) return null;

    if (!Array.isArray(post.comments)) {
      post.comments = [];
    }

    const authorObj = {
      userId: (user._id || user.id).toString(),
      name: user.name || user.fullName || user.username,
      username: user.username,
      avatar: user.avatar || "/default-avatar.svg",
    };

    const newComment = {
      _id: "comm_" + Date.now(),
      author: authorObj,
      content: text.trim(),
      createdAt: "Just now",
      replies: [],
    };

    post.comments.push(newComment);
    post.commentsCount = post.comments.length;
    this.saveData();

    return {
      comment: newComment,
      commentsCount: post.commentsCount,
      comments: post.comments,
    };
  }

  getExploreSidebar(userId) {
    const uid = userId?.toString();
    const followingSet = new Set(this.data.userFollowing?.[uid] || []);
    const joinedSet = new Set(this.data.userGroups?.[uid] || []);

    const creators = (this.data.creators || []).map((c) => ({
      ...c,
      isFollowing: followingSet.has(c.username || c.id),
    }));

    const communities = (this.data.communities || []).map((comm) => {
      return {
        ...comm,
        joined: joinedSet.has(comm.id),
      };
    });

    return {
      audioTrends: this.data.audioTrends || [],
      creators,
      communities,
    };
  }

  toggleExploreFollow(creatorId, userId) {
    const uid = userId?.toString();
    if (!uid) return null;
    const creator = (this.data.creators || []).find((c) => c.id === creatorId || c.username === creatorId);
    if (!creator) return null;

    const handle = creator.username || creator.id;
    if (!this.data.userFollowing) this.data.userFollowing = {};
    if (!Array.isArray(this.data.userFollowing[uid])) this.data.userFollowing[uid] = [];
    const isNowFollowing = !this.data.userFollowing[uid].includes(handle);
    if (isNowFollowing) {
      this.data.userFollowing[uid].push(handle);
      creator.followersCount = (creator.followersCount || 1000) + 1;
    } else {
      this.data.userFollowing[uid] = this.data.userFollowing[uid].filter((h) => h !== handle);
      creator.followersCount = Math.max(0, (creator.followersCount || 1000) - 1);
    }

    const user = this.findUser(uid);
    if (user) user.followingCount = this.data.userFollowing[uid].length;
    this.saveData();

    return {
      creatorId: creator.id,
      isFollowing: isNowFollowing,
      followersCount: creator.followersCount,
    };
  }

  toggleExploreJoinCommunity(communityId, userId) {
    const uid = userId?.toString();
    if (!uid) return null;
    let comm = (this.data.communities || []).find((c) => c.id === communityId);
    if (!comm) return null;

    if (!this.data.userGroups) this.data.userGroups = {};
    if (!Array.isArray(this.data.userGroups[uid])) this.data.userGroups[uid] = [];
    const joined = this.data.userGroups[uid].includes(communityId);
    this.data.userGroups[uid] = joined
      ? this.data.userGroups[uid].filter((id) => id !== communityId)
      : [...this.data.userGroups[uid], communityId];
    comm.memberCount = (comm.memberCount || 10000) + (joined ? -1 : 1);
    comm.members = `${(comm.memberCount / 1000).toFixed(1)}k members`;

    this.saveData();
    return {
      communityId: comm.id,
      joined: !joined,
      memberCount: comm.memberCount,
      members: comm.members,
    };
  }

  // --- NOTIFICATIONS METHODS (User-isolated) ---
  getNotifications(userId, tab = "all") {
    if (!userId) return { notifications: [], unreadCount: 0, total: 0 };
    const uid = userId.toString();

    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }

    let list = this.data.notifications.filter((n) => n.recipientId === uid);

    if (tab && tab !== "all") {
      if (tab === "friends" || tab === "followers") {
        list = list.filter((n) => n.type === "follow" || n.type === "friends");
      } else {
        list = list.filter((n) => n.type === tab);
      }
    }

    const followingSet = new Set(this.data.userFollowing?.[uid] || []);
    list = list.map((n) =>
      n.type === "follow"
        ? {
            ...n,
            isFollowingBack: Boolean(
              followingSet.has(n.user) || (n.senderId && followingSet.has(n.senderId))
            ),
          }
        : n
    );

    const unreadCount = this.data.notifications.filter((n) => n.recipientId === uid && !n.isRead).length;

    return {
      notifications: list,
      unreadCount,
      total: list.length,
    };
  }

  getNotificationUnreadCount(userId) {
    if (!userId) return 0;
    const uid = userId.toString();
    const list = (this.data.notifications || []).filter((n) => n.recipientId === uid);
    return list.filter((n) => !n.isRead).length;
  }

  markAllNotificationsRead(userId) {
    if (!userId) return { success: true, unreadCount: 0 };
    const uid = userId.toString();
    if (Array.isArray(this.data.notifications)) {
      this.data.notifications.forEach((n) => {
        if (n.recipientId === uid) {
          n.isRead = true;
        }
      });
      this.saveData();
    }
    return { success: true, unreadCount: 0 };
  }

  markNotificationRead(id, userId) {
    if (!userId) return { success: false, item: null, unreadCount: 0 };
    const uid = userId.toString();
    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }
    const item = this.data.notifications.find((n) => n.id === id && n.recipientId === uid);
    if (item) {
      item.isRead = true;
      this.saveData();
    }
    const unreadCount = this.getNotificationUnreadCount(uid);
    return { success: true, item, unreadCount };
  }

  deleteNotification(id, userId) {
    if (!userId) return { success: true, deleted: false, unreadCount: 0 };
    const uid = userId.toString();
    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }
    const prevLen = this.data.notifications.length;
    this.data.notifications = this.data.notifications.filter(
      (n) => !(n.id === id && n.recipientId === uid)
    );
    this.saveData();
    const unreadCount = this.getNotificationUnreadCount(uid);
    return { success: true, deleted: this.data.notifications.length < prevLen, unreadCount };
  }

  replyToNotificationComment(id, text, userId) {
    if (!userId) return null;
    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }
    const item = this.data.notifications.find((n) => n.id === id && n.recipientId === userId.toString());
    if (!item) return null;

    if (!Array.isArray(item.replies)) {
      item.replies = [];
    }

    const reply = {
      id: `rep_${Date.now()}`,
      author: this.findUser(userId),
      text,
      createdAt: new Date().toISOString(),
    };

    item.replies.push(reply);
    this.saveData();
    return reply;
  }

  toggleLikeNotificationComment(id, userId) {
    if (!userId) return null;
    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }
    const item = this.data.notifications.find((n) => n.id === id && n.recipientId === userId.toString());
    if (!item) return null;

    item.isLiked = !item.isLiked;
    this.saveData();
    return { isLiked: item.isLiked };
  }

  respondNotificationFriendRequest(id, action, userId) {
    if (!userId) return null;
    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }
    const item = this.data.notifications.find(
      (n) => n.id === id && n.recipientId === userId.toString()
    );
    if (!item) return null;

    const isConfirmed =
      action === "accept" || action === "confirm" || action === "confirmed";
    item.friendStatus = isConfirmed ? "confirmed" : "deleted";
    item.isRead = true;

    // Also sync sidebar
    const senderId = item.senderId;
    const uid = userId.toString();
    const sidebar = this.getNotificationSidebar(uid);
    let req = (sidebar.friendRequests || []).find(
      (r) => r.id === `req_${senderId}` || r.fromUserId === senderId
    );
    if (req) {
      req.status = item.friendStatus;
    }

    if (senderId) {
      const senderSidebar = this.getNotificationSidebar(senderId);
      const senderSuggested = (senderSidebar.suggestedFriends || []).find(
        (s) => s.id === uid
      );
      if (senderSuggested) {
        senderSuggested.status = isConfirmed ? "friends" : "idle";
      }

      if (isConfirmed) {
        this.toggleFollow(senderId, uid);
        this.toggleFollow(uid, senderId);
      }
    }

    this.saveData();
    return { friendStatus: item.friendStatus };
  }

  getNotificationSidebar(userId) {
    const uid = userId ? userId.toString() : (this.data.currentUser?._id || "default_user");
    if (!this.data.userNotificationSidebars) this.data.userNotificationSidebars = {};
    if (!this.data.userNotificationSidebars[uid] || !this.data.userNotificationSidebars[uid].suggestedFriends?.length) {
      const otherUsers = (this.data.users || [])
        .filter((u) => (u._id || u.id)?.toString() !== uid)
        .slice(0, 10)
        .map((u) => ({
          id: (u._id || u.id).toString(),
          name: u.fullName || u.name || u.username,
          subtitle: `@${u.username}`,
          avatar: u.avatar || "/default-avatar.svg",
          status: "idle",
        }));

      const defaultCuratedSuggestions = [

      ];

      const merged = [
        ...otherUsers,
        ...defaultCuratedSuggestions.filter((d) => !otherUsers.some((o) => o.id === d.id)),
      ];

      this.data.userNotificationSidebars[uid] = {
        friendRequests: this.data.userNotificationSidebars[uid]?.friendRequests?.length
          ? this.data.userNotificationSidebars[uid].friendRequests
          : [
            ],
        birthdays: this.data.userNotificationSidebars[uid]?.birthdays?.length
          ? this.data.userNotificationSidebars[uid].birthdays
          : [

            ],
        suggestedFriends: merged,
      };
      this.saveData();
    }
    return this.data.userNotificationSidebars[uid];
  }

  // Cross-Account Friend Request Delivery
  sendFriendRequest(fromUserId, toUserId) {
    if (!fromUserId || !toUserId || fromUserId.toString() === toUserId.toString()) {
      return null;
    }
    const fromId = fromUserId.toString();
    const toId = toUserId.toString();

    const sender = this.findUser(fromId) || {
      id: fromId,
      _id: fromId,
      name: fromId,
      username: fromId,
      avatar: "/default-avatar.svg",
    };
    const recipient = this.findUser(toId) || {
      id: toId,
      _id: toId,
      name: toId,
      username: toId,
      avatar: "/default-avatar.svg",
    };

    const senderSidebar = this.getNotificationSidebar(fromId);
    const recipientSidebar = this.getNotificationSidebar(toId);

    let senderSuggested = (senderSidebar.suggestedFriends || []).find((s) => s.id === toId);
    if (!senderSuggested) {
      senderSuggested = {
        id: toId,
        name: recipient.name || recipient.fullName || recipient.username,
        subtitle: `@${recipient.username}`,
        avatar: recipient.avatar || "/default-avatar.svg",
        status: "idle",
      };
      senderSidebar.suggestedFriends.push(senderSuggested);
    }

    const isCurrentlyAdded = senderSuggested.status === "added";

    if (!Array.isArray(recipientSidebar.friendRequests)) {
      recipientSidebar.friendRequests = [];
    }
    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }

    if (!isCurrentlyAdded) {
      senderSuggested.status = "added";

      // 1. Deliver to recipient's Friend Requests widget
      const reqId = `req_${fromId}`;
      const existingReqIndex = recipientSidebar.friendRequests.findIndex(
        (r) => r.id === reqId || r.fromUserId === fromId
      );
      const newReq = {
        id: reqId,
        fromUserId: fromId,
        name: sender.name || sender.fullName || sender.username,
        username: sender.username,
        subtitle: `@${sender.username}`,
        mutualFriends: "1 mutual connection",
        avatar: sender.avatar || "/default-avatar.svg",
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      if (existingReqIndex >= 0) {
        recipientSidebar.friendRequests[existingReqIndex] = newReq;
      } else {
        recipientSidebar.friendRequests.unshift(newReq);
      }

      // 2. Deliver real notification to recipient's notification feed
      this.data.notifications.unshift({
        id: `notif_friend_${fromId}_${Date.now()}`,
        recipientId: toId,
        senderId: fromId,
        section: "today",
        type: "friends",
        unread: true,
        isRead: false,
        user: sender.username,
        avatar: sender.avatar || "/default-avatar.svg",
        badgeType: "friend",
        titlePrefix: sender.username,
        titleSuffix: " sent you a friend request.",
        subtext: "Just now",
        time: "Just now",
        isFriendRequest: true,
        friendStatus: "pending",
        createdAt: new Date().toISOString(),
      });
    } else {
      // Cancel request
      senderSuggested.status = "idle";
      recipientSidebar.friendRequests = recipientSidebar.friendRequests.filter(
        (r) => r.id !== `req_${fromId}` && r.fromUserId !== fromId
      );
      this.data.notifications = this.data.notifications.filter(
        (n) => !(n.recipientId === toId && n.senderId === fromId && n.type === "friends")
      );
    }

    this.saveData();
    return { id: toId, status: senderSuggested.status };
  }

  respondSidebarFriendRequest(id, action, userId) {
    const uid = (userId || "").toString();
    const sidebar = this.getNotificationSidebar(uid);
    let req = (sidebar.friendRequests || []).find((r) => r.id === id || r.fromUserId === id);
    if (!req) {
      req = { id, status: "pending" };
      sidebar.friendRequests.push(req);
    }

    const isConfirmed =
      action === "accept" || action === "confirm" || action === "confirmed";
    req.status = isConfirmed ? "confirmed" : "deleted";

    // Sync notification item
    if (Array.isArray(this.data.notifications)) {
      this.data.notifications.forEach((n) => {
        if (
          n.recipientId === uid &&
          (n.senderId === req.fromUserId || n.id === id || n.user === req.username)
        ) {
          n.friendStatus = req.status;
          n.isRead = true;
        }
      });
    }

    const senderId = req.fromUserId;
    if (senderId) {
      const senderSidebar = this.getNotificationSidebar(senderId);
      const senderSuggested = (senderSidebar.suggestedFriends || []).find((s) => s.id === uid);
      if (senderSuggested) {
        senderSuggested.status = isConfirmed ? "friends" : "idle";
      }

      if (isConfirmed) {
        // Mutual follow & friendship
        this.toggleFollow(senderId, uid);
        this.toggleFollow(uid, senderId);

        const accepter = this.findUser(uid);
        this.data.notifications.unshift({
          id: `notif_accept_${uid}_${Date.now()}`,
          recipientId: senderId,
          senderId: uid,
          section: "today",
          type: "friends",
          unread: true,
          isRead: false,
          user: accepter?.username || "user",
          avatar: accepter?.avatar || "/default-avatar.svg",
          badgeType: "friend",
          titlePrefix: accepter?.username || "user",
          titleSuffix: " accepted your friend request.",
          subtext: "Just now",
          time: "Just now",
          isFriendRequest: false,
          friendStatus: "confirmed",
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.saveData();
    return { id, status: req.status };
  }

  toggleWishBirthday(id, userId) {
    const sidebar = this.getNotificationSidebar(userId);
    let bday = (sidebar.birthdays || []).find((b) => b.id === id);
    if (!bday) {
      bday = { id, isWished: false };
      sidebar.birthdays.push(bday);
    }

    bday.isWished = !bday.isWished;
    this.saveData();
    return { id, isWished: bday.isWished };
  }

  toggleSuggestedFriend(id, userId) {
    return this.sendFriendRequest(userId, id);
  }

  // SEARCH USERS & PEOPLE ACROSS THE PLATFORM
  searchUsers(query = "", viewerUserId = null) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];

    const viewerIdStr = viewerUserId ? viewerUserId.toString() : null;
    const followingSet = new Set(this.data.userFollowing?.[viewerIdStr] || []);
    const viewerSidebar = viewerUserId ? this.getNotificationSidebar(viewerUserId) : null;

    const allPeople = [];
    const seen = new Set();

    // 1. Search this.data.users (Real registered accounts)
    (this.data.users || []).forEach((u) => {
      const uid = (u._id || u.id || "").toString();
      if (viewerIdStr && uid === viewerIdStr) return;
      if (seen.has(uid)) return;

      const name = (u.name || u.fullName || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const bio = (u.bio || "").toLowerCase();

      if (
        username.includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        bio.includes(q)
      ) {
        seen.add(uid);
        const suggestedItem = (viewerSidebar?.suggestedFriends || []).find((s) => s.id === uid);
        let friendStatus = suggestedItem?.status || "idle";
        if (followingSet.has(u.username) || followingSet.has(uid)) {
          friendStatus = "friends";
        }

        allPeople.push({
          id: uid,
          _id: uid,
          name: u.fullName || u.name || u.username,
          username: u.username,
          avatar: u.avatar || "/default-avatar.svg",
          bio: u.bio || "",
          subtitle: `@${u.username}`,
          isFollowing: followingSet.has(u.username) || followingSet.has(uid),
          friendStatus,
        });
      }
    });

    // 2. Also search this.data.people
    (this.data.people || []).forEach((p) => {
      const pid = (p.id || p._id || p.username || "").toString();
      if (seen.has(pid)) return;

      const name = (p.name || "").toLowerCase();
      const username = (p.username || "").toLowerCase();
      if (name.includes(q) || username.includes(q)) {
        seen.add(pid);
        const suggestedItem = (viewerSidebar?.suggestedFriends || []).find((s) => s.id === pid);
        allPeople.push({
          id: pid,
          _id: pid,
          name: p.name,
          username: p.username,
          avatar: p.avatar || "/default-avatar.svg",
          bio: p.bio || p.subtitle || "",
          subtitle: `@${p.username}`,
          isFollowing: followingSet.has(p.username) || followingSet.has(pid),
          friendStatus: suggestedItem?.status || "idle",
        });
      }
    });

    return allPeople;
  }

  // --- MESSAGES & CONVERSATIONS METHODS (User-isolated) ---
  getNotes(userId) {
    const uid = userId?.toString();
    if (!uid) return [];
    const user = this.findUser(uid);
    const userAvatar = user?.avatar || "/default-avatar.svg";

    const NOTE_TTL_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const isFresh = (noteObj) =>
      noteObj &&
      noteObj.note &&
      noteObj.note.trim().length > 0 &&
      (!noteObj.updatedAt || now - new Date(noteObj.updatedAt).getTime() < NOTE_TTL_MS);

    const myNoteData = this.data.userNotes?.[uid];
    const myNote = {
      id: uid,
      userId: uid,
      name: "Your note",
      username: user?.username || "",
      avatar: userAvatar,
      note: isFresh(myNoteData) ? myNoteData.note : "",
      isSelf: true,
      updatedAt: myNoteData?.updatedAt || null,
    };

    // Collect IDs of users the current user follows, followers, or conversation partners
    const visibleUserIds = new Set();
    const followingList = this.data.userFollowing?.[uid] || [];
    followingList.forEach((entry) => {
      const u = this.findUser(entry);
      if (u) visibleUserIds.add((u._id || u.id).toString());
    });
    Object.keys(this.data.userFollowing || {}).forEach((otherUid) => {
      const list = this.data.userFollowing[otherUid] || [];
      if (
        list.includes(uid) ||
        (user?.username && list.includes(user.username))
      ) {
        visibleUserIds.add(otherUid);
      }
    });
    (this.data.conversations || []).forEach((conv) => {
      if (this.ownsConversation(conv, uid)) {
        (conv.participants || []).forEach((p) => {
          if (p !== uid) visibleUserIds.add(p.toString());
        });
      }
    });

    const otherNotes = [];
    Object.entries(this.data.userNotes || {}).forEach(([authorId, noteData]) => {
      if (authorId === uid) return;
      if (!visibleUserIds.has(authorId)) return;
      if (!isFresh(noteData)) return;
      const author = this.findUser(authorId);
      if (!author) return;
      otherNotes.push({
        id: authorId,
        userId: authorId,
        name: author.fullName || author.name || author.username,
        username: author.username,
        avatar: author.avatar || "/default-avatar.svg",
        note: noteData.note,
        isSelf: false,
        active: true,
        updatedAt: noteData.updatedAt,
      });
    });

    otherNotes.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return [myNote, ...otherNotes];
  }

  updateUserNote(userIdOrText, noteText = null) {
    if (noteText === null || !userIdOrText) return [];
    const uid = userIdOrText.toString();
    const text = noteText;

    if (!this.data.userNotes) this.data.userNotes = {};
    this.data.userNotes[uid] = {
      note: (text || "").trim(),
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.getNotes(uid);
  }

  deleteUserNote(userId = null) {
    const uid = userId?.toString();
    if (!uid) return [];
    if (!this.data.userNotes) this.data.userNotes = {};
    delete this.data.userNotes[uid];
    this.saveData();
    return this.getNotes(uid);
  }

  resolveConversationForUser(conversation, uid) {
    let name = conversation.name;
    let username = conversation.username;
    let avatar = conversation.avatar;

    if (!conversation.isGroup && Array.isArray(conversation.participants)) {
      const otherId = conversation.participants.find((p) => p.toString() !== uid);
      if (otherId) {
        const otherUser = this.findUser(otherId);
        if (otherUser) {
          name = otherUser.fullName || otherUser.name || otherUser.username;
          username = otherUser.username;
          avatar = otherUser.avatar || "/default-avatar.svg";
        }
      }
    }

    return {
      ...conversation,
      name,
      username,
      avatar,
      unread: conversation.unreadByUser?.[uid] ?? conversation.unread ?? 0,
      isMuted: conversation.mutedFor?.includes(uid) || false,
      isBlocked: conversation.blockedFor?.includes(uid) || false,
    };
  }

  getConversations(userId, searchQuery = "", tab = "all") {
    if (!userId) return [];
    const uid = userId.toString();
    const query = searchQuery;
    const selectedTab = tab;
    let list = (this.data.conversations || [])
      .filter((conversation) => this.ownsConversation(conversation, uid))
      .map((conversation) => this.resolveConversationForUser(conversation, uid));

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.username?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q)
      );
    }

    if (selectedTab === "unread") {
      list = list.filter((c) => c.unread > 0);
    }

    return list;
  }

  ownsConversation(conversation, userId) {
    return (
      Boolean(userId) &&
      Array.isArray(conversation?.participants) &&
      conversation.participants.includes(userId) &&
      !conversation.deletedFor?.includes(userId)
    );
  }

  getConversationById(id, userId) {
    if (!userId) return null;
    const uid = userId.toString();
    const conversation = (this.data.conversations || []).find(
      (item) => item.id === id && this.ownsConversation(item, uid)
    );
    if (!conversation) return null;
    return this.resolveConversationForUser(conversation, uid);
  }

  sendMessage(chatId, { text, type = "text", mediaUrl = null, replyTo = null, forwarded = false, senderId = null }) {
    if (!Array.isArray(this.data.conversations)) {
      this.data.conversations = [];
    }

    const currentUid = senderId?.toString();
    let conv = (this.data.conversations || []).find(
      (conversation) => conversation.id === chatId && this.ownsConversation(conversation, currentUid)
    );
    if (!conv || !currentUid) return null;
    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: "me",
      senderId: currentUid,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type,
      text: text || "",
      mediaUrl: mediaUrl || undefined,
      replyTo: replyTo || undefined,
      forwarded: !!forwarded,
      reactions: [],
      read: true,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(conv.messages)) {
      conv.messages = [];
    }

    conv.messages.push(newMsg);
    conv.lastMessage = text || (type === "image" ? "Sent an attachment" : "");
    conv.time = "Just now";

    this.saveData();
    return { conversation: conv, message: newMsg };
  }

  reactToMessage(chatId, messageId, emoji, userId) {
    const uid = userId?.toString();
    const conv = (this.data.conversations || []).find(
      (conversation) => conversation.id === chatId && this.ownsConversation(conversation, uid)
    );
    if (!conv || !Array.isArray(conv.messages)) return null;

    const msg = conv.messages.find((m) => m.id === messageId);
    if (!msg) return null;

    if (!Array.isArray(msg.reactions)) {
      msg.reactions = [];
    }

    const existingIdx = msg.reactions.findIndex((r) => r.userId === uid && r.emoji === emoji);
    if (existingIdx !== -1) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions = msg.reactions.filter((r) => r.userId !== uid);
      msg.reactions.push({ emoji, userId: uid, user: this.findUser(uid)?.username || uid, time: "Just now" });
    }

    this.saveData();
    return { chatId, messageId, reactions: msg.reactions };
  }

  forwardMessage(sourceChatId, messageId, targetChatIds = [], userId) {
    const uid = userId?.toString();
    const sourceConv = (this.data.conversations || []).find(
      (conversation) => conversation.id === sourceChatId && this.ownsConversation(conversation, uid)
    );
    if (!sourceConv || !Array.isArray(sourceConv.messages)) return null;

    const originalMsg = sourceConv.messages.find((m) => m.id === messageId);
    if (!originalMsg) return null;

    const forwardedResults = [];

    targetChatIds.forEach((targetId) => {
      let targetConv = (this.data.conversations || []).find(
        (conversation) => conversation.id === targetId && this.ownsConversation(conversation, uid)
      );
      if (targetConv && uid) {
        const copyMsg = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sender: "me",
          senderId: uid,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: originalMsg.type || "text",
          text: originalMsg.text || "",
          mediaUrl: originalMsg.mediaUrl || undefined,
          forwarded: true,
          reactions: [],
          read: true,
          isLiked: false,
          createdAt: new Date().toISOString(),
        };

        if (!Array.isArray(targetConv.messages)) {
          targetConv.messages = [];
        }

        targetConv.messages.push(copyMsg);
        targetConv.lastMessage = copyMsg.text || "Forwarded message";
        targetConv.time = "Just now";

        forwardedResults.push({ chatId: targetId, message: copyMsg, conversation: targetConv });
      }
    });

    this.saveData();
    return forwardedResults;
  }

  unsendMessage(chatId, messageId, userId) {
    const uid = userId?.toString();
    const conv = (this.data.conversations || []).find(
      (conversation) => conversation.id === chatId && this.ownsConversation(conversation, uid)
    );
    if (!conv || !Array.isArray(conv.messages)) return null;

    const initialLen = conv.messages.length;
    const message = conv.messages.find((item) => item.id === messageId);
    if (message?.senderId !== uid) return null;
    conv.messages = conv.messages.filter((m) => m.id !== messageId);

    if (conv.messages.length < initialLen) {
      const last = conv.messages[conv.messages.length - 1];
      conv.lastMessage = last ? last.text || "Sent an attachment" : "No messages yet";
      this.saveData();
      return { success: true, chatId, messageId, lastMessage: conv.lastMessage };
    }

    return null;
  }

  toggleLikeMessage(chatId, messageId, userId) {
    const uid = userId?.toString();
    const conv = (this.data.conversations || []).find(
      (conversation) => conversation.id === chatId && this.ownsConversation(conversation, uid)
    );
    if (!conv || !Array.isArray(conv.messages)) return null;

    const msg = conv.messages.find((m) => m.id === messageId);
    if (!msg) return null;

    if (!Array.isArray(msg.likedBy)) msg.likedBy = [];
    msg.likedBy = msg.likedBy.includes(uid)
      ? msg.likedBy.filter((id) => id !== uid)
      : [...msg.likedBy, uid];
    this.saveData();
    return { chatId, messageId, isLiked: msg.likedBy.includes(uid) };
  }

  deleteConversation(chatId, userId) {
    const uid = userId?.toString();
    const conversation = (this.data.conversations || []).find(
      (item) => item.id === chatId && this.ownsConversation(item, uid)
    );
    if (!conversation) return { success: false };
    if (!Array.isArray(conversation.deletedFor)) conversation.deletedFor = [];
    conversation.deletedFor.push(uid);
    this.saveData();
    return { success: true };
  }

  toggleMuteConversation(chatId, userId) {
    const uid = userId?.toString();
    const conv = (this.data.conversations || []).find(
      (item) => item.id === chatId && this.ownsConversation(item, uid)
    );
    if (!conv || !uid) return null;
    if (!Array.isArray(conv.mutedFor)) conv.mutedFor = [];
    conv.mutedFor = conv.mutedFor.includes(uid)
      ? conv.mutedFor.filter((id) => id !== uid)
      : [...conv.mutedFor, uid];
    this.saveData();
    return { id: chatId, isMuted: conv.mutedFor.includes(uid) };
  }

  toggleBlockConversation(chatId, userId) {
    const uid = userId?.toString();
    const conv = (this.data.conversations || []).find(
      (item) => item.id === chatId && this.ownsConversation(item, uid)
    );
    if (!conv || !uid) return null;
    if (!Array.isArray(conv.blockedFor)) conv.blockedFor = [];
    conv.blockedFor = conv.blockedFor.includes(uid)
      ? conv.blockedFor.filter((id) => id !== uid)
      : [...conv.blockedFor, uid];
    this.saveData();
    return { id: chatId, isBlocked: conv.blockedFor.includes(uid) };
  }

  createConversation({ userId, name, username, avatar, currentUserId = null }) {
    if (!Array.isArray(this.data.conversations)) {
      this.data.conversations = [];
    }

    const initiatorId = currentUserId?.toString();
    const recipientId = userId?.toString();
    if (!initiatorId || !recipientId || initiatorId === recipientId) return null;
    const participants = [initiatorId, recipientId];

    let existing = this.data.conversations.find(
      (c) =>
        Array.isArray(c.participants) &&
        c.participants.includes(initiatorId) &&
        c.participants.includes(recipientId) &&
        !c.deletedFor?.includes(initiatorId)
    );
    if (existing) return existing;

    const newConv = {
      id: `chat_${require("crypto").randomUUID()}`,
      participants,
      name: name || "",
      username: username || "",
      verified: false,
      avatar: avatar || "/default-avatar.svg",
      status: "",
      online: false,
      lastMessage: "",
      time: "",
      unread: 0,
      type: "direct",
      isMuted: false,
      isBlocked: false,
      postsCount: 0,
      followers: "0",
      following: 0,
      bio: "",
      messages: [],
    };

    this.data.conversations.unshift(newConv);
    this.saveData();
    return newConv;
  }

  createDefaultUserSettings(user) {
    const cleanUsername = (user?.username || "").toLowerCase().trim();
    const cleanEmail = (user?.email || "").toLowerCase().trim();
    const displayName = user?.name || user?.fullName || cleanUsername;
    const defaultAvatar = user?.avatar || "/default-avatar.svg";

    return {
      account: {
        email: cleanEmail,
        phone: "",
        birthDate: "",
        twoFactorAuth: false,
        registeredKey: "None configured",
        sessions: [
          {
            id: `sess_${Date.now()}`,
            device: "Browser Session",
            location: "Local",
            time: "Active this session",
            isCurrent: true,
            type: "laptop",
          },
        ],
      },
      profile: {
        displayName,
        username: cleanUsername,
        pronouns: user?.pronouns || "",
        bio: user?.bio || "",
        website: user?.website || "",
        location: user?.location || "",
        roleTag: user?.roleTag || "",
        showVerifiedBadge: !!user?.isVerified,
        showFollowerCount: true,
        showStudioSound: true,
        avatar: defaultAvatar,
        cover: user?.cover || "",
      },
      privacy: {
        privateAccount: false,
        storyReplies: "everyone",
        activeStatus: true,
        readReceipts: true,
        blockedUsers: [],
        restrictedUsers: [],
      },
      notifications: {
        pushNotifications: true,
        emailNotifications: true,
        mentions: true,
        peerSignals: true,
        directMessages: true,
        storyReplies: true,
        pauseAll: false,
      },
      appearance: {
        theme: "editorial",
        fontSize: "standard",
        highContrastBorders: false,
        reduceAnimations: false,
      },
      content: {
        feedQuality: "lossless",
        losslessAudio: true,
        autoplayMedia: true,
        sensitiveContentFilter: false,
        mutedWords: [],
      },
      closeFriends: [],
      supportTickets: [],
    };
  }

  // --- USER SETTINGS METHODS (Per-User Isolated) ---
  getUserSettings(userId) {
    const uid = requireUserId(userId);
    if (!this.data.userSettings) this.data.userSettings = {};

    if (!this.data.userSettings[uid]) {
      const user = this.findUser(uid);
      this.data.userSettings[uid] = this.createDefaultUserSettings(user || { _id: uid });
      this.saveData();
    }

    return this.data.userSettings[uid];
  }

  getSettings(userId) {
    return this.getUserSettings(userId);
  }

  updateUserSettings(userId, updates = {}) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);

    for (const key of Object.keys(updates || {})) {
      if (typeof updates[key] === "object" && updates[key] !== null && !Array.isArray(updates[key])) {
        currentSettings[key] = {
          ...(currentSettings[key] || {}),
          ...updates[key],
        };
      } else {
        currentSettings[key] = updates[key];
      }
    }

    if (updates.profile) {
      this.updateProfileSettings(uid, updates.profile);
    }

    this.saveData();
    return currentSettings;
  }

  updateSettings(userId, updates) {
    return this.updateUserSettings(userId, updates);
  }

  updateProfileSettings(userId, profile = {}) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    currentSettings.profile = {
      ...(currentSettings.profile || {}),
      ...profile,
    };

    const user = this.findUser(uid);
    if (user) {
      if (profile.displayName) user.name = profile.displayName;
      if (profile.username) user.username = profile.username;
      if (profile.bio !== undefined) user.bio = profile.bio;
      if (profile.location !== undefined) user.location = profile.location;
      if (profile.website !== undefined) user.website = profile.website;
      if (profile.avatar) user.avatar = profile.avatar;
      if (profile.cover) user.cover = profile.cover;
      if (profile.pronouns !== undefined) user.pronouns = profile.pronouns;
      if (profile.roleTag !== undefined) user.roleTag = profile.roleTag;
    }

    this.saveData();
    return { settings: currentSettings, profile: currentSettings.profile, user };
  }

  revokeSession(userId, sessionId) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!currentSettings.account?.sessions) currentSettings.account.sessions = [];
    currentSettings.account.sessions = currentSettings.account.sessions.filter((s) => s.id !== sessionId);
    this.saveData();
    return currentSettings.account.sessions;
  }

  toggleCloseFriend(userId, friendId) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!Array.isArray(currentSettings.closeFriends)) currentSettings.closeFriends = [];
    const friend = currentSettings.closeFriends.find((f) => f.id === friendId);
    if (friend) {
      friend.active = !friend.active;
      this.saveData();
      return friend;
    }
    return null;
  }

  addMutedWord(userId, word) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!currentSettings.content) currentSettings.content = {};
    if (!Array.isArray(currentSettings.content.mutedWords)) currentSettings.content.mutedWords = [];
    const clean = (word || "").toLowerCase().trim().replace(/^#/, "");
    if (clean && !currentSettings.content.mutedWords.includes(clean)) {
      currentSettings.content.mutedWords.push(clean);
      this.saveData();
    }
    return currentSettings.content.mutedWords;
  }

  removeMutedWord(userId, word) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!currentSettings.content) currentSettings.content = {};
    if (!Array.isArray(currentSettings.content.mutedWords)) currentSettings.content.mutedWords = [];
    const clean = (word || "").toLowerCase().trim().replace(/^#/, "");
    currentSettings.content.mutedWords = currentSettings.content.mutedWords.filter((x) => x !== clean);
    this.saveData();
    return currentSettings.content.mutedWords;
  }

  unblockUser(userId, targetUserId) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!currentSettings.privacy) currentSettings.privacy = {};
    if (!Array.isArray(currentSettings.privacy.blockedUsers)) currentSettings.privacy.blockedUsers = [];
    currentSettings.privacy.blockedUsers = currentSettings.privacy.blockedUsers.filter(
      (u) => u.id !== targetUserId && u.username !== targetUserId
    );
    this.saveData();
    return currentSettings.privacy.blockedUsers;
  }

  submitSupportTicket(userId, data = {}) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!Array.isArray(currentSettings.supportTickets)) currentSettings.supportTickets = [];

    const user = this.findUser(uid);
    const ticket = {
      id: `ticket_${Date.now()}`,
      subject: data.subject || "Support Inquiry",
      category: data.category || "general",
      message: data.message || "",
      email: data.email || user?.email || "",
      status: "received",
      createdAt: new Date().toISOString(),
    };

    currentSettings.supportTickets.unshift(ticket);
    this.saveData();
    return ticket;
  }

  updateAvatar(userId, avatar) {
    const uid = requireUserId(userId);
    const user = this.findUser(uid);
    const finalAvatar =
      !avatar || avatar === "reset"
        ? "/default-avatar.svg"
        : avatar;

    if (user) {
      user.avatar = finalAvatar;
    }
    const currentSettings = this.getUserSettings(uid);
    if (currentSettings.profile) {
      currentSettings.profile.avatar = finalAvatar;
    }

    this.saveData();
    return { avatar: finalAvatar, user };
  }

  revokeAllOtherSessions(userId) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!currentSettings.account?.sessions) currentSettings.account.sessions = [];
    currentSettings.account.sessions = currentSettings.account.sessions.filter((s) => s.isCurrent);
    this.saveData();
    return currentSettings.account.sessions;
  }

  addBlockedUser(userId, data = {}) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!currentSettings.privacy) currentSettings.privacy = {};
    if (!Array.isArray(currentSettings.privacy.blockedUsers)) currentSettings.privacy.blockedUsers = [];

    const cleanHandle = (data.username || "").replace(/^@/, "").trim();
    const exists = currentSettings.privacy.blockedUsers.some(
      (u) => u.username.toLowerCase() === cleanHandle.toLowerCase()
    );

    if (!exists && cleanHandle) {
      const newUser = {
        id: `block_${Date.now()}`,
        name: data.name || cleanHandle,
        username: cleanHandle,
        avatar: data.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(cleanHandle)}&backgroundColor=1b1c19&textColor=ffffff`,
        blockedAt: "Just now",
      };
      currentSettings.privacy.blockedUsers.unshift(newUser);
      this.saveData();
    }
    return currentSettings.privacy.blockedUsers;
  }

  addCloseFriend(userId, data = {}) {
    const uid = requireUserId(userId);
    const currentSettings = this.getUserSettings(uid);
    if (!Array.isArray(currentSettings.closeFriends)) currentSettings.closeFriends = [];

    const cleanHandle = (data.handle || data.username || "").replace(/^@/, "").trim();
    const newFriend = {
      id: `friend_${Date.now()}`,
      name: data.name || cleanHandle,
      handle: cleanHandle,
      role: data.role || "Creator",
      avatar: data.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(cleanHandle)}&backgroundColor=1b1c19&textColor=ffffff`,
      active: true,
    };
    currentSettings.closeFriends.push(newFriend);
    this.saveData();
    return newFriend;
  }

  initializeUser(user) {
    const userId = user?._id?.toString() || user?.id?.toString();
    if (!userId || !user.username || !user.email) {
      throw new Error("A persisted user ID, username, and email are required");
    }

    if (!Array.isArray(this.data.users)) this.data.users = [];
    let profile = this.data.users.find(
      (item) => (item._id || item.id)?.toString() === userId
    );
    let changed = false;
    if (!profile) {
      profile = { _id: userId, id: userId };
      this.data.users.push(profile);
      changed = true;
    }

    if (
      profile.username !== user.username ||
      profile.email !== user.email ||
      profile.name !== (user.fullName || user.name)
    ) {
      Object.assign(profile, {
        _id: userId,
        id: userId,
        username: user.username,
        email: user.email,
        name: user.fullName || user.name || user.username,
        fullName: user.fullName || user.name || "",
        avatar: user.avatar || "/default-avatar.svg",
        fallbackAvatar: user.avatar || "/default-avatar.svg",
        emailVerified: user.emailVerified === true,
        isPrivate: user.isPrivate === true,
        bio: user.bio || "",
        website: user.website || "",
        location: user.location || "",
        pronouns: user.pronouns || "",
        cover: user.cover || "",
        followingCount: user.followingCount || 0,
        followersCount: user.followersCount || 0,
        postsCount: user.postsCount || 0,
      });
      changed = true;
    }

    const initializeMap = (mapName, value) => {
      if (!this.data[mapName]) this.data[mapName] = {};
      if (!Object.prototype.hasOwnProperty.call(this.data[mapName], userId)) {
        this.data[mapName][userId] = value;
        changed = true;
      }
    };

    initializeMap("userBookmarks", []);
    initializeMap("userLikes", []);
    initializeMap("userFollowing", []);
    initializeMap("userHighlights", []);
    initializeMap("userNotes", null);
    initializeMap("userSettings", this.createDefaultUserSettings(profile));
    if (changed) {
      this.saveData();
    }
    return profile;
  }

  findUser(identifier) {
    if (!identifier) return null;
    const clean = identifier.toString().toLowerCase().trim();
    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }
    const found = this.data.users.find(
      (u) =>
        (u._id && u._id.toString().toLowerCase() === clean) ||
        (u.id && u.id.toString().toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean) ||
        (u.username && u.username.toLowerCase() === clean)
    );
    if (found) return found;

    return null;
  }
}

const store = new PersistentStore();
module.exports = store;
