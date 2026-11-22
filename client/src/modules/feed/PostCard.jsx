import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createPostComment } from "../posts/post.api";
import { deleteUserPost, togglePostLike } from "./feed.api";

export default function PostCard({ post, onDeleted }) {
  const { user } = useAuth();
  const author = post.authorId || {};
  const authorId = author._id || author;
  const isOwner = (user?._id || user?.id) === authorId;

  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(Number(post.likeCount || 0));
  const [liking, setLiking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  const handleComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim() || commenting) return;
    setCommenting(true);
    try {
      await createPostComment(post._id, commentText.trim());
      setCommentText("");
    } finally {
      setCommenting(false);
    }
  };

  const handleLike = async () => {
    if (liking) return;
    const previousLiked = liked;
    const previousCount = likeCount;

    setLiked(!previousLiked);
    setLikeCount(previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1);
    setLiking(true);
    try {
      const result = await togglePostLike(post._id, authorId);
      setLiked(result.liked);
      setLikeCount(result.totalLikes);
    } catch {
      setLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    if (navigator.share) {
      await navigator.share({ title: "Staple post", url }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(url);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteUserPost(post._id);
      onDeleted?.(post._id);
    } catch {
      setDeleting(false);
    }
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const avatarUrl =
    author.avatar ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${author.username || "Staple"}`;

  return (
    <article className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex gap-2.5">
        <Link to={`/u/${author.username}`} className="shrink-0">
          <img
            src={avatarUrl}
            alt={author.username || "Author"}
            className="h-9 w-9 rounded-full object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium">
                {author.name || author.username}
                {isOwner && <span className="ml-1 text-blue-500">✓</span>}
              </p>
              <p className="mt-0.5 truncate font-mono text-[9px] text-[#93939f]">
                @{author.username} · {formattedDate}
              </p>
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete post"
                className="rounded-md p-1 text-[#93939f] hover:bg-[#f5f3ee] hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" className="p-1 text-[#93939f]" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>

          {post.content && (
            <Link to={`/post/${post._id}`} className="mt-4 block">
              <p className="whitespace-pre-wrap text-[12px] leading-[19px] text-[#212121]">
                {post.content}
              </p>
            </Link>
          )}

          {post.content && (
            <div className="mt-1 text-[11px] text-[#1863dc]">
              {(post.content.match(/#[\w]+/g) || []).join(" ")}
            </div>
          )}

          {Array.isArray(post.media) && post.media.length > 0 && (
            <div
              className={`mt-3 grid gap-2 ${
                post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {post.media.map((item, index) => {
                const source = typeof item === "string" ? item : item.url;
                return item?.type === "video" ? (
                  <video
                    key={source || index}
                    src={source}
                    controls
                    className="max-h-64 w-full rounded-[16px] object-cover"
                  />
                ) : (
                  <img
                    key={source || index}
                    src={source}
                    alt="Post attachment"
                    loading="lazy"
                    className="max-h-64 w-full rounded-[16px] object-cover"
                  />
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between text-on-surface">
              <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleLike}
                disabled={liking}
                className={liked ? "text-[#f04444]" : "text-[#212121]"}
                aria-label={liked ? "Unlike post" : "Like post"}
              >
                <Heart className={`h-6 w-6 ${liked ? "fill-current" : ""}`} />
              </button>
              <Link
                to={`/post/${post._id}`}
                className="text-[#212121]"
                aria-label="Open comments"
              >
                <MessageCircle className="h-6 w-6" />
              </Link>
              <button type="button" onClick={handleShare} aria-label="Share post">
                <Send className="h-6 w-6" />
              </button>
              </div>
              <button
                type="button"
                onClick={() => setSaved((value) => !value)}
                className={`ml-auto ${saved ? "text-black" : "text-[#212121]"}`}
                aria-label={saved ? "Remove bookmark" : "Bookmark post"}
              >
                <Bookmark className={`h-6 w-6 ${saved ? "fill-current" : ""}`} />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-[14px]">
              <p className="text-on-surface">
                {likeCount > 0 ? `Liked by ${likeCount} ${likeCount === 1 ? "person" : "people"}` : "Be the first to react"}
              </p>
              {post.commentCount > 0 && (
                <Link to={`/post/${post._id}`} className="block text-[12px] text-muted hover:underline">
                  View all {post.commentCount} comments
                </Link>
              )}
              <form onSubmit={handleComment} className="flex items-center gap-2 border-t border-border-light pt-2">
                <img
                  src={user?.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${user?.username}`}
                  alt={user?.username}
                  className="h-7 w-7 rounded-full object-cover"
                />
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Add a comment..."
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted"
                />
                <button type="submit" disabled={commenting || !commentText.trim()} className="text-[12px] font-semibold text-[#1863dc] disabled:opacity-40">
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}