import { useState } from "react";
import { X, Heart, MessageCircle, Share2, Send } from "lucide-react";
import { createPostComment } from "../posts/post.api";
import { useAuth } from "../../context/AuthContext";

export default function PostViewerModal({
  isOpen,
  post,
  author,
  onClose,
  onToggleLike,
}) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post?.comments || []);
  const [isLiked, setIsLiked] = useState(post?.isLiked || false);
  const [likesCount, setLikesCount] = useState(
    typeof post?.likesCount === "number" ? post.likesCount : 0
  );
  const [showHeartPop, setShowHeartPop] = useState(false);
  const { user } = useAuth();

  if (!isOpen || !post) return null;

  const currentAuthor = post.authorId || author || {
    name: "",
    username: "",
    avatar: "/default-avatar.svg",
  };

  const handleDoubleClick = () => {
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 800);
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
      if (onToggleLike) onToggleLike(post.id);
    }
  };

  const handleLikeClick = () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount((prev) => Math.max(0, prev + (next ? 1 : -1)));
    if (onToggleLike) onToggleLike(post.id);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const newComm = await createPostComment(post._id || post.id, commentText.trim());
      setComments((prev) => [...prev, newComm]);
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col md:flex-row w-full max-w-[960px] h-[85vh] max-h-[700px] overflow-hidden rounded-[26px] bg-white shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Media Viewport */}
        <div
          onDoubleClick={handleDoubleClick}
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none group min-h-[300px]"
        >
          <img
            src={post.image || post.mediaUrl}
            alt={post.caption || "Post visual"}
            className="h-full w-full object-contain"
          />

          {/* Double Click Flying Heart */}
          {showHeartPop && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
              <div className="animate-heart-pop-fly text-7xl filter drop-shadow-[0_10px_25px_rgba(239,68,68,0.8)]">
                ❤️
              </div>
            </div>
          )}

          {/* Hint Overlay */}
          <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80 opacity-0 group-hover:opacity-100 transition backdrop-blur-xs">
            Double tap to like
          </div>
        </div>

        {/* Right: Post Details & Conversation */}
        <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-[#fbf9f4] border-t md:border-t-0 md:border-l border-[#ece8de]">
          {/* Author Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#ece8de]/70 bg-white">
            <div className="flex items-center gap-3">
              <img
                src={currentAuthor.avatar || "/default-avatar.svg"}
                alt={currentAuthor.name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
              />
              <div>
                <span className="text-[13.5px] font-bold text-[#18181b] block leading-tight">
                  {currentAuthor.name}
                </span>
                <span className="text-[11.5px] text-[#71717a] block">
                  {post.location || ""}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#edeae3] hover:text-black transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Comments and Caption Stream */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5 text-[13px]">
            {/* Caption Item */}
            <div className="flex items-start gap-3 pb-3 border-b border-[#ece8de]/50">
              <img
                src={currentAuthor.avatar || "/default-avatar.svg"}
                alt={currentAuthor.name}
                className="h-7 w-7 rounded-full object-cover mt-0.5"
              />
              <div className="flex-1">
                <span className="font-bold text-[#18181b] mr-1.5">
                  {currentAuthor.username || ""}
                </span>
                <span className="text-[#3f3f46] leading-relaxed">
                  {post.caption || post.content || ""}
                </span>
                <span className="block mt-1 text-[11px] text-[#a1a1aa]">
                  {post.time || "2d ago"}
                </span>
              </div>
            </div>

            {/* Comments List */}
            {comments.map((comm, idx) => (
              <div key={comm.id || idx} className="flex items-start gap-3">
                <img
                  src={comm.author?.avatar || "/default-avatar.svg"}
                  alt={comm.author?.name || ""}
                  className="h-7 w-7 rounded-full object-cover mt-0.5"
                />
                <div className="flex-1">
                  <span className="font-semibold text-[#18181b] mr-1.5">
                    {comm.author?.username || ""}
                  </span>
                  <span className="text-[#3f3f46]">{comm.text || comm.content}</span>
                  <span className="block mt-0.5 text-[10.5px] text-[#a1a1aa]">
                    {comm.time || "1h ago"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="p-3.5 border-t border-[#ece8de]/70 bg-white">
            <div className="flex items-center justify-between text-[#27272a]">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleLikeClick}
                  className="flex items-center gap-1.5 hover:text-black transition active:scale-90"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isLiked ? "fill-[#ef4444] text-[#ef4444]" : ""
                    }`}
                  />
                  <span className="text-[12.5px] font-semibold">{likesCount}</span>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 hover:text-black transition"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-[12.5px] font-medium">{comments.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                  }}
                  title="Copy Link"
                  className="hover:text-black transition"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
              </div>

              <span className="text-[11px] text-[#a1a1aa] font-medium">
              {post.time || ""}
              </span>
            </div>

            {/* Inline Comment Input */}
            <form onSubmit={handleAddComment} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-full bg-[#f2efe9] px-3.5 py-1.5 text-[12.5px] outline-none placeholder-[#a1a1aa] focus:bg-white focus:ring-1 focus:ring-black"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || !user}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
