import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Sparkles,
  Search,
  ExternalLink,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { fetchBookmarks, toggleBookmark, togglePostLike } from "../Home/home.api";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadBookmarks = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemoveBookmark = async (postId) => {
    try {
      await toggleBookmark(postId);
      setBookmarks((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      console.error("Error removing bookmark:", err);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await togglePostLike(postId);
      setBookmarks((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount }
            : p
        )
      );
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const filteredBookmarks = bookmarks.filter((post) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchContent = post.content?.toLowerCase().includes(q);
      const matchAuthor = post.authorId?.name?.toLowerCase().includes(q) || post.authorId?.username?.toLowerCase().includes(q);
      if (!matchContent && !matchAuthor) return false;
    }
    if (filter === "media") return post.media && post.media.length > 0;
    if (filter === "text") return !post.media || post.media.length === 0;
    return true;
  });

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] pb-16">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-[#ece8de] bg-[#faf9f5]/95 pb-4 pt-2 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-bold tracking-tight text-[#1c1c1e] sm:text-[30px]">
                Bookmarks
              </h1>
              <span className="rounded-full bg-[#ece8de] px-2.5 py-0.5 text-[12px] font-semibold text-neutral-700">
                {bookmarks.length}
              </span>
            </div>
            <p className="text-[13.5px] text-[#71717a]">
              Saved articles, visual essays, and references for future inspection.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved..."
              className="w-full rounded-full border border-[#ece8de] bg-white py-1.5 pl-9 pr-4 text-[13.5px] placeholder-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex items-center gap-2">
          {[
            { id: "all", label: "All Saved" },
            { id: "media", label: "Media & Photos" },
            { id: "text", label: "Notes & Discussions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-3.5 py-1 text-[13px] font-medium transition ${
                filter === tab.id
                  ? "bg-black text-white shadow-2xs"
                  : "bg-white text-neutral-600 border border-[#ece8de] hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-neutral-500" />
            <p className="text-[14px]">Loading saved bookmarks...</p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-3xl border border-dashed border-[#e2ddd3] bg-white/60 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edeae3] text-neutral-600 mb-4">
              <Bookmark className="h-7 w-7 stroke-[1.8]" />
            </div>
            <h3 className="text-[17px] font-bold text-neutral-900">
              {search ? "No matching saved posts" : "No saved posts yet"}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#71717a]">
              {search
                ? `No bookmarks match "${search}". Try searching for another phrase or keyword.`
                : "Bookmark posts and essays from your Feed or Explore tab to organize them here."}
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-[13.5px] font-semibold text-white transition hover:bg-neutral-800"
            >
              <span>Explore Social Feed</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBookmarks.map((post) => (
              <div
                key={post._id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#ece8de] bg-white p-5 transition duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
              >
                <div>
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          post.authorId?.avatar ||
                          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(post.authorId?.username || "curator")}`
                        }
                        alt={post.authorId?.name || "Curator"}
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
                        onError={(e) => {
                          e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(post.authorId?.username || "curator")}`;
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-bold text-neutral-900">
                            {post.authorId?.name}
                          </span>
                          {post.authorId?.isVerified && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1c1c1e] text-[9px] text-white">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-neutral-500">
                          @{post.authorId?.username} • {post.time || "Recently"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveBookmark(post._id)}
                      title="Remove Bookmark"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <p className="mt-3 text-[14.5px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Media Preview if any */}
                  {post.media && post.media.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-black/5">
                      <img
                        src={post.media[0].url}
                        alt="Saved attachment"
                        className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-102"
                      />
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-[#faf9f5] border border-[#ece8de] px-2.5 py-0.5 text-[11.5px] font-medium text-neutral-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Engagement */}
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[12.5px] text-neutral-500">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`flex items-center gap-1.5 transition ${
                        post.isLiked ? "text-rose-600 font-medium" : "hover:text-black"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          post.isLiked ? "fill-rose-600 stroke-rose-600" : ""
                        }`}
                      />
                      <span>{post.likesCount || 0}</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.commentsCount || 0}</span>
                    </div>
                  </div>

                  <Link
                    to={`/`}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-700 hover:text-black hover:underline"
                  >
                    <span>View in Feed</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
