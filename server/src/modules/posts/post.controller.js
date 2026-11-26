const postService = require("./post.service");

const createPost = async (req, res, next) => {
  try {
    const authorId = req.user._id || req.user.id;
    const { content, media, tags, location } = req.body;
    const post = await postService.createPost({ authorId, content, media, tags, location });
    res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const getPost = async (req, res, next) => {
  try {
    const result = await postService.getPostById(
      req.params.postId,
      req.user?._id || req.user?.id
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { content, media, tags, location } = req.body;
    const post = await postService.updatePost({
      postId: req.params.postId,
      userId,
      content,
      media,
      tags,
      location,
    });
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    await postService.deletePost({ postId: req.params.postId, userId });
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    next(err);
  }
};

const getUserPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const posts = await postService.getPostsByUser(
      req.params.userId,
      page,
      20,
      req.user?._id || req.user?.id
    );
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPost,
  getPost,
  updatePost,
  deletePost,
  getUserPosts,
};