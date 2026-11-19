const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const notificationController = require("./notification.controller");

router.get("/", authMiddleware, notificationController.listNotifications);
router.get("/unread-count", authMiddleware, notificationController.unreadCount);
router.patch("/read-all", authMiddleware, notificationController.readAll);

module.exports = router;