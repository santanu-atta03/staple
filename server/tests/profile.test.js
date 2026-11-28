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
const FollowRequest = require("../src/modules/follows/follow-request.model");
const Block = require("../src/modules/users/block.model");
const Report = require("../src/modules/users/report.model");
const authService = require("../src/modules/auth/auth.service");

let server;
let baseUrl;
const createdUserIds = [];

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

async function createTestAccount(tag) {
  const suffix = `${Date.now().toString().slice(-5)}_${tag}`;
  const password = "Password123!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await User.create({
    email: `profile_${suffix}@example.com`,
    username: `prof_${suffix}`,
    fullName: `Profile ${tag}`,
    passwordHash,
    emailVerified: true,
    isActive: true,
    avatar: "/default-avatar.svg",
  });
  createdUserIds.push(user._id);
  const login = await authService.loginUser(user.email, password);
  return { user, token: login.accessToken };
}

describe("User Profile System (3-Account Integration Suite)", () => {
  let accA;
  let accB;
  let accC;

  before(async () => {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    accA = await createTestAccount("a");
    accB = await createTestAccount("b");
    accC = await createTestAccount("c");
  });

  after(async () => {
    try {
      await Promise.all([
        Session.deleteMany({ userId: { $in: createdUserIds } }),
        Follow.deleteMany({
          $or: [
            { followerId: { $in: createdUserIds } },
            { followingId: { $in: createdUserIds } },
          ],
        }),
        FollowRequest.deleteMany({
          $or: [
            { requesterId: { $in: createdUserIds } },
            { targetId: { $in: createdUserIds } },
          ],
        }),
        Block.deleteMany({
          $or: [
            { blockerId: { $in: createdUserIds } },
            { blockedId: { $in: createdUserIds } },
          ],
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

  it("updates own profile fields and blocks privilege escalation", async () => {
    const updateRes = await request("PATCH", "/users/me", {
      token: accA.token,
      body: {
        name: "Alpha Updated",
        bio: "Photographer & architect",
        location: "Kyoto",
        website: "https://alpha.example.com",
        pronouns: "they/them",
        avatar: "/uploads/alpha.png",
        cover: "/uploads/cover.png",
        role: "admin",
        followersCount: 99999,
      },
    });
    assert.equal(updateRes.status, 200);

    const dbUser = await User.findById(accA.user._id).lean();
    assert.equal(dbUser.fullName, "Alpha Updated");
    assert.equal(dbUser.bio, "Photographer & architect");
    assert.equal(dbUser.location, "Kyoto");
    assert.equal(dbUser.avatar, "/uploads/alpha.png");
    assert.equal(dbUser.cover, "/uploads/cover.png");
    assert.equal(dbUser.role, "user", "Role must not be modifiable via profile update");
    assert.equal(dbUser.followersCount, 0, "followersCount must not be modifiable via profile update");
  });

  it("prevents self-follow and manages followers/following lists accurately across 3 accounts", async () => {
    const selfFollow = await request("POST", `/users/${accA.user.username}/follow`, {
      token: accA.token,
    });
    assert.equal(selfFollow.status, 400);

    // B and C follow A
    const followBA = await request("POST", `/users/${accA.user.username}/follow`, { token: accB.token });
    assert.equal(followBA.status, 200);
    assert.equal(followBA.data.isFollowing, true);
    assert.equal(followBA.data.followersCount, 1);

    const followCA = await request("POST", `/users/${accA.user.username}/follow`, { token: accC.token });
    assert.equal(followCA.status, 200);
    assert.equal(followCA.data.followersCount, 2);

    // Paginated followers list for A
    const page1 = await request("GET", `/users/${accA.user.username}/followers?page=1&limit=1`, {
      token: accA.token,
    });
    assert.equal(page1.status, 200);
    assert.equal(page1.data.followers.length, 1);
    assert.equal(page1.data.hasMore, true);

    const page2 = await request("GET", `/users/${accA.user.username}/followers?page=2&limit=1`, {
      token: accA.token,
    });
    assert.equal(page2.status, 200);
    assert.equal(page2.data.followers.length, 1);
    assert.equal(page2.data.hasMore, false);

    // Search finds already-followed user A for B
    const searchRes = await request("GET", `/search/people?q=${encodeURIComponent(accA.user.username)}`, {
      token: accB.token,
    });
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.data.people.some((p) => p.username === accA.user.username && p.isFollowing === true));

    // A removes follower C
    const removeC = await request("DELETE", `/users/me/followers/${accC.user.username}`, {
      token: accA.token,
    });
    assert.equal(removeC.status, 200);
    assert.equal(removeC.data.followersCount, 1);
  });

  it("enforces private account restrictions and follow request approval", async () => {
    // B sets account to private
    const privRes = await request("PATCH", "/users/me", {
      token: accB.token,
      body: { isPrivate: true },
    });
    assert.equal(privRes.status, 200);

    // C (not following B) sees restricted profile and gets 403 on posts/followers
    const profRes = await request("GET", `/users/${accB.user.username}`, { token: accC.token });
    assert.equal(profRes.status, 200);
    assert.equal(profRes.data.user.isPrivate, true);
    assert.equal(profRes.data.user.isRestricted, true);

    const posts403 = await request("GET", `/users/${accB.user.username}/posts`, { token: accC.token });
    assert.equal(posts403.status, 403);

    const followers403 = await request("GET", `/users/${accB.user.username}/followers`, { token: accC.token });
    assert.equal(followers403.status, 403);

    // C requests to follow B
    const reqFollow = await request("POST", `/users/${accB.user.username}/follow`, { token: accC.token });
    assert.equal(reqFollow.status, 200);
    assert.equal(reqFollow.data.isFollowing, false);
    assert.equal(reqFollow.data.hasPendingRequest, true);

    // B sees pending request and accepts it
    const listReqs = await request("GET", "/users/me/follow-requests", { token: accB.token });
    assert.equal(listReqs.status, 200);
    const reqItem = listReqs.data.requests.find((r) => r.username === accC.user.username);
    assert.ok(reqItem);

    const acceptRes = await request("POST", `/users/me/follow-requests/${reqItem.id}/respond`, {
      token: accB.token,
      body: { action: "accept" },
    });
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.data.status, "accepted");

    // C can now access B's posts
    const postsOk = await request("GET", `/users/${accB.user.username}/posts`, { token: accC.token });
    assert.equal(postsOk.status, 200);
  });

  it("supports blocking and reporting users", async () => {
    const reportRes = await request("POST", `/users/${accC.user.username}/report`, {
      token: accA.token,
      body: { reason: "Spam behavior" },
    });
    assert.equal(reportRes.status, 201);

    const blockRes = await request("POST", `/users/${accC.user.username}/block`, {
      token: accA.token,
    });
    assert.equal(blockRes.status, 200);
    assert.equal(blockRes.data.isBlocked, true);

    // Blocked user C cannot view A's profile (404)
    const blockedView = await request("GET", `/users/${accA.user.username}`, { token: accC.token });
    assert.equal(blockedView.status, 404);
  });
});
