const mongoose = require("mongoose");
const store = require("../../config/store");
const { getIO } = require("../../config/socket");
const User = require("./user.model");
const Post = require("../posts/post.model");
const Follow = require("../follows/follow.model");
const FollowRequest = require("../follows/follow-request.model");
const Block = require("./block.model");
const Report = require("./report.model");
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
    const [isFollowingDoc, pendingReq, blockDoc] = await Promise.all([
      viewerUserId && !isSelf
        ? Follow.exists({ followerId: viewerUserId, followingId: user._id })
        : null,
      viewerUserId && !isSelf
        ? FollowRequest.exists({ requesterId: viewerUserId, targetId: user._id, status: "pending" })
        : null,
      viewerUserId && !isSelf
        ? Block.findOne({
            $or: [
              { blockerId: viewerUserId, blockedId: user._id },
              { blockerId: user._id, blockedId: viewerUserId },
            ],
          }).lean()
        : null,
    ]);
    const isFollowing = Boolean(isFollowingDoc);
    const hasPendingRequest = Boolean(pendingReq);
    const isBlockedByViewer = Boolean(blockDoc && blockDoc.blockerId.toString() === viewerUserId?.toString());

    if (blockDoc && !isBlockedByViewer) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postVisibility = isSelf || isFollowing
      ? ["public", "followers", "private"]
      : ["public"];
    const [postsCount, followersCount, followingCount, viewerFollowingDocs] = await Promise.all([
      Post.countDocuments({
        authorId: user._id,
        isDeleted: { $ne: true },
        $or: [{ visibility: { $in: postVisibility } }, { visibility: { $exists: false } }],
      }),
      Follow.countDocuments({ followingId: user._id }),
      Follow.countDocuments({ followerId: user._id }),
      viewerUserId && !isSelf
        ? Follow.find({ followerId: viewerUserId }).select("followingId").lean()
        : [],
    ]);

    let mutualFollowersCount = 0;
    let mutualFollowersPreview = [];
    if (viewerUserId && !isSelf && viewerFollowingDocs.length > 0) {
      const viewerFollowingIds = viewerFollowingDocs.map((d) => d.followingId);
      const mutualDocs = await Follow.find({
        followingId: user._id,
        followerId: { $in: viewerFollowingIds },
      })
        .populate("followerId", "username fullName avatar")
        .lean();
      const validMutuals = mutualDocs.map((d) => d.followerId).filter(Boolean);
      mutualFollowersCount = validMutuals.length;
      mutualFollowersPreview = validMutuals.slice(0, 3).map((u) => ({
        id: u._id.toString(),
        username: u.username,
        name: u.fullName || u.username,
        avatar: u.avatar || "/default-avatar.svg",
      }));
    }

    const isRestricted = Boolean(user.isPrivate && !isSelf && !isFollowing);
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
        website: isRestricted ? "" : user.website || "",
        location: isRestricted ? "" : user.location || "",
        pronouns: user.pronouns || "",
        roleTag: "",
        cover: user.cover || "",
        joined: user.createdAt ? `Joined ${new Date(user.createdAt).toLocaleDateString()}` : "",
        postsCount,
        followersCount,
        followingCount,
        mutualFollowersCount,
        mutualFollowersPreview,
        isPrivate: Boolean(user.isPrivate),
        isRestricted,
        isVerified: Boolean(user.emailVerified),
        isSelf,
        isFollowing,
        hasPendingRequest,
        isBlocked: isBlockedByViewer,
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
    if (body.displayName !== undefined || body.fullName !== undefined || body.name !== undefined) {
      updates.fullName = String(body.displayName ?? body.fullName ?? body.name).trim().slice(0, 60);
    }
    if (body.isPrivate !== undefined) {
      updates.isPrivate = Boolean(body.isPrivate);
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
    const target = await User.findOne({ ...identity, isActive: true, emailVerified: true }).select("_id isPrivate");
    if (!target) return res.json({ success: true, tab: req.query.tab || "posts", count: 0, posts: [] });

    const isSelf = Boolean(viewerUserId && target._id.toString() === viewerUserId.toString());
    const isFollowing = Boolean(
      viewerUserId && !isSelf && (await Follow.exists({ followerId: viewerUserId, followingId: target._id }))
    );
    if (target.isPrivate && !isSelf && !isFollowing) {
      return res.status(403).json({ success: false, message: "This account is private", posts: [] });
    }

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
    } else if (tab === "tagged") {
      const PostModel = require("../posts/post.model");
      const taggedDocs = await PostModel.find({
        taggedUsers: target._id,
        isDeleted: { $ne: true },
        isDraft: { $ne: true },
        isArchived: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("authorId", "username fullName avatar")
        .lean();
      const visible = [];
      for (const p of taggedDocs) {
        if (await postService.canViewPost(p, viewerUserId)) visible.push(p);
      }
      posts = visible.map((post) => ({
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
    } else if (tab === "archived" && isSelf) {
      const archivedDocs = await postService.getUserArchived(target._id);
      posts = archivedDocs.map((post) => ({
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
        isArchived: true,
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
    if (!canView) return res.status(403).json({ success: false, message: "This account is private" });
    const followers = await followService.getFollowersList(target._id, page, limit, limit + 1);
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
    if (!canView) return res.status(403).json({ success: false, message: "This account is private" });
    const following = await followService.getFollowingList(target._id, page, limit, limit + 1);
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
    }).select("_id username fullName avatar isPrivate");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const targetId = target._id.toString();
    if (viewerId === targetId) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    const blocked = await Block.exists({
      $or: [
        { blockerId: viewerId, blockedId: targetId },
        { blockerId: targetId, blockedId: viewerId },
      ],
    });
    if (blocked) {
      return res.status(403).json({ success: false, message: "You cannot follow this user" });
    }

    const existingFollow = await Follow.findOne({ followerId: viewerId, followingId: targetId });
    let isFollowing = false;
    let hasPendingRequest = false;

    if (existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });
      isFollowing = false;
    } else if (target.isPrivate) {
      const existingReq = await FollowRequest.findOne({
        requesterId: viewerId,
        targetId,
        status: "pending",
      });
      if (existingReq) {
        await FollowRequest.deleteOne({ _id: existingReq._id });
        hasPendingRequest = false;
      } else {
        await FollowRequest.findOneAndUpdate(
          { requesterId: viewerId, targetId },
          { $set: { status: "pending" } },
          { upsert: true, returnDocument: "after" }
        );
        hasPendingRequest = true;
      }
      const targetFollowersCount = await Follow.countDocuments({ followingId: targetId });
      return res.json({
        success: true,
        isFollowing: false,
        hasPendingRequest,
        followersCount: targetFollowersCount,
      });
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
          titlePrefix: actor?.fullName || actor?.username || "Someone",
          userName: actor?.fullName || actor?.username || "Someone",
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

const getFollowRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const requests = await FollowRequest.find({ targetId: userId, status: "pending" })
      .sort({ createdAt: -1 })
      .populate("requesterId", "username fullName avatar")
      .lean();
    res.json({
      success: true,
      requests: requests
        .filter((r) => r.requesterId)
        .map((r) => ({
          id: r._id.toString(),
          requesterId: r.requesterId._id.toString(),
          username: r.requesterId.username,
          name: r.requesterId.fullName || r.requesterId.username,
          avatar: r.requesterId.avatar || "/default-avatar.svg",
          createdAt: r.createdAt,
        })),
    });
  } catch (err) {
    next(err);
  }
};

const respondFollowRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;
    const { action } = req.body || {};
    const reqDoc = await FollowRequest.findOne({ _id: requestId, targetId: userId, status: "pending" });
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: "Follow request not found" });
    }

    if (action === "accept") {
      await Follow.updateOne(
        { followerId: reqDoc.requesterId, followingId: userId },
        { $setOnInsert: { followerId: reqDoc.requesterId, followingId: userId } },
        { upsert: true }
      );
      const [followersCount, requesterFollowingCount] = await Promise.all([
        Follow.countDocuments({ followingId: userId }),
        Follow.countDocuments({ followerId: reqDoc.requesterId }),
      ]);
      await Promise.all([
        User.findByIdAndUpdate(userId, { $set: { followersCount } }),
        User.findByIdAndUpdate(reqDoc.requesterId, { $set: { followingCount: requesterFollowingCount } }),
        FollowRequest.deleteOne({ _id: reqDoc._id }),
      ]);
      return res.json({ success: true, status: "accepted", followersCount });
    }

    await FollowRequest.deleteOne({ _id: reqDoc._id });
    return res.json({ success: true, status: "rejected" });
  } catch (err) {
    next(err);
  }
};

const removeFollower = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetUsername = String(req.params.followerUsername || "").toLowerCase().trim();
    const follower = await User.findOne({ username: targetUsername }).select("_id");
    if (!follower) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    await Follow.deleteOne({ followerId: follower._id, followingId: userId });
    const [followersCount, followerFollowingCount] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: follower._id }),
    ]);
    await Promise.all([
      User.findByIdAndUpdate(userId, { $set: { followersCount } }),
      User.findByIdAndUpdate(follower._id, { $set: { followingCount: followerFollowingCount } }),
    ]);
    res.json({ success: true, followersCount });
  } catch (err) {
    next(err);
  }
};

const toggleBlockUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetUsername = String(req.params.username || "").toLowerCase().trim();
    const target = await User.findOne({ username: targetUsername, deletedAt: null }).select("_id username");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (target._id.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot block yourself" });
    }

    const existing = await Block.findOne({ blockerId: userId, blockedId: target._id });
    let isBlocked = false;
    if (existing) {
      await Block.deleteOne({ _id: existing._id });
      isBlocked = false;
    } else {
      await Block.create({ blockerId: userId, blockedId: target._id });
      await Promise.all([
        Follow.deleteMany({
          $or: [
            { followerId: userId, followingId: target._id },
            { followerId: target._id, followingId: userId },
          ],
        }),
        FollowRequest.deleteMany({
          $or: [
            { requesterId: userId, targetId: target._id },
            { requesterId: target._id, targetId: userId },
          ],
        }),
      ]);
      isBlocked = true;
    }

    res.json({ success: true, isBlocked });
  } catch (err) {
    next(err);
  }
};

const reportUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetUsername = String(req.params.username || "").toLowerCase().trim();
    const reason = String(req.body?.reason || "").trim();
    if (!reason || reason.length < 3) {
      return res.status(400).json({ success: false, message: "Please provide a reason for reporting" });
    }
    const target = await User.findOne({ username: targetUsername, deletedAt: null }).select("_id");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const report = await Report.create({
      reporterId: userId,
      targetType: "user",
      targetId: target._id,
      reason: reason.slice(0, 500),
    });
    res.status(201).json({ success: true, message: "Report submitted", reportId: report._id.toString() });
  } catch (err) {
    next(err);
  }
};

const getSentFollowRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const requests = await FollowRequest.find({ requesterId: userId, status: "pending" })
      .sort({ createdAt: -1 })
      .populate("targetId", "username fullName avatar")
      .lean();
    res.json({
      success: true,
      requests: requests
        .filter((r) => r.targetId)
        .map((r) => ({
          id: r._id.toString(),
          targetId: r.targetId._id.toString(),
          username: r.targetId.username,
          name: r.targetId.fullName || r.targetId.username,
          avatar: r.targetId.avatar || "/default-avatar.svg",
          createdAt: r.createdAt,
        })),
    });
  } catch (err) {
    next(err);
  }
};

const cancelSentFollowRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetUsername = String(req.params.targetUsername || "").toLowerCase().trim();
    const target = await User.findOne({ username: targetUsername }).select("_id");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    await FollowRequest.deleteOne({ requesterId: userId, targetId: target._id, status: "pending" });
    res.json({ success: true, hasPendingRequest: false });
  } catch (err) {
    next(err);
  }
};

const getSuggestedAccounts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [followingDocs, blockDocs] = await Promise.all([
      Follow.find({ followerId: userId }).select("followingId").lean(),
      Block.find({ $or: [{ blockerId: userId }, { blockedId: userId }] })
        .select("blockerId blockedId")
        .lean(),
    ]);

    const excludedIds = new Set([userId.toString()]);
    followingDocs.forEach((d) => excludedIds.add(d.followingId.toString()));
    blockDocs.forEach((b) => {
      excludedIds.add(b.blockerId.toString());
      excludedIds.add(b.blockedId.toString());
    });

    const users = await User.find({
      _id: { $nin: Array.from(excludedIds) },
      isActive: true,
      isSuspended: { $ne: true },
      deletedAt: null,
      emailVerified: true,
      isPrivate: false,
    })
      .select("_id username fullName avatar bio followersCount")
      .sort({ followersCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .lean();

    const hasMore = users.length > limit;
    const sliced = hasMore ? users.slice(0, limit) : users;

    res.json({
      success: true,
      hasMore,
      suggestions: sliced.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        name: u.fullName || u.username,
        avatar: u.avatar || "/default-avatar.svg",
        bio: u.bio || "",
        followersCount: u.followersCount || 0,
        isFollowing: false,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const getMutualFollowers = async (req, res, next) => {
  try {
    const viewerId = req.user?.id || req.user?._id;
    const targetUsername = String(req.params.username || "").toLowerCase().trim();
    const target = await User.findOne({ username: targetUsername, isActive: true, deletedAt: null }).select("_id");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!viewerId || viewerId.toString() === target._id.toString()) {
      return res.json({ success: true, mutuals: [], count: 0 });
    }
    const viewerFollowingDocs = await Follow.find({ followerId: viewerId }).select("followingId").lean();
    const viewerFollowingIds = viewerFollowingDocs.map((d) => d.followingId);
    const mutualDocs = await Follow.find({
      followingId: target._id,
      followerId: { $in: viewerFollowingIds },
    })
      .populate("followerId", "username fullName avatar")
      .lean();
    const mutuals = mutualDocs
      .map((d) => d.followerId)
      .filter(Boolean)
      .map((u) => ({
        id: u._id.toString(),
        username: u.username,
        name: u.fullName || u.username,
        avatar: u.avatar || "/default-avatar.svg",
      }));
    res.json({ success: true, mutuals, count: mutuals.length });
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
  getFollowRequests,
  getSentFollowRequests,
  cancelSentFollowRequest,
  respondFollowRequest,
  removeFollower,
  toggleBlockUser,
  reportUser,
  getSuggestedAccounts,
  getMutualFollowers,
};