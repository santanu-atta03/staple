const userService = require("./user.service");

const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const result = await userService.getProfileByUsername(username);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await userService.updateUserProfile(userId, req.body);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateMe };