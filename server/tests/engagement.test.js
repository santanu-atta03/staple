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
const Block = require("../src/modules/users/block.model");
const Post = require("../src/modules/posts/post.model");
const Like = require("../src/modules/likes/like.model");
const Comment = require("../src/modules/comments/comment.model");
const CommentReaction = require("../src/modules/comments/comment-reaction.model");
const Bookmark = require("../src/modules/bookmarks/bookmark.model");
const Notification = require("../src/modules/notifications/notification.model");
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
    email: `eng_${suffix}@example.com`,
    username: `eng_${suffix}`,
    fullName: `Engagement ${tag.toUpperCase()}`,
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

describe("Likes, Comments, Replies & Post Engagement (4-Account Suite)", () => {
  let acc1; // post author
  let acc2; // commenter & liker
  let acc3; // third party / replier
  let acc4; // private / blocked account

  let publicPost;
  let privatePost;
  let deletedPost;

  before(async () => {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    acc1 = await createAccount("1");
    acc2 = await createAccount("2");
    acc3 = await createAccount("3");
    acc4 = await createAccount("4", { isPrivate: true });

    publicPost = await Post.create({
      authorId: acc1.user._id,
      content: "Engagement test post #design",
      visibility: "public",
    });
    privatePost = await Post.create({
      authorId: acc4.user._id,
      content: "Private post",
      visibility: "private",
    });
    deletedPost = await Post.create({
      authorId: acc1.user._id,
      content: "Deleted post",
      visibility: "public",
      isDeleted: true,
    });
    createdPostIds.push(publicPost._id, privatePost._id, deletedPost._id);
  });

  after(async () => {
    try {
      if (createdPostIds.length) {
        const cIds = await Comment.find({ postId: { $in: createdPostIds } }).distinct("_id");
        if (cIds.length) {
          await CommentReaction.deleteMany({ commentId: { $in: cIds } });
        }
        await Comment.deleteMany({ postId: { $in: createdPostIds } });
        await Like.deleteMany({ postId: { $in: createdPostIds } });
        await Bookmark.deleteMany({ postId: { $in: createdPostIds } });
        await Notification.deleteMany({ entityId: { $in: createdPostIds } });
        await Post.deleteMany({ _id: { $in: createdPostIds } });
      }
      if (createdUserIds.length) {
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

  it("handles post like, unlike, paginated likes list, and blocks liking deleted or private posts", async () => {
    const pid = String(publicPost._id);

    // Like from acc2 and acc3
    const like2 = await request("POST", `/likes/${pid}`, { token: acc2.token });
    assert.equal(like2.status, 200);
    assert.equal(like2.data.liked, true);
    assert.equal(like2.data.likesCount, 1);

    const like3 = await request("POST", `/likes/${pid}`, { token: acc3.token });
    assert.equal(like3.status, 200);
    assert.equal(like3.data.liked, true);
    assert.equal(like3.data.likesCount, 2);

    // Paginated likes list
    const list1 = await request("GET", `/likes/${pid}?page=1&limit=1`, { token: acc1.token });
    assert.equal(list1.status, 200);
    assert.equal(list1.data.users.length, 1);
    assert.equal(list1.data.hasMore, true);
    assert.equal(list1.data.totalCount, 2);

    // Unlike from acc3
    const unlike3 = await request("POST", `/likes/${pid}`, { token: acc3.token });
    assert.equal(unlike3.status, 200);
    assert.equal(unlike3.data.liked, false);
    assert.equal(unlike3.data.likesCount, 1);

    // Cannot like deleted or private posts
    const delRes = await request("POST", `/likes/${deletedPost._id}`, { token: acc2.token });
    assert.equal(delRes.status, 404);
    const privRes = await request("POST", `/likes/${privatePost._id}`, { token: acc2.token });
    assert.equal(privRes.status, 404);
  });

  it("handles comments, edits, replies, comment reactions, mentions, hashtags, and authorization", async () => {
    const pid = String(publicPost._id);

    // acc2 adds comment mentioning acc3 with hashtag
    const cRes = await request("POST", `/comments/${pid}`, {
      token: acc2.token,
      body: { content: `Awesome work @${acc3.user.username} #minimalism` },
    });
    assert.equal(cRes.status, 201);
    const commentId = cRes.data.comment._id;
    assert.deepEqual(cRes.data.comment.hashtags, ["minimalism"]);

    // Verify mention & comment notifications created for acc3 and acc1, and NOT for acc2
    const acc3Notifs = await Notification.find({ recipientId: acc3.user._id, type: "MENTION" }).lean();
    assert.ok(acc3Notifs.length >= 1);
    const acc2SelfNotifs = await Notification.find({ recipientId: acc2.user._id, entityId: publicPost._id }).lean();
    assert.equal(acc2SelfNotifs.length, 0);

    // acc3 cannot edit acc2's comment
    const unauthEdit = await request("PATCH", `/comments/${commentId}`, {
      token: acc3.token,
      body: { content: "Hacked" },
    });
    assert.equal(unauthEdit.status, 403);

    // acc2 edits own comment
    const editOk = await request("PATCH", `/comments/${commentId}`, {
      token: acc2.token,
      body: { content: "Updated comment #architecture" },
    });
    assert.equal(editOk.status, 200);
    assert.equal(editOk.data.comment.isEdited, true);

    // acc3 replies to comment
    const replyRes = await request("POST", `/comments/${pid}/${commentId}/reply`, {
      token: acc3.token,
      body: { content: "Totally agree!" },
    });
    assert.equal(replyRes.status, 201);
    const replyId = replyRes.data.comment._id;
    assert.equal(replyRes.data.comment.parentCommentId, commentId);

    // acc1 reacts to comment (like -> love -> remove)
    const r1 = await request("POST", `/comments/${commentId}/reaction`, {
      token: acc1.token,
      body: { type: "like" },
    });
    assert.equal(r1.status, 200);
    assert.equal(r1.data.liked, true);
    assert.equal(r1.data.likesCount, 1);

    const r2 = await request("POST", `/comments/${commentId}/reaction`, {
      token: acc1.token,
      body: { type: "love" },
    });
    assert.equal(r2.status, 200);
    assert.equal(r2.data.myReaction, "love");
    assert.equal(r2.data.likesCount, 1); // still 1 user, not duplicated!

    const r3 = await request("POST", `/comments/${commentId}/reaction`, {
      token: acc1.token,
      body: { type: "love" },
    });
    assert.equal(r3.status, 200);
    assert.equal(r3.data.liked, false);
    assert.equal(r3.data.likesCount, 0);

    // Fetch paginated comments & replies
    const listRes = await request("GET", `/comments/${pid}?sort=newest`, { token: acc1.token });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.data.comments.some((c) => c._id === commentId));

    const repliesList = await request("GET", `/comments/${pid}/${commentId}/replies`, { token: acc1.token });
    assert.equal(repliesList.status, 200);
    assert.ok(repliesList.data.replies.some((r) => r._id === replyId));

    // acc3 deletes own reply; acc1 (post owner) deletes acc2's comment
    const delReply = await request("DELETE", `/comments/${replyId}`, { token: acc3.token });
    assert.equal(delReply.status, 200);

    const ownerDel = await request("DELETE", `/comments/${commentId}`, { token: acc1.token });
    assert.equal(ownerDel.status, 200);
  });

  it("enforces comment settings (disable/hide), share restrictions, bookmarks, and block rules", async () => {
    const pid = String(publicPost._id);

    // acc1 disables comments
    const disableRes = await request("PATCH", `/posts/${pid}`, {
      token: acc1.token,
      body: { commentsDisabled: true },
    });
    assert.equal(disableRes.status, 200);
    assert.equal(disableRes.data.post.commentsDisabled, true);

    const blockedComment = await request("POST", `/comments/${pid}`, {
      token: acc2.token,
      body: { content: "Should be rejected" },
    });
    assert.equal(blockedComment.status, 403);

    // Re-enable comments
    await request("PATCH", `/posts/${pid}`, {
      token: acc1.token,
      body: { commentsDisabled: false },
    });

    // Share public post increments sharesCount; private post returns 404/403
    const shareRes = await request("POST", `/posts/${pid}/share`, { token: acc2.token });
    assert.equal(shareRes.status, 200);
    assert.equal(shareRes.data.sharesCount, 1);

    const privShare = await request("POST", `/posts/${privatePost._id}/share`, { token: acc2.token });
    assert.equal(privShare.status, 404);

    // Bookmark save & unsave
    const save1 = await request("POST", `/posts/${pid}/bookmark`, { token: acc2.token });
    assert.equal(save1.status, 200);
    assert.equal(save1.data.isSaved, true);

    const save2 = await request("POST", `/posts/${pid}/bookmark`, { token: acc2.token });
    assert.equal(save2.status, 200);
    assert.equal(save2.data.isSaved, false);

    // Block enforcement: acc1 blocks acc2 -> acc2 can no longer like or comment on acc1's post
    await Block.create({ blockerId: acc1.user._id, blockedId: acc2.user._id });
    const blockedLike = await request("POST", `/likes/${pid}`, { token: acc2.token });
    assert.equal(blockedLike.status, 404);
  });
});
