# Staple Implementation Tracker (`IMPLEMENTATION_TRACKER.md`)

**Allowed Statuses:** `Not started` | `In progress` | `Implemented` | `Tested` | `Verified`

| # | Feature / Fix | Area | Priority | Status | Target Files |
|---|---|---|---|---|---|
| 1 | Registration, Email OTP & Login (Confirm Password, Remember Me, Success Screen) | Auth | Critical | Verified | `server/src/modules/auth/*`, `client/src/modules/auth/*`, `server/tests/auth.test.js` |
| 2 | Session Refresh, Active Sessions, Logout All, Deactivate/Reactivate & Delete Account | Auth | Critical | Verified | `client/src/api/axios.js`, `server/src/modules/auth/*`, `server/src/routes/settings.routes.js` |
| 3 | Follow / Unfollow System, Mutual Followers & Suggested Accounts | Social Graph | Critical | Verified | `server/src/modules/users/user.controller.js`, `server/tests/follow.test.js` |
| 4 | Followers & Following Lists (Paginated, Remove Follower, Privacy Enforced) | Profile | Critical | Verified | `server/src/modules/users/user.controller.js`, `client/src/modules/users/FollowersModal.jsx`, `server/tests/profile.test.js` |
| 5 | Messaging Alignment, Persistence & Sent Visibility | Messaging | Critical | Verified | `client/src/modules/messages/MessagePage.jsx`, `server/src/routes/message.routes.js` |
| 6 | Notes Visibility & Expiration | Messaging | High | Implemented | `server/src/routes/message.routes.js`, `server/src/config/store.js`, `client/src/modules/messages/MessagePage.jsx` |
| 7 | Story Viewer Pause/Resume & Staple Story Ring | Stories | High | Implemented | `client/src/modules/Home/StoryViewerModal.jsx`, `client/src/modules/Home/HomePage.jsx` |
| 8 | Search & User Discovery (Including Followed Users) | Discovery | High | Verified | `server/src/routes/home.routes.js`, `server/src/routes/message.routes.js`, `client/src/modules/messages/NewMessageModal.jsx` |
| 9 | Migrate Conversations, Messages & Notes to MongoDB | Database | Critical | Not started | `server/src/modules/messages/*`, `server/src/routes/message.routes.js` |
| 10 | Migrate Stories to MongoDB (with 24h TTL Index) | Database | High | Not started | `server/src/modules/stories/*`, `server/src/routes/home.routes.js` |
| 11 | Migrate Home Feed, Posts & Bookmarks to MongoDB (`feed.service.js`) | Database | Critical | Verified | `server/src/routes/home.routes.js`, `server/src/modules/feed/*`, `server/src/modules/likes/like.service.js`, `client/src/modules/Home/HomePage.jsx`, `server/tests/feed.test.js` |
| 12 | Migrate Notifications to MongoDB `Notification` Model | Database | High | Not started | `server/src/modules/notifications/*` |
| 13 | Private Accounts & Follow Request Send/Cancel/Accept/Reject Flow | Privacy | High | Verified | `server/src/modules/follows/follow-request.model.js`, `server/src/modules/users/user.controller.js`, `client/src/modules/notifications/NotificationPage.jsx` |
| 14 | Sync `SettingsPage` Privacy/Account/Avatar Changes to MongoDB `User` | Settings | High | Verified | `server/src/routes/settings.routes.js`, `client/src/modules/settings/settings.api.js`, `client/src/modules/users/EditProfileModal.jsx` |
| 15 | MongoDB-Enforced User Blocking & Reporting (`Block`, `Report` Models) | Safety | High | Verified | `server/src/modules/users/block.model.js`, `server/src/modules/users/report.model.js`, `user.controller.js`, `post.service.js` |
| 16 | Posts & Media Management (Magic-Byte Validation, Drafts, Archive/Restore, Tagging) | Content | Critical | Verified | `server/src/modules/posts/*`, `server/src/middleware/upload.middleware.js`, `client/src/components/GlobalPostModal.jsx`, `server/tests/posts.test.js` |
| 17 | User Mentions (`@username`), Hashtags (`#tag`) & Engagement System (Likes List, Replies, Reactions, Comment Controls) | Content | High | Verified | `server/src/modules/likes/*`, `server/src/modules/comments/*`, `client/src/components/RichText.jsx`, `client/src/components/LikesModal.jsx`, `server/tests/engagement.test.js` |
| 18 | In-App Post Sharing to Direct Messages | Messaging | Medium | Not started | `client/src/modules/feed/PostCard.jsx`, `client/src/modules/messages/MessagePage.jsx` |
| 19 | Remove Legacy `sendFriendRequestApi` Import in `ExplorePage` & Static Badges in `SettingsPage` | Cleanup | Low | Not started | `client/src/modules/explore/ExplorePage.jsx`, `client/src/modules/settings/SettingsPage.jsx` |
| 20 | Security & Performance Hardening (CORS Allowlist, Scoped `notes:updated`, Route Code Splitting) | Infra | Medium | Not started | `server/src/app.js`, `server/src/routes/message.routes.js`, `client/src/App.jsx` |
