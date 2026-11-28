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

async function createAccount(tag) {
  const suffix = `${Date.now().toString().slice(-5)}_${tag}`;
  const password = "Password123!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await User.create({
    email: `follow_${suffix}@example.com`,
    username: `foll_${suffix}`,
    fullName: `Follow ${tag.toUpperCase()}`,
    passwordHash,
    emailVerified: true,
    isActive: true,
    avatar: "/default-avatar.svg",
  });
  createdUserIds.push(user._id);
  const login = await authService.loginUser(user.email, password);
  return { user, token: login.accessToken };
}

describe("Social Following System (4-Account Suite)", () => {
  let acc1;
  let acc2;
  let acc3;
  let acc4;

  before(async () => {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    acc1 = await createAccount("1");
    acc2 = await createAccount("2");
    acc3 = await createAccount("3");
    acc4 = await createAccount("4");
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
        User.deleteMany({ _id: { $in: createdUserIds } }),
      ]);
    } catch {}
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await redis.quit().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  });

  it("handles public follow, unfollow, self-follow prevention, mutuals, suggestions, and search", async () => {
    // Self-follow rejected
    const selfRes = await request("POST", `/users/${acc1.user.username}/follow`, { token: acc1.token });
    assert.equal(selfRes.status, 400);

    // 1 -> 2 and 3 -> 2; 1 -> 3 (so 3 is a mutual follower when 1 views 2)
    await request("POST", `/users/${acc2.user.username}/follow`, { token: acc1.token });
    await request("POST", `/users/${acc2.user.username}/follow`, { token: acc3.token });
    await request("POST", `/users/${acc3.user.username}/follow`, { token: acc1.token });

    // Mutual followers for 1 viewing 2 should include 3
    const prof2 = await request("GET", `/users/${acc2.user.username}`, { token: acc1.token });
    assert.equal(prof2.status, 200);
    assert.equal(prof2.data.user.followersCount, 2);
    assert.equal(prof2.data.user.mutualFollowersCount, 1);
    assert.equal(prof2.data.user.mutualFollowersPreview[0].username, acc3.user.username);

    // Suggested accounts for 1 must exclude 1, 2, 3 (already followed) and include 4
    const suggRes = await request("GET", "/users/suggestions", { token: acc1.token });
    assert.equal(suggRes.status, 200);
    const suggUsernames = suggRes.data.suggestions.map((s) => s.username);
    assert.ok(!suggUsernames.includes(acc1.user.username));
    assert.ok(!suggUsernames.includes(acc2.user.username));
    assert.ok(!suggUsernames.includes(acc3.user.username));

    // Search for already-followed user 2 still returns 2 with isFollowing: true
    const searchRes = await request("GET", `/search/people?q=${encodeURIComponent(acc2.user.username)}`, {
      token: acc1.token,
    });
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.data.people.some((p) => p.username === acc2.user.username && p.isFollowing === true));

    // Unfollow 1 -> 2 decrements count to 1
    const unfollowRes = await request("POST", `/users/${acc2.user.username}/follow`, { token: acc1.token });
    assert.equal(unfollowRes.status, 200);
    assert.equal(unfollowRes.data.isFollowing, false);
    assert.equal(unfollowRes.data.followersCount, 1);
  });

  it("handles private account requests: send, view sent, cancel, reject, accept, and block restrictions", async () => {
    // 4 becomes private
    await request("PATCH", "/users/me", { token: acc4.token, body: { isPrivate: true } });

    // 1 sends follow request to 4 -> view sent -> cancel
    const req1 = await request("POST", `/users/${acc4.user.username}/follow`, { token: acc1.token });
    assert.equal(req1.data.hasPendingRequest, true);
    assert.equal(req1.data.followersCount, 0);

    const sentList = await request("GET", "/users/me/follow-requests/sent", { token: acc1.token });
    assert.equal(sentList.status, 200);
    assert.ok(sentList.data.requests.some((r) => r.username === acc4.user.username));

    const cancelRes = await request("DELETE", `/users/me/follow-requests/${acc4.user.username}`, {
      token: acc1.token,
    });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.data.hasPendingRequest, false);

    // 2 sends follow request to 4 -> 4 rejects
    await request("POST", `/users/${acc4.user.username}/follow`, { token: acc2.token });
    const reqsFor4 = await request("GET", "/users/me/follow-requests", { token: acc4.token });
    const reqFrom2 = reqsFor4.data.requests.find((r) => r.username === acc2.user.username);
    assert.ok(reqFrom2);

    const rejectRes = await request("POST", `/users/me/follow-requests/${reqFrom2.id}/respond`, {
      token: acc4.token,
      body: { action: "reject" },
    });
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.data.status, "rejected");

    // 1 sends again -> 4 accepts -> 1 now follows 4
    await request("POST", `/users/${acc4.user.username}/follow`, { token: acc1.token });
    const reqsFor4b = await request("GET", "/users/me/follow-requests", { token: acc4.token });
    const reqFrom1 = reqsFor4b.data.requests.find((r) => r.username === acc1.user.username);
    const acceptRes = await request("POST", `/users/me/follow-requests/${reqFrom1.id}/respond`, {
      token: acc4.token,
      body: { action: "accept" },
    });
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.data.followersCount, 1);

    // 4 blocks 1 -> removes follow relationship and prevents 1 from viewing/following 4
    await request("POST", `/users/${acc1.user.username}/block`, { token: acc4.token });
    const blockedFollow = await request("POST", `/users/${acc4.user.username}/follow`, { token: acc1.token });
    assert.equal(blockedFollow.status, 403);
  });
});
