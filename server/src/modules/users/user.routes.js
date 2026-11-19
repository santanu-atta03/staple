const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const userController = require("./user.controller");

router.get("/:username", userController.getProfile);
router.patch("/me", authMiddleware, userController.updateMe);

module.exports = router;