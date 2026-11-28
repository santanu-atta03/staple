const mongoose = require("mongoose");
const store = require("../../config/store");
const { getIO } = require("../../config/socket");
const User = require("./user.model");
const Post = require("../posts/post.model");
const Follow = require("../follows/follow.model");
const followService = require("../follows/follow.service");
const postService = require("../posts/post.service");
const Bookmark = require("../bookmarks/bookmark.model");

const getProfile = async (req, res, next) => {
  try {
    const handle = String(req.params.username || "").toLowerCase().trim();
    const viewerUserId = req.user?._id || req.user?.id;
    const identity = handle === "me"
      ? { _id: viewerUserId }
      : mongoose.isValidObjectId(handle)
        ? { _id: handle }
        : { username: handle };
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({
          ...identity,
          isActive: true,
          emailVerified: true,
        }).select("_id username fullName avatar bio website location pronouns cover isPrivate followersCount followingCount emailVerified createdAt");
      } catch (dbErr) {
        user = null;
      }
    }

    if (!user) {
      const storeProfile = store.getUserProfile(handle, viewerUserId);
      if (storeProfile) {
        return res.json({ success: true, user: storeProfile });
      }
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isSelf = Boolean(viewerUserId && user._id.toString() === viewerUserId.toString());
    const isFollowing = Boolean(
      viewerUserId &&
      !isSelf &&
      await Follow.exists({ followerId: viewerUserId, followingId: user._id })
    );
    if (user.isPrivate && !isSelf && !isFollowing) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postVisibility = isSelf || isFollowing
      ? ["public", "followers", "private"]
      : ["public"];
    const [postsCount, followersCount, followingCount] = await Promise.all([
      Post.countDocuments({
        authorId: user._id,
        isDeleted: { $ne: true },
        $or: [{ visibility: { $in: postVisibility } }, { visibility: { $exists: false } }],
      }),
      Follow.countDocuments({ followingId: user._id }),
      Follow.countDocuments({ followerId: user._id }),
    ]);
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        username: user.username,
        name: user.fullName || user.username,
        avatar: user.avatar || "/default-avatar.svg",
        fallbackAvatar: user.avatar || "/default-avatar.svg",
        bio: user.bio || "",
        website: user.website || "",
        location: user.location || "",
        pronouns: user.pronouns || "",
        roleTag: "",
        cover: user.cover || "",
        joined: user.createdAt ? `Joined ${new Date(user.createdAt).toLocaleDateString()}` : "",
        postsCount,
        followersCount,
        followingCount,
        isVerified: Boolean(user.emailVerified),
        isSelf,
        isFollowing,
      },
    });
  } catch (err) {
    next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = {};
    const body = req.body || {};
    if (body.username !== undefined) {
      const username = String(body.username).toLowerCase().trim();
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        return res.status(400).json({ success: false, message: "Username is invalid" });
      }
      const existing = await User.findOne({ username, _id: { $ne: userId } }).select("_id");
      if (existing) return res.status(409).json({ success: false, message: "Username is already taken" });
      updates.username = username;
    }
    if (body.displayName !== undefined || body.fullName !== undefined) {
      updates.fullName = String(body.displayName ?? body.fullName).trim().slice(0, 60);
    }
    for (const field of ["bio", "website", "location", "pronouns", "avatar", "cover"]) {
      if (body[field] !== undefined) updates[field] = String(body[field]).trim();
    }
    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { returnDocument: "after", runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    store.initializeUser(user);
    const profileUpdates = {
      ...updates,
      displayName: user.fullName,
    };
    const result = store.updateProfileSettings(userId, profileUpdates);
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit("user:updated", result.user);
    }
    res.json({ success: true, user: result.user });
  } catch (err) {
    next(err);
  }
};

const getUserPosts = async (req, res, next) => {
  try {
    const handle = String(req.params.username || "").toLowerCase().trim();
    const viewerUserId = req.user?._id || req.user?.id;
    const identity = handle === "me"
      ? { _id: viewerUserId }
      : mongoose.isValidObjectId(handle)
        ? { _id: handle }
        : { username: handle };
    const target = await User.findOne({ ...identity, isActive: true, emailVerified: true }).select("_id");
    if (!target) return res.json({ success: true, tab: req.query.tab || "posts", count: 0, posts: [] });

    const tab = req.query.tab || "posts";
    let posts = [];
    if (tab === "posts" || tab === "reels") {
      const documents = await postService.getPostsByUser(target._id, 1, 50, viewerUserId);
      posts = documents
        .filter((post) => tab !== "reels" || post.media?.some((media) => media.type === "video"))
        .map((post) => ({
          id: post._id.toString(),
          _id: post._id.toString(),
          image: post.media?.[0]?.url || "",
          caption: post.content || "",
          likes: (post.likesCount || 0).toLocaleString(),
          likesCount: post.likesCount || 0,
          comments: (post.commentsCount || 0).toLocaleString(),
          commentsCount: post.commentsCount || 0,
          hasCarousel: (post.media?.length || 0) > 1,
          type: post.media?.some((media) => media.type === "video") ? "reel" : "photo",
          time: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "",
          location: post.location || "",
          authorId: post.authorId,
        }));
    } else if (tab === "saved" && viewerUserId?.toString() === target._id.toString()) {
      const bookmarks = await Bookmark.find({ userId: target._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate({
          path: "postId",
          populate: { path: "authorId", select: "username fullName avatar" },
        })
        .lean();
      const visibleSavedPosts = [];
      for (const bookmark of bookmarks) {
        const post = bookmark.postId;
        if (post && await postService.canViewPost(post, viewerUserId)) {
          visibleSavedPosts.push(post);
        }
      }
      posts = visibleSavedPosts.map((post) => ({
          id: post._id.toString(),
          _id: post._id.toString(),
          image: post.media?.[0]?.url || "",
          caption: post.content || "",
          likes: (post.likesCount || 0).toLocaleString(),
          likesCount: post.likesCount || 0,
          comments: (post.commentsCount || 0).toLocaleString(),
          commentsCount: post.commentsCount || 0,
          hasCarousel: (post.media?.length || 0) > 1,
          type: post.media?.some((media) => media.type === "video") ? "reel" : "photo",
          time: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "",
          location: post.location || "",
          authorId: post.authorId,
        }));
    }
    res.json({ success: true, tab, count: posts.length, posts });
  } catch (err) {
    next(err);
  }
};

const getHighlights = async (req, res, next) => {
  try {
    const { username } = req.params;
    const viewerUserId = req.user?.id || req.user?._id;
    const highlights = store.getHighlights(username, viewerUserId);
    res.json({ success: true, highlights });
  } catch (err) {
    next(err);
  }
};

const addHighlight = async (req, res, next) => {
  try {
    const { title, image, stories } = req.body;
    if (req.params.username !== req.user.username && req.params.username !== "me") {
      return res.status(403).json({ success: false, message: "You can only add highlights to your own profile" });
    }
    const newHighlight = store.addHighlight({ title, image, stories }, req.user.id);
    const io = getIO();
    if (io) {
      io.to(`user:${req.user.id}`).emit("highlight:created", newHighlight);
    }
    res.status(201).json({ success: true, highlight: newHighlight });
  } catch (err) {
    next(err);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const { username } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const target = await User.findOne({ username: String(username).toLowerCase(), isActive: true })
      .select("_id isPrivate")
      .lean();
    if (!target) return res.json({ success: true, followers: [], hasMore: false });
    const viewerId = req.user?._id || req.user?.id;
    const canView = !target.isPrivate ||
      viewerId?.toString() === target._id.toString() ||
      (viewerId && await Follow.exists({ followerId: viewerId, followingId: target._id }));
    if (!canView) return res.status(404).json({ success: false, message: "User not found" });
    const followers = await followService.getFollowersList(target._id, page, limit + 1);
    const hasMore = followers.length > limit;
    const sliced = hasMore ? followers.slice(0, limit) : followers;

    const followedIds = viewerId && sliced.length
      ? await Follow.find({
          followerId: viewerId,
          followingId: { $in: sliced.map((person) => person._id) },
        }).select("followingId").lean()
      : [];
    const followingSet = new Set(followedIds.map((item) => item.followingId.toString()));
    return res.json({
      success: true,
      hasMore,
      followers: sliced.map((person) => ({
        id: person._id.toString(),
        username: person.username,
        name: person.fullName || person.username,
        avatar: person.avatar || "/default-avatar.svg",
        isSelf: Boolean(viewerId && person._id.toString() === viewerId.toString()),
        isFollowing: followingSet.has(person._id.toString()),
      })),
    });
  } catch (err) {
    return next(err);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const { username } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const target = await User.findOne({ username: String(username).toLowerCase(), isActive: true })
      .select("_id isPrivate")
      .lean();
    if (!target) return res.json({ success: true, following: [], hasMore: false });
    const viewerId = req.user?._id || req.user?.id;
    const canView = !target.isPrivate ||
      viewerId?.toString() === target._id.toString() ||
      (viewerId && await Follow.exists({ followerId: viewerId, followingId: target._id }));
    if (!canView) return res.status(404).json({ success: false, message: "User not found" });
    const following = await followService.getFollowingList(target._id, page, limit + 1);
    const hasMore = following.length > limit;
    const sliced = hasMore ? following.slice(0, limit) : following;

    const followedIds = viewerId && sliced.length
      ? await Follow.find({
          followerId: viewerId,
          followingId: { $in: sliced.map((person) => person._id) },
        }).select("followingId").lean()
      : [];
    const followingSet = new Set(followedIds.map((item) => item.followingId.toString()));

    return res.json({
      success: true,
      hasMore,
      following: sliced.map((person) => ({
        id: person._id.toString(),
        username: person.username,
        name: person.fullName || person.username,
        avatar: person.avatar || "/default-avatar.svg",
        isSelf: Boolean(viewerId && person._id.toString() === viewerId.toString()),
        isFollowing: followingSet.has(person._id.toString()),
      })),
    });
  } catch (err) {
    return next(err);
  }
};

const toggleFollow = async (req, res, next) => {
  try {
    const { username } = req.params;
    const viewerId = (req.user._id || req.user.id).toString();
    const target = await User.findOne({
      username: String(username).toLowerCase(),
      isActive: true,
      emailVerified: true,
      isPrivate: false,
    }).select("_id username fullName avatar");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const targetId = target._id.toString();
    if (viewerId === targetId) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    const existingFollow = await Follow.findOne({ followerId: viewerId, followingId: targetId });
    let isFollowing = false;

    if (existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });
      isFollowing = false;
    } else {
      await Follow.create({ followerId: viewerId, followingId: targetId });
      isFollowing = true;
    }

    const [targetFollowersCount, viewerFollowingCount] = await Promise.all([
      Follow.countDocuments({ followingId: targetId }),
      Follow.countDocuments({ followerId: viewerId }),
    ]);

    await Promise.all([
      User.findByIdAndUpdate(targetId, { $set: { followersCount: targetFollowersCount } }),
      User.findByIdAndUpdate(viewerId, { $set: { followingCount: viewerFollowingCount } }),
    ]);

    // Keep store.js in sync
    store.toggleFollow(target.username, viewerId);

    // Send follow notification when newly following (avoid duplicates)
    if (isFollowing) {
      const actor = await User.findById(viewerId).select("username fullName avatar").lean();
      if (!Array.isArray(store.data.notifications)) store.data.notifications = [];
      const alreadyNotified = store.data.notifications.some(
        (n) =>
          n.recipientId === targetId &&
          n.senderId === viewerId &&
          n.type === "follow" &&
          !n.isRead
      );
      if (!alreadyNotified) {
        store.data.notifications.unshift({
          id: `notif_follow_${viewerId}_${Date.now()}`,
          recipientId: targetId,
          senderId: viewerId,
          section: "today",
          type: "follow",
          unread: true,
          isRead: false,
          user: actor?.username || "user",
          avatar: actor?.avatar || "/default-avatar.svg",
          badgeType: "friend",
          titlePrefix: actor?.username || "user",
          titleSuffix: " started following you.",
          subtext: "Just now",
          time: "Just now",
          isFriendRequest: false,
          createdAt: new Date().toISOString(),
        });
        store.saveData();
      }
    }

    const io = getIO();
    if (io) {
      io.to(`user:${viewerId}`).emit("follow:updated", {
        targetUsername: target.username,
        isFollowing,
        followersCount: targetFollowersCount,
        followingCount: viewerFollowingCount,
      });
      io.to(`user:${targetId}`).emit("follow:updated", {
        targetUsername: target.username,
        isFollowing,
        followersCount: targetFollowersCount,
      });
      if (isFollowing) {
        const unreadCount = store.getNotificationUnreadCount(targetId);
        io.to(`user:${targetId}`).emit("notification:new", { unreadCount });
      }
    }

    return res.json({
      success: true,
      isFollowing,
      followersCount: targetFollowersCount,
      followingCount: viewerFollowingCount,
    });
  } catch (err) {
    next(err);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const viewerUserId = req.user?._id || req.user?.id;
    const people = store.searchUsers(q, viewerUserId);
    res.json({ success: true, count: people.length, people });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateMe,
  getUserPosts,
  getHighlights,
  addHighlight,
  getFollowers,
  getFollowing,
  toggleFollow,
  searchUsers,
};