const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const feedController = require("./feed.controller");

router.get("/", authMiddleware, feedController.getFeed);

module.exports = router;