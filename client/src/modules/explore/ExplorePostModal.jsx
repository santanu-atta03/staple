import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Check,
  Play,
  Pause,
  Sparkles,
} from "lucide-react";

export default function ExplorePostModal({
  isOpen,
  post,
  onClose,
  onToggleLike,
  onToggleBookmark,
  onAddComment,
  onToggleFollow,
  currentUser,
}) {
  const [commentText, setCommentText] = useState("");
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [flyingHeart, setFlyingHeart] = useState(false);
  const commentInputRef = useRef(null);

  if (!isOpen || !post) return null;

  const author = post.authorId || {};
  const media = post.media && post.media.length > 0 ? post.media[0] : null;
  const isVideo = post.isReel || (media && media.type === "video");

  const handleMediaDoubleClick = (e) => {
    e.stopPropagation();
    setFlyingHeart(true);
    setTimeout(() => setFlyingHeart(false), 850);
    if (!post.isLiked) {
      onToggleLike(post._id);
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post._id, commentText.trim());
    setCommentText("");
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.origin + "/post/" + post._id);
    const toast = document.createElement("div");
    toast.innerText = "Link copied to clipboard!";
    toast.className =
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/90 px-4 py-2 text-[12px] font-semibold text-white shadow-xl backdrop-blur animate-fade-in";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 md:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[92vh] md:h-[640px] overflow-hidden rounded-[28px] border border-[#ece8de]/50 bg-white shadow-2xl text-[#18181b] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button on Desktop Floating */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition backdrop-blur-xs md:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT COLUMN: Media Container with Double-Click Like */}
        <div
          onDoubleClick={handleMediaDoubleClick}
          className="group relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none min-h-[300px] md:min-h-full cursor-pointer"
        >
          {media?.url ? (
            <img
              src={media.url}
              alt={post.title || "Explore Visual"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-neutral-400">
              <Sparkles className="h-10 w-10 text-neutral-600 mb-2" />
              <p className="text-[13px]">Visual asset preview</p>
            </div>
          )}

          {/* Double-Click Flying Heart Overlay */}
          {flyingHeart && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="animate-heart-pop-fly text-7xl select-none filter drop-shadow-[0_10px_28px_rgba(239,68,68,0.8)]">
                ❤️
              </div>
            </div>
          )}

          {/* Top badges / Pill tags */}
          {post.pillTags && post.pillTags.length > 0 && (
            <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5 z-20 pointer-events-none">
              {post.pillTags.map((pt, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-black/55 px-2.5 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-md shadow-2xs"
                >
                  {pt}
                </span>
              ))}
            </div>
          )}

          {/* Reel Indicator in top right */}
          {isVideo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlayingVideo(!isPlayingVideo);
              }}
              className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black transition"
            >
              {isPlayingVideo ? (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              ) : (
                <Pause className="h-4 w-4 fill-current" />
              )}
            </button>
          )}

          {/* Views count badge in bottom left */}
          {post.views && (
            <div className="absolute bottom-3.5 left-3.5 z-20 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
              <Play className="h-3 w-3 fill-current" />
              <span>{post.views} views</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Author, Caption, Comments, and Engagement */}
        <div className="flex flex-col w-full md:w-[380px] lg:w-[410px] bg-[#fbf9f4] border-t md:border-t-0 md:border-l border-[#ece8de]">
          {/* Header Row: Author + Follow + Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-[#ece8de] bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={author.avatar || "/default-avatar.svg"}
                alt={author.name || author.username || ""}
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.svg";
                }}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 leading-tight">
                  <Link
                    to={author.username ? `/u/${author.username}` : "#"}
                    className="truncate text-[13.5px] font-semibold text-[#18181b] hover:underline"
                  >
                    {author.name || author.username || ""}
                  </Link>
                  {author.isVerified && (
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                      <Check className="h-2 w-2 stroke-[3]" />
                    </span>
                  )}
                </div>
                {post.location && (
                  <span className="block truncate text-[11px] text-[#71717a]">
                    {post.location}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {String(author._id || "") !==
                String(currentUser?._id || currentUser?.id || "") && (
                <button
                  type="button"
                  onClick={() => onToggleFollow(author._id)}
                  className={`rounded-full px-3.5 py-1 text-[11.5px] font-semibold transition active:scale-95 ${
                    author.isFollowing
                      ? "bg-[#edeae3] text-[#18181b]"
                      : "bg-black text-white hover:bg-neutral-800"
                  }`}
                >
                  {author.isFollowing ? "Following" : "Follow"}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="hidden md:flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-[#edeae3] hover:text-black transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Caption & Comments Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-[13px] no-scrollbar">
            {/* Caption by Author */}
            <div className="flex items-start gap-3 pb-3 border-b border-[#ece8de]/60">
              <img
                src={author.avatar || "/default-avatar.svg"}
                alt={author.name || author.username || ""}
                className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="space-y-1">
                <p className="leading-relaxed text-[#27272a]">
                  <span className="font-semibold text-[#18181b] mr-1.5">
                    {author.username || "creator"}
                  </span>
                  {post.caption || post.title}
                </p>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {post.tags.map((tag, idx) => (
                      <span key={idx} className="text-[12px] font-medium text-[#1863dc]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <span className="block text-[11px] text-[#8e8e93] pt-1">
                  {post.time || ""}
                </span>
              </div>
            </div>

            {/* Comments Stream */}
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comm) => (
                <div key={comm._id} className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <img
                      src={comm.author?.avatar || "/default-avatar.svg"}
                      alt={comm.author?.name || comm.author?.username || ""}
                      onError={(event) => {
                        event.currentTarget.src = "/default-avatar.svg";
                      }}
                      className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="leading-snug text-[#27272a] text-[12.5px]">
                        <span className="font-semibold text-[#18181b] mr-1.5">
                          {comm.author?.username || comm.author?.name || ""}
                        </span>
                        {comm.content}
                      </p>
                      <span className="text-[10.5px] text-[#8e8e93]">
                        {comm.createdAt || ""}
                      </span>
                    </div>
                  </div>

                  {/* Threaded Replies if any */}
                  {comm.replies && comm.replies.length > 0 && (
                    <div className="ml-8 space-y-1.5 border-l-2 border-[#ece8de] pl-2.5">
                      {comm.replies.map((reply, rIdx) => (
                        <div key={reply._id || rIdx} className="text-[12px]">
                          <span className="font-semibold text-black">
                            {reply.author?.name || reply.author?.username || ""}
                          </span>{" "}
                          <span className="text-neutral-700">{reply.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-neutral-400 text-[12px]">
                <p>No comments yet.</p>
                <p className="mt-0.5 text-neutral-500">Be the first to share your thoughts!</p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="p-3.5 border-t border-[#ece8de] bg-white space-y-2">
            <div className="flex items-center justify-between text-[#3f3f46]">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onToggleLike(post._id)}
                  className="flex items-center gap-1.5 transition active:scale-90"
                >
                  <Heart
                    className={`h-5 w-5 transition-transform ${
                      post.isLiked
                        ? "fill-[#ef4444] text-[#ef4444] scale-110"
                        : "text-[#3f3f46] hover:text-black"
                    }`}
                  />
                  <span className="text-[12.5px] font-semibold text-[#18181b]">
                    {post.likesCount?.toLocaleString() || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => commentInputRef.current?.focus()}
                  className="flex items-center gap-1.5 transition hover:text-black active:scale-90"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-[12.5px] font-medium">
                    {post.commentsCount || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="transition hover:text-black active:scale-90"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleBookmark(post._id)}
                className="transition active:scale-90"
              >
                <Bookmark
                  className={`h-5 w-5 ${
                    post.isSaved
                      ? "fill-black text-black"
                      : "text-[#3f3f46] hover:text-black"
                  }`}
                />
              </button>
            </div>

            {/* Comment Input Box */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1">
              <img
                src={
                  currentUser?.avatar ||
                  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(currentUser?.username || "user")}`
                }
                alt={currentUser?.name || currentUser?.username || "Curator"}
                className="h-6 w-6 rounded-full object-cover shrink-0"
              />
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-[#f2efe9] rounded-full px-3.5 py-1.5 text-[12.5px] outline-none text-[#18181b] placeholder-[#8e8e93] focus:ring-1 focus:ring-black"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="text-[12.5px] font-semibold text-[#1863dc] disabled:opacity-40 hover:underline px-1"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
