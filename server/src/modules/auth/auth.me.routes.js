
const express = require("express");
const authenticate = require("../../middleware/auth.middleware");
const store = require("../../config/store");

const router = express.Router();

router.get("/me", authenticate, (req, res) => {
  const fullUser =
    store.findUser(req.user.id || req.user._id || req.user.username) || req.user;
  res.status(200).json({
    success: true,
    user: fullUser,
    data: {
      user: fullUser,
    },
  });
});

module.exports = router;
