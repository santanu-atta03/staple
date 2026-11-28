# Staple Social Media Platform — Technical Audit (`PROJECT_AUDIT.md`)

**Stack:** MongoDB + Mongoose 9, Express 5, React 19 + Vite 8 + Tailwind CSS 4, Node.js, Socket.IO 4, Redis / BullMQ (with in-memory fallback), Cloudinary / Multer.

---

## 1. Existing Project Architecture

### Backend (`server/src/`)
- **Entrypoint & HTTP/WS Server:** `server.js` loads `.env`, validates `JWT_ACCESS_SECRET` (>= 32 bytes), starts `httpServer` on `PORT` (default `5055`), initializes Socket.IO (`config/socket.js`), and connects MongoDB (`config/database.js`) and Redis (`config/redis.js`) asynchronously in the background.
- **Express App (`app.js`):** Configures `helmet`, `cors({ origin: true, credentials: true })`, `cookie-parser`, `express.json({ limit: "10mb" })`, static `/uploads` serving, modular API routes mounted under both `/api/v1/*` and `/api/*`, legacy root-scoped `routes/home.routes.js`, and centralized `middleware/error.middleware.js`.
- **Modular Domain Modules (`modules/`):**
  - `auth/`: `auth.routes.js`, `auth.me.routes.js`, `auth.controller.js`, `auth.service.js`, `otp.service.js`, `oauth.service.js`, `auth.validation.js`, `session.model.js`, `registration-challenge.model.js`.
  - `users/`: `user.routes.js`, `user.controller.js`, `user.service.js`, `user.model.js`.
  - `posts/`: `post.routes.js`, `post.controller.js`, `post.service.js`, `post.model.js`.
  - `follows/`: `follow.routes.js`, `follow.controller.js`, `follow.service.js`, `follow.model.js`.
  - `likes/`: `like.routes.js`, `like.controller.js`, `like.service.js`, `like.model.js`.
  - `comments/`: `comment.routes.js`, `comment.controller.js`, `comment.service.js`, `comment.model.js`.
  - `bookmarks/`: `bookmark.model.js`.
  - `feed/`: `feed.routes.js`, `feed.controller.js`, `feed.service.js`, `feed.model.js`.
  - `notifications/`: `notification.routes.js`, `notification.controller.js`, `notification.service.js`, `notification.model.js`.
- **Legacy / Hybrid Routes & JSON Persistence (`routes/` & `config/store.js`):**
  - `routes/home.routes.js`, `routes/explore.routes.js`, `routes/message.routes.js`, `routes/settings.routes.js`, `routes/upload.routes.js`, `routes/health.routes.js`.
  - `config/store.js` (`PersistentStore`) reads/writes `server/data/db.json` synchronously for stories, direct messages, conversations, notes, groups, settings, and notification items.

### Frontend (`client/src/`)
- **Entry & Providers (`main.jsx`, `App.jsx`):** React Router v7 with `AuthContext` (`context/AuthContext.jsx`), `SocketContext` (`context/SocketContext.jsx`), `ProtectedRoute`, and `AppLayout` (`components/AppLayout.jsx`).
- **API Client (`api/axios.js`):** Axios instance (`/api/v1`, `withCredentials: true`) with Bearer token injection, `authGeneration` abort tracking on account switch/logout, single-flight refresh token queue (`/auth/refresh`), and `staple:session_expired` dispatch.
- **Feature Modules (`modules/`):** `auth`, `Home`, `explore`, `feed`, `messages`, `notifications`, `bookmarks`, `posts`, `users`, `settings`.

---

## 2. Feature Audit Matrix

| Feature | Status | Persistence | Notes |
|---|---|---|---|
| Registration & Email OTP | **Verified** | MongoDB | `RegistrationChallenge` + Argon2id + Nodemailer OTP with TTL, cooldown, attempt limit, confirm password, and success view. |
| Login / Refresh / Logout / OAuth | **Verified** | MongoDB + HttpOnly Cookie | Email/username login, `rememberMe` session TTL, sparse `refreshTokenHash` index rotation, active sessions, deactivate/reactivate, and permanent account deletion. |
| User Profiles & Profile Editing | **Verified** | MongoDB + `store.js` | `User` model + `ProfilePage.jsx` + `EditProfileModal` (username availability check, avatar/cover upload, privacy toggle) + `ProfilePhotoModal`. |
| Follow & Unfollow | **Verified** | MongoDB + `store.js` | Atomic `Follow` updates, self-follow & block guards, live Socket.IO `follow:updated`, mutual followers preview, and suggested accounts. |
| Followers & Following Lists | **Verified** | MongoDB | Paginated `/users/:username/followers` & `/following`, remove follower, profile navigation, privacy enforcement. |
| Private Accounts & Follow Requests | **Verified** | MongoDB (`FollowRequest`) | Send/cancel/accept/reject follow requests, incoming & sent request lists, `403` enforcement on private posts/lists. |
| Posts & Media Uploads | **Verified (MongoDB)** | MongoDB (`Post`) + Cloudinary/Disk | Magic-byte MIME validation, multi-image/video upload with progress & cancellation, drafts, archive/restore, taggedUsers, mentions, hashtags, visibility. |
| Home Feed | **Verified (MongoDB)** | MongoDB (`feed.service.js` + `home.routes.js`) | `following`, `recommended`, and `for-you` tabs, explainable ranking (follow, recency, engagement, hashtag & creator affinity), privacy/block/draft/archive/delete filtering, infinite scroll pagination, and `feed.test.js` (4-account suite). |
| Likes, Comments & Replies | **Verified (MongoDB)** | MongoDB (`Like`, `Comment`, `Post`) | `like.service.js`, `comment.controller.js`, `explore.routes.js`, `post.routes.js`, and `home.routes.js` persist likes, comments, and counts directly to MongoDB with `feed.test.js` coverage. |
| Post Sharing | **Partially Working** | Frontend clipboard / URL | Share copies link; in-app "Share post to DM" is not wired to a post-card attachment in `MessagePage`. |
| Saved Posts (Bookmarks) | **Verified (MongoDB)** | MongoDB (`Bookmark`) | `explore.routes.js` and `home.routes.js` (`/posts/:postId/bookmark` & `/bookmarks`) persist and hydrate bookmarks from MongoDB. |
| Search & User Discovery | **Working** | MongoDB + `store.js` | `/search/people` & `/messages/people` query MongoDB `User` + `Follow`, include already-followed users. |
| Explore | **Working** | MongoDB (`explore.routes.js`) | Public posts, category/view/sort filters, likes, bookmarks, comments. |
| Notifications | **Partially Working** | `store.js` (`db.json`) | Live Socket.IO badge & follow notifications work, but `Notification` Mongoose model is unused (`store.js` is used instead). |
| Direct Messaging & Real-Time Chat | **Partially Working** | `store.js` (`db.json`) + Socket.IO | Sender alignment, persistence across refresh, and Socket.IO work, but stored in `db.json` rather than MongoDB. |
| Notes (in Messages) | **Partially Working** | `store.js` (`db.json`) + Socket.IO | Visible to followers/following/chat partners with 24h TTL, but stored in `db.json`, not MongoDB. |
| Stories | **Partially Working** | `store.js` (`db.json`) | Pause/resume, video sync, and original Staple ring work, but stories are in `db.json` instead of MongoDB (with TTL index). |
| Reels | **Partially Working** | Filter on video posts | Video posts filter as `reels` in Explore/Profile, but no dedicated Reels vertical feed or view-count tracking exists. |
| Hashtags | **Partially Working** | `Post.tags` / `store.js` | Tags are extracted and shown in Trending/Explore, but clicking a hashtag does not open a dedicated `#tag` feed view. |
| User Mentions & Tagging | **Missing / Stubbed** | None | `@mention` parsing, autocomplete, and tagged-posts persistence (`tab=tagged` on Profile) are not backed by DB schemas/queries. |
| Blocking & Reporting | **Partially Working / Missing** | `store.js` (block only) | Block exists in `store.js` settings/chat, but is not enforced across MongoDB `Post`, `Feed`, `Explore`, `Profile`, or `Search`. Reporting has no DB model/endpoint. |
| Privacy & Account Settings | **Partially Working** | `store.js` (`db.json`) | Settings UI is rich, but `SettingsPage.jsx` persists mostly to `store.js` rather than MongoDB `User` (e.g. `isPrivate` sync). |
| Admin Dashboard | **Missing** | None | No `role`/`isAdmin` field, no admin middleware, no moderation routes, and no frontend admin UI. |

---

## 3. Detailed Findings by Category

### A. Backend & Database Problems (Critical / High)

1. **Split-Brain Persistence: MongoDB vs. `server/data/db.json` (`store.js`)**
   - **Files:** `server/src/config/store.js`, `server/src/routes/home.routes.js`, `server/src/routes/message.routes.js`, `server/src/routes/settings.routes.js`, `server/src/modules/notifications/notification.controller.js`.
   - **Problem:** Core features (Messages, Conversations, Notes, Stories, Notifications, Home Feed posts, Bookmarks, Settings) still read/write `db.json` synchronously via `fs.writeFileSync`, while Auth, Users, Follows, Explore, and `post.routes.js` use MongoDB.
   - **Root Cause:** Legacy JSON prototype store was kept as a fallback and remains wired to `/api/v1/feed`, `/api/v1/stories`, `/api/v1/messages/*`, `/api/v1/notifications/*`, and `/api/v1/settings/*`.
   - **Recommended Solution:** Create Mongoose schemas for `Conversation`, `Message`, `Note`, `Story`, `FollowRequest`, `Report`, and `UserSettings`, and migrate those routes/controllers to MongoDB while keeping `store.js` only if MongoDB is disconnected.
   - **Priority:** **Critical**

2. **Home Feed & Bookmarks Bypass MongoDB Models**
   - **Files:** `server/src/routes/home.routes.js`, `client/src/modules/Home/home.api.js`, `server/src/modules/feed/feed.service.js`, `server/src/modules/bookmarks/bookmark.model.js`.
   - **Problem:** `HomePage.jsx` and `BookmarksPage.jsx` call `/api/v1/feed` and `/api/v1/bookmarks` handled by `home.routes.js` (`store.js`), whereas `explore.routes.js` and `user.controller.js` (`tab=saved`) use MongoDB `Post` and `Bookmark`. Bookmarking a post in Explore does not appear on `BookmarksPage` if `BookmarksPage` reads `store.js`, and vice versa.
   - **Recommended Solution:** Unify `home.routes.js` `/feed`, `/posts`, `/bookmarks` with MongoDB `Post`, `Like`, `Comment`, `Bookmark`, and `feed.service.js`.
   - **Priority:** **Critical**

3. **Private Accounts Lack Follow-Request Workflow**
   - **Files:** `server/src/modules/users/user.model.js`, `server/src/modules/users/user.controller.js`, `client/src/modules/users/ProfilePage.jsx`.
   - **Problem:** Setting `isPrivate: true` causes `getProfile` and `toggleFollow` to return `404 User not found` to non-followers instead of showing a private profile header with a **Request to Follow** button and an approve/decline queue.
   - **Recommended Solution:** Add a `FollowRequest` Mongoose model (`requesterId`, `targetId`, `status`), return limited public metadata for private profiles (`isPrivate: true`, `hasPendingRequest`), and add approve/decline endpoints + notification cards.
   - **Priority:** **High**

4. **Blocking Is Not Enforced Across MongoDB Queries**
   - **Files:** `server/src/routes/settings.routes.js`, `server/src/modules/posts/post.service.js`, `server/src/routes/explore.routes.js`, `server/src/modules/users/user.controller.js`.
   - **Problem:** Blocking a user only updates `store.js` settings/conversation `blockedFor` arrays; blocked users can still view MongoDB profiles, posts, Explore items, and search results.
   - **Recommended Solution:** Store `Block` relationships in MongoDB (`blockerId`, `blockedId`, unique compound index) and filter blocked IDs out of profiles, search, feed, explore, comments, and messaging.
   - **Priority:** **High**

5. **Missing `Report` Schema & Moderation / Admin System**
   - **Files:** `server/src/modules/users/user.model.js`, `server/src/app.js`.
   - **Problem:** No `Report` model, no post/user/comment report endpoints, no `role` (`user`/`admin`) on `User`, and no Admin Dashboard.
   - **Recommended Solution:** Add `role` to `User`, create `Report` schema + `/api/v1/reports` + `/api/v1/admin/*` endpoints guarded by `requireAdmin` middleware, and build an Admin Dashboard page.
   - **Priority:** **Medium**

6. **Synchronous File I/O Bottleneck in `store.js`**
   - **Files:** `server/src/config/store.js`.
   - **Problem:** `saveData()` runs `fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2))` on every write, blocking the Node.js event loop as data grows.
   - **Recommended Solution:** Migrating high-churn collections (messages, notifications, posts, stories) to MongoDB eliminates this bottleneck.
   - **Priority:** **High**

### B. Frontend & UI/UX Problems

7. **Residual Friend-Request Import in `ExplorePage.jsx`**
   - **Files:** `client/src/modules/explore/ExplorePage.jsx` (line 36).
   - **Problem:** Imports `sendFriendRequestApi` from `../Home/home.api`.
   - **Recommended Solution:** Replace with `toggleFollowUser` from `../users/profile.api`.
   - **Priority:** **Medium**

8. **Hardcoded Badges/Counts in `SettingsPage.jsx`**
   - **Files:** `client/src/modules/settings/SettingsPage.jsx` (lines 73, 76).
   - **Problem:** `notifications` section has hardcoded `badge: 4` and `friends` has hardcoded `count: 12`.
   - **Recommended Solution:** Derive counts dynamically from live socket/settings state or omit static numbers.
   - **Priority:** **Low**

9. **Privacy Toggle Sync Between `SettingsPage` and MongoDB `User.isPrivate`**
   - **Files:** `server/src/routes/settings.routes.js`, `client/src/modules/settings/SettingsPage.jsx`.
   - **Problem:** Toggling private account in settings updates `store.js` settings, not necessarily MongoDB `User.isPrivate`.
   - **Recommended Solution:** Sync `isPrivate` directly to `User.findByIdAndUpdate` in MongoDB.
   - **Priority:** **High**

10. **Mentions, Hashtag Pages, & Tagged Posts Tab**
    - **Files:** `client/src/modules/users/ProfilePage.jsx`, `server/src/modules/users/user.controller.js`.
    - **Problem:** Clicking `#tags` doesn't open a dedicated tag feed; `@mentions` aren't linked/notified; Profile `tagged` tab returns empty.
    - **Recommended Solution:** Parse `@mentions` and `#hashtags` on post/comment creation, store `mentions` on `Post`, emit `MENTION` notifications, and implement `tab=tagged` query.
    - **Priority:** **Medium**

### C. Security & Performance Problems

11. **CORS Wildcard Origin in `app.js`**
    - **Files:** `server/src/app.js` (line 31).
    - **Problem:** `cors({ origin: true, credentials: true })` reflects any `Origin` header with `credentials: true` (though `auth.controller.js` checks `isSameOrigin` on refresh/logout).
    - **Recommended Solution:** Restrict `origin` to an allowlist from `process.env.FRONTEND_URL` (plus localhost dev origins).
    - **Priority:** **Medium**

12. **Socket.IO `notes:updated` Global Broadcast**
    - **Files:** `server/src/routes/message.routes.js` (lines 32, 44).
    - **Problem:** `io.emit("notes:updated", { userId })` broadcasts to all connected sockets instead of only followers/conversation partners.
    - **Recommended Solution:** Emit only to `user:${id}` rooms of followers/connections.
    - **Priority:** **Medium**

13. **Large Client Bundle Warning (`747 kB`)**
    - **Files:** `client/src/App.jsx`.
    - **Problem:** All routes are statically imported, producing a single `~748 kB` JS chunk.
    - **Recommended Solution:** Use `React.lazy` + `Suspense` for route-level code splitting.
    - **Priority:** **Low**

### D. Recently Resolved Bugs & Upgrades (Verified)
- **Session Revocation `E11000` (`session.model.js`, `database.js`):** Added `sparse: true` on `refreshTokenHash` and `Session.syncIndexes()` so `logout-all` and multi-session revocation never fail with `409`.
- **Error Status Propagation (`error.middleware.js`):** Read `err.statusCode || err.status || 500` so service errors (`400`/`401`/`403`) return accurate HTTP codes.
- **Follow List Pagination (`follow.service.js`, `user.controller.js`):** Separated page size `limit` from `fetchLimit` (`limit + 1`) so `page >= 2` skips accurately.
- **BullMQ Hang on `MockRedis` (`social.queue.js`, `redis.js`):** Replaced blocking `new Queue(..., MockRedis)` with non-blocking in-memory queue and added `smembers`/`srem` to `MockRedis`.
- **Automated Test Coverage:** `npm --prefix server test` passes all **11/11 tests across 4 suites** (`auth.test.js`, `profile.test.js`, `follow.test.js`, `posts.test.js`), and `npm --prefix client run build` succeeds.

---

## 4. Recommended Implementation Order

1. **Phase 1 — Unified MongoDB Persistence for Core Social Data:** Migrate Messages/Conversations, Notes, Stories (with TTL), Notifications, and Home Feed/Bookmarks to Mongoose models & indexed queries so MongoDB is the single source of truth.
2. **Phase 2 — Privacy, Blocking, Private Accounts & Follow Requests:** Implement `FollowRequest` model + UI, sync `User.isPrivate` with `SettingsPage`, and enforce `Block` across all MongoDB queries.
3. **Phase 3 — Mentions, Hashtags, Tagged Posts, & In-App Post Sharing:** Add `@mention` parsing/notifications, clickable `#hashtag` feed filtering, `tab=tagged` on Profile, and sharing posts to DM.
4. **Phase 4 — Reporting & Admin Dashboard:** Add `Report` model, admin role/middleware, moderation APIs, and Admin Dashboard UI.
5. **Phase 5 — Hardening & Optimization:** Lock down CORS allowlist, scope Socket.IO `notes:updated` emissions, clean up residual `ExplorePage`/`SettingsPage` UI details, and add `React.lazy` route splitting.
