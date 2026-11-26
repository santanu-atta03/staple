const router = require("express").Router();
const notificationController = require("./notification.controller");
const authenticate = require("../../middleware/auth.middleware");

router.use(authenticate.optionalAuthenticate || authenticate);

// Main Notifications Feed
router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.unreadCount);
router.patch("/read-all", notificationController.readAll);
router.patch("/:id/read", notificationController.markSingleRead);
router.delete("/:id", notificationController.deleteNotification);

// Interactive Actions
router.post("/:id/reply", notificationController.replyComment);
router.post("/:id/like", notificationController.toggleLikeComment);
router.post("/:id/action", notificationController.respondFriendRequest);

// Right Sidebar Widgets
router.get("/sidebar", notificationController.getSidebar);
router.post("/sidebar/friend-requests/:id/:action", notificationController.respondSidebarFriendRequest);
router.post("/sidebar/birthdays/:id/wish", notificationController.toggleWishBirthday);
router.post("/sidebar/suggested/:id/toggle", notificationController.toggleSuggestedFriend);

module.exports = router;
