
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../modules/users/user.model");
const Post = require("../modules/posts/post.model");

async function benchmark() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB");

    // Create a sample user
    const user = await User.create({
      username: `benchmark_${Date.now()}`,
      email: `benchmark_${Date.now()}@example.com`,
      passwordHash: "dummy_hash",
    });

    const posts = [];

    // Generate 10,000 posts
    for (let i = 0; i < 10000; i++) {
      posts.push({
        authorId: user._id,
        content: `Benchmark post ${i}`,
        createdAt: new Date(Date.now() - i * 1000),
      });
    }

    await Post.insertMany(posts);

    console.log("10,000 posts inserted");

    // Benchmark query
    const start = performance.now();

    const result = await Post.find({
      authorId: user._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(20)
      .lean();

    const end = performance.now();

    console.log("Retrieved:", result.length);
    console.log("Query time:", (end - start).toFixed(2), "ms");

    // Inspect execution plan
    const explain = await Post.find({
      authorId: user._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(20)
      .explain("executionStats");

    console.dir(explain.executionStats, { depth: 5 });

    // Cleanup sample data
    await Post.deleteMany({ authorId: user._id });
    await User.deleteOne({ _id: user._id });

    console.log("Benchmark completed and sample data removed");

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

benchmark();
