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
    const user = await User.findOne({
      ...identity,
      isActive: true,
      emailVerified: true,
    }).select("_id username fullName avatar bio website location pronouns cover isPrivate followersCount followingCount emailVerified createdAt");
    if (!user) {
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
    const postsCount = await Post.countDocuments({
      authorId: user._id,
      isDeleted: { $ne: true },
      $or: [{ visibility: { $in: postVisibility } }, { visibility: { $exists: false } }],
    });
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
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
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
    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
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
    const target = await User.findOne({ username: String(username).toLowerCase(), isActive: true })
      .select("_id isPrivate")
      .lean();
    if (!target) return res.json({ success: true, followers: [] });
    const viewerId = req.user?._id || req.user?.id;
    const canView = !target.isPrivate ||
      viewerId?.toString() === target._id.toString() ||
      (viewerId && await Follow.exists({ followerId: viewerId, followingId: target._id }));
    if (!canView) return res.status(404).json({ success: false, message: "User not found" });
    const followers = await followService.getFollowersList(target._id, 1, 100);
    const followedIds = viewerId && followers.length
      ? await Follow.find({
          followerId: viewerId,
          followingId: { $in: followers.map((person) => person._id) },
        }).select("followingId").lean()
      : [];
    const followingSet = new Set(followedIds.map((item) => item.followingId.toString()));
    return res.json({
      success: true,
      followers: followers.map((person) => ({
        id: person._id.toString(),
        username: person.username,
        name: person.fullName || person.username,
        avatar: person.avatar || "/default-avatar.svg",
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
    const target = await User.findOne({ username: String(username).toLowerCase(), isActive: true })
      .select("_id isPrivate")
      .lean();
    if (!target) return res.json({ success: true, following: [] });
    const viewerId = req.user?._id || req.user?.id;
    const canView = !target.isPrivate ||
      viewerId?.toString() === target._id.toString() ||
      (viewerId && await Follow.exists({ followerId: viewerId, followingId: target._id }));
    if (!canView) return res.status(404).json({ success: false, message: "User not found" });
    const following = await followService.getFollowingList(target._id, 1, 100);
    return res.json({
      success: true,
      following: following.map((person) => ({
        id: person._id.toString(),
        username: person.username,
        name: person.fullName || person.username,
        avatar: person.avatar || "/default-avatar.svg",
      })),
    });
  } catch (err) {
    return next(err);
  }
};

const toggleFollow = async (req, res, next) => {
  try {
    const { username } = req.params;
    const target = await User.findOne({
      username: String(username).toLowerCase(),
      isActive: true,
      emailVerified: true,
      isPrivate: false,
    }).select("_id");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const result = await followService.toggleFollowUser(req.user._id || req.user.id, target._id);
    const io = getIO();
    if (io) {
      io.to(`user:${req.user.id}`).emit("follow:updated", {
        username,
        isFollowing: result.following,
        followersCount: result.followerCount,
      });
    }
    return res.json({
      success: true,
      isFollowing: result.following,
      followersCount: result.followerCount,
    });
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
};