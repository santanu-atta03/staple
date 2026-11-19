import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { fetchHomeFeed } from "./feed.api";
import PostComposer from "./PostComposer";
import PostCard from "./PostCard";

export default function FeedPage() {
  const { hasNewPosts, setHasNewPosts } = useSocket();

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadInitialFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHomeFeed(1, 20);
      setPosts(data);
      setPage(1);
      setHasMore(data.length === 20);
      setHasNewPosts(false);
    } finally {
      setLoading(false);
    }
  }, [setHasNewPosts]);

  useEffect(() => {
    loadInitialFeed();
  }, [loadInitialFeed]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const morePosts = await fetchHomeFeed(nextPage, 20);
      setPosts((prev) => [...prev, ...morePosts]);
      setPage(nextPage);
      setHasMore(morePosts.length === 20);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-800/70 bg-neutral-950/85 px-4 py-3.5 backdrop-blur sm:px-6">
        <h1 className="text-base font-semibold text-white">Home</h1>
      </header>

      {/* Post Composer */}
      <PostComposer
        onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
      />

      {/* Live Socket.io New Posts Pill */}
      {hasNewPosts && (
        <div className="sticky top-14 z-20 flex justify-center py-2.5">
          <button
            onClick={loadInitialFeed}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950 shadow-lg transition hover:bg-neutral-200"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            New posts available
          </button>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-neutral-500">
          Your feed is quiet. Follow people or publish your first post above.
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDeleted={(deletedId) =>
                setPosts((prev) => prev.filter((p) => p._id !== deletedId))
              }
            />
          ))}

          {hasMore && (
            <div className="py-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load older posts"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}