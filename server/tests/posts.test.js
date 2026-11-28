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
const Post = require("../src/modules/posts/post.model");
const Report = require("../src/modules/users/report.model");
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

async function createAccount(tag) {
  const suffix = `${Date.now().toString().slice(-5)}_${tag}`;
  const password = "Password123!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await User.create({
    email: `posts_${suffix}@example.com`,
    username: `post_${suffix}`,
    fullName: `Post ${tag.toUpperCase()}`,
    passwordHash,
    emailVerified: true,
    isActive: true,
    avatar: "/default-avatar.svg",
  });
  createdUserIds.push(user._id);
  const login = await authService.loginUser(user.email, password);
  return { user, token: login.accessToken };
}

describe("Posts & Media Management (3-Account Suite)", () => {
  let acc1;
  let acc2;
  let acc3;

  before(async () => {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    acc1 = await createAccount("1");
    acc2 = await createAccount("2");
    acc3 = await createAccount("3");
  });

  after(async () => {
    try {
      await Promise.all([
        Session.deleteMany({ userId: { $in: createdUserIds } }),
        Post.deleteMany({
          $or: [{ _id: { $in: createdPostIds } }, { authorId: { $in: createdUserIds } }],
        }),
        Report.deleteMany({ reporterId: { $in: createdUserIds } }),
        User.deleteMany({ _id: { $in: createdUserIds } }),
      ]);
    } catch {}
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await redis.quit().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  });

  it("rejects invalid file content (spoofed MIME magic bytes) on upload", async () => {
    const formData = new FormData();
    formData.append(
      "files",
      new Blob(["NOT_A_REAL_JPEG"], { type: "image/jpeg" }),
      "fake.jpg"
    );
    const res = await fetch(`${baseUrl}/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${acc1.token}` },
      body: formData,
    });
    assert.equal(res.status, 400);
  });

  it("creates single/multi-image/video posts, supports drafts, archive/restore, tagging, privacy, and prevents unauthorized edits/deletes", async () => {
    // 1. Multi-image post with hashtags, location, and tagged user
    const createRes = await request("POST", "/posts", {
      token: acc1.token,
      body: {
        content: "Kyoto golden hour #travel",
        media: [
          { url: "/uploads/img1.jpg", type: "image" },
          { url: "/uploads/img2.jpg", type: "image" },
        ],
        taggedUsers: [acc2.user.username],
        location: "Kyoto, Japan",
        visibility: "public",
      },
    });
    assert.equal(createRes.status, 201, JSON.stringify(createRes.data));
    const postId = createRes.data.post._id;
    createdPostIds.push(postId);
    assert.equal(createRes.data.post.media.length, 2);
    assert.ok(createRes.data.post.tags.includes("#travel"));

    // Tagged posts tab for acc2 shows this post
    const taggedRes = await request("GET", `/users/${acc2.user.username}/posts?tab=tagged`, {
      token: acc2.token,
    });
    assert.equal(taggedRes.status, 200);
    assert.ok(taggedRes.data.posts.some((p) => p.id === postId));

    // Unauthorized edit & delete by acc2 rejected (403)
    const unauthEdit = await request("PATCH", `/posts/${postId}`, {
      token: acc2.token,
      body: { content: "Hacked" },
    });
    assert.equal(unauthEdit.status, 403);

    const unauthDel = await request("DELETE", `/posts/${postId}`, { token: acc2.token });
    assert.equal(unauthDel.status, 403);

    // Owner edits post
    const editRes = await request("PATCH", `/posts/${postId}`, {
      token: acc1.token,
      body: { content: "Kyoto twilight updated", location: "Arashiyama" },
    });
    assert.equal(editRes.status, 200);
    assert.equal(editRes.data.post.location, "Arashiyama");

    // Archive post -> hidden from acc3 (404), visible in owner's archived list
    const archRes = await request("POST", `/posts/${postId}/archive`, { token: acc1.token });
    assert.equal(archRes.status, 200);
    assert.equal(archRes.data.isArchived, true);

    const hiddenRes = await request("GET", `/posts/${postId}`, { token: acc3.token });
    assert.equal(hiddenRes.status, 404);

    const myArchived = await request("GET", "/posts/me/archived", { token: acc1.token });
    assert.equal(myArchived.status, 200);
    assert.ok(myArchived.data.posts.some((p) => p._id === postId));

    // Restore post
    const restoreRes = await request("POST", `/posts/${postId}/archive`, { token: acc1.token });
    assert.equal(restoreRes.data.isArchived, false);

    // Save draft -> hidden from acc2, visible in owner's drafts -> publish
    const draftRes = await request("POST", "/posts", {
      token: acc1.token,
      body: {
        content: "Video draft",
        media: [{ url: "/uploads/clip.mp4", type: "video" }],
        isDraft: true,
      },
    });
    assert.equal(draftRes.status, 201);
    const draftId = draftRes.data.post._id;
    createdPostIds.push(draftId);

    const draftHidden = await request("GET", `/posts/${draftId}`, { token: acc2.token });
    assert.equal(draftHidden.status, 404);

    const myDrafts = await request("GET", "/posts/me/drafts", { token: acc1.token });
    assert.ok(myDrafts.data.drafts.some((d) => d._id === draftId));

    const pubRes = await request("POST", `/posts/${draftId}/publish`, { token: acc1.token });
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.data.post.isDraft, false);

    // Report post & delete post
    const repRes = await request("POST", `/posts/${postId}/report`, {
      token: acc3.token,
      body: { reason: "Inappropriate content" },
    });
    assert.equal(repRes.status, 201);

    const delRes = await request("DELETE", `/posts/${postId}`, { token: acc1.token });
    assert.equal(delRes.status, 200);
  });
});
