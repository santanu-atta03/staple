const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const http = require("node:http");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const argon2 = require("argon2");

const connectDB = require("../src/config/database");
const redis = require("../src/config/redis");
const app = require("../src/app");
const User = require("../src/modules/users/user.model");
const Session = require("../src/modules/auth/session.model");
const Follow = require("../src/modules/follows/follow.model");
const Block = require("../src/modules/users/block.model");
const Post = require("../src/modules/posts/post.model");
const Like = require("../src/modules/likes/like.model");
const Comment = require("../src/modules/comments/comment.model");
const Bookmark = require("../src/modules/bookmarks/bookmark.model");
const authService = require("../src/modules/auth/auth.service");

let server;
let baseUrl;
const createdUserIds = [];
const createdPostIds = [];

async function request(method, pathname, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function createAccount(tag, extra = {}) {
  const suffix = `${Date.now().toString().slice(-5)}_${tag}`;
  const password = "Password123!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await User.create({
    email: `feed_${suffix}@example.com`,
    username: `feed_${suffix}`,
    fullName: `Feed ${tag.toUpperCase()}`,
    passwordHash,
    emailVerified: true,
    isActive: true,
    avatar: "/default-avatar.svg",
    ...extra,
  });
  createdUserIds.push(user._id);
  const login = await authService.loginUser(user.email, password);
  return { user, token: login.accessToken };
}

describe("Home Feed & Content Recommendation (4-Account Suite)", () => {
  let acc1; // viewer
  let acc2; // followed public creator
  let acc3; // unfollowed public creator
  let acc4; // private & later blocked creator

  let acc2PublicPost;
  let acc2DraftPost;
  let acc2ArchivedPost;
  let acc2DeletedPost;
  let acc3LowEngPost;
  let acc3HighEngPost;
  let acc4PrivatePost;
  let acc4BlockedPublicPost;

  before(async () => {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    acc1 = await createAccount("1");
    acc2 = await createAccount("2");
    acc3 = await createAccount("3");
    acc4 = await createAccount("4", { isPrivate: true });

    // acc1 follows acc2
    await Follow.create({ followerId: acc1.user._id, followingId: acc2.user._id });

    // Create test posts directly so we can control timestamps, engagement, and statuses
    acc2PublicPost = await Post.create({
      authorId: acc2.user._id,
      content: "Followed creator public post #architecture",
      hashtags: ["architecture"],
      visibility: "public",
      likesCount: 5,
    });
    acc2DraftPost = await Post.create({
      authorId: acc2.user._id,
      content: "Followed creator draft post",
      visibility: "public",
      isDraft: true,
    });
    acc2ArchivedPost = await Post.create({
      authorId: acc2.user._id,
      content: "Followed creator archived post",
      visibility: "public",
      isArchived: true,
    });
    acc2DeletedPost = await Post.create({
      authorId: acc2.user._id,
      content: "Followed creator deleted post",
      visibility: "public",
      isDeleted: true,
    });

    // Extra posts from acc2 & acc3 for pagination (> 4 posts)
    const extra1 = await Post.create({
      authorId: acc2.user._id,
      content: "Followed creator extra post 1 #minimalism",
      hashtags: ["minimalism"],
      visibility: "public",
    });
    const extra2 = await Post.create({
      authorId: acc2.user._id,
      content: "Followed creator extra post 2 #design",
      hashtags: ["design"],
      visibility: "public",
    });

    acc3LowEngPost = await Post.create({
      authorId: acc3.user._id,
      content: "Recommended creator low engagement post",
      visibility: "public",
      likesCount: 1,
      commentsCount: 0,
      createdAt: new Date(Date.now() - 10 * 3600 * 1000),
    });
    acc3HighEngPost = await Post.create({
      authorId: acc3.user._id,
      content: "Recommended creator viral post #photography",
      hashtags: ["photography"],
      visibility: "public",
      likesCount: 120,
      commentsCount: 30,
      bookmarksCount: 25,
    });

    acc4PrivatePost = await Post.create({
      authorId: acc4.user._id,
      content: "Private account followers-only post",
      visibility: "followers",
    });
    acc4BlockedPublicPost = await Post.create({
      authorId: acc4.user._id,
      content: "Private account public-flagged post",
      visibility: "public",
    });

    createdPostIds.push(
      acc2PublicPost._id,
      acc2DraftPost._id,
      acc2ArchivedPost._id,
      acc2DeletedPost._id,
      extra1._id,
      extra2._id,
      acc3LowEngPost._id,
      acc3HighEngPost._id,
      acc4PrivatePost._id,
      acc4BlockedPublicPost._id
    );
  });

  after(async () => {
    try {
      if (createdPostIds.length) {
        await Like.deleteMany({ postId: { $in: createdPostIds } });
        await Comment.deleteMany({ postId: { $in: createdPostIds } });
        await Bookmark.deleteMany({ postId: { $in: createdPostIds } });
        await Post.deleteMany({ _id: { $in: createdPostIds } });
      }
      if (createdUserIds.length) {
        await Follow.deleteMany({
          $or: [{ followerId: { $in: createdUserIds } }, { followingId: { $in: createdUserIds } }],
        });
        await Block.deleteMany({
          $or: [{ blockerId: { $in: createdUserIds } }, { blockedId: { $in: createdUserIds } }],
        });
        await Session.deleteMany({ userId: { $in: createdUserIds } });
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await redis.quit().catch(() => {});
      await mongoose.connection.close();
    }
  });

  it("returns chronological followed posts in Following tab and excludes unfollowed, draft, archived, deleted, and private posts", async () => {
    const res = await request("GET", "/feed?tab=following&limit=20", { token: acc1.token });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.posts));

    const ids = res.data.posts.map((p) => String(p._id));
    assert.ok(ids.includes(String(acc2PublicPost._id)));
    assert.ok(!ids.includes(String(acc2DraftPost._id)));
    assert.ok(!ids.includes(String(acc2ArchivedPost._id)));
    assert.ok(!ids.includes(String(acc2DeletedPost._id)));
    assert.ok(!ids.includes(String(acc3HighEngPost._id)));
    assert.ok(!ids.includes(String(acc4PrivatePost._id)));
    assert.ok(!ids.includes(String(acc4BlockedPublicPost._id)));
  });

  it("returns ranked non-followed public posts with isSuggested=true in Recommended tab", async () => {
    const res = await request("GET", "/feed?tab=recommended&limit=20", { token: acc1.token });
    assert.equal(res.status, 200);

    const ids = res.data.posts.map((p) => String(p._id));
    assert.ok(!ids.includes(String(acc2PublicPost._id))); // already followed
    assert.ok(ids.includes(String(acc3HighEngPost._id)));
    assert.ok(ids.includes(String(acc3LowEngPost._id)));
    assert.ok(!ids.includes(String(acc4PrivatePost._id)));
    assert.ok(!ids.includes(String(acc4BlockedPublicPost._id)));

    const highIdx = ids.indexOf(String(acc3HighEngPost._id));
    const lowIdx = ids.indexOf(String(acc3LowEngPost._id));
    assert.ok(highIdx < lowIdx, "Higher engagement recent post should rank above older low-engagement post");

    const suggestedPost = res.data.posts.find((p) => String(p._id) === String(acc3HighEngPost._id));
    assert.equal(suggestedPost.isSuggested, true);
  });

  it("combines followed and suggested posts in For You tab and respects Block relationships", async () => {
    // Make acc4 public temporarily, then block acc4 to ensure Block filter works regardless of privacy
    await User.updateOne({ _id: acc4.user._id }, { $set: { isPrivate: false } });
    await Block.create({ blockerId: acc1.user._id, blockedId: acc4.user._id });

    const res = await request("GET", "/feed?tab=for-you&limit=20", { token: acc1.token });
    assert.equal(res.status, 200);
    const ids = res.data.posts.map((p) => String(p._id));
    assert.ok(ids.includes(String(acc2PublicPost._id)));
    assert.ok(ids.includes(String(acc3HighEngPost._id)));
    assert.ok(!ids.includes(String(acc4BlockedPublicPost._id)), "Blocked user posts must be excluded");
  });

  it("paginates without duplicates or skipped posts", async () => {
    const page1 = await request("GET", "/feed?tab=following&page=1&limit=2", { token: acc1.token });
    assert.equal(page1.status, 200);
    assert.equal(page1.data.posts.length, 2);
    assert.equal(page1.data.hasMore, true);

    const page2 = await request("GET", "/feed?tab=following&page=2&limit=2", { token: acc1.token });
    assert.equal(page2.status, 200);
    assert.ok(page2.data.posts.length >= 1);

    const ids1 = page1.data.posts.map((p) => String(p._id));
    const ids2 = page2.data.posts.map((p) => String(p._id));
    const overlap = ids1.filter((id) => ids2.includes(id));
    assert.equal(overlap.length, 0, "Pages must not contain duplicate posts");
  });

  it("persists like, comment, and bookmark state in feed responses", async () => {
    const postId = String(acc2PublicPost._id);

    const likeRes = await request("POST", `/likes/${postId}`, { token: acc1.token });
    assert.equal(likeRes.status, 200);
    assert.equal(likeRes.data.liked, true);

    const commentRes = await request("POST", `/comments/${postId}`, {
      token: acc1.token,
      body: { text: "Great composition!" },
    });
    assert.equal(commentRes.status, 201);

    const bookmarkRes = await request("POST", `/posts/${postId}/bookmark`, { token: acc1.token });
    assert.equal(bookmarkRes.status, 200);
    assert.equal(bookmarkRes.data.isSaved, true);

    const feedRes = await request("GET", "/feed?tab=following&limit=20", { token: acc1.token });
    assert.equal(feedRes.status, 200);
    const hydrated = feedRes.data.posts.find((p) => String(p._id) === postId);
    assert.ok(hydrated);
    assert.equal(hydrated.isLiked, true);
    assert.equal(hydrated.isSaved, true);
    assert.ok(hydrated.comments.some((c) => (c.text || c.content) === "Great composition!"));
  });
});
