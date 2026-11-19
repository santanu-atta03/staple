import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { deleteUserPost, togglePostLike } from "./feed.api";

export default function PostCard({ post, onDeleted }) {
  const { user } = useAuth();
  const author = post.authorId || {};
  const isOwner = (user?._id || user?.id) === (author._id || author);

  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(Number(post.likeCount || 0));
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    setLiking(true);

    try {
      const res = await togglePostLike(post._id, author._id || author);
      setLiked(res.liked);
      setLikeCount(res.totalLikes);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
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

  return (
    <article className="border-b border-neutral-800/70 px-4 py-4 transition hover:bg-neutral-900/25 sm:px-6">
      <div className="flex gap-3.5">
        <Link to={`/u/${author.username}`} className="shrink-0">
          <img
            src={
              author.avatar ||
              `https://api.dicebear.com/9.x/initials/svg?seed=${author.username}`
            }
            alt={author.username}
            className="h-10 w-10 rounded-full object-cover bg-neutral-800"
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate text-sm">
              <Link
                to={`/u/${author.username}`}
                className="truncate font-semibold text-white hover:underline"
              >
                {author.name || author.username}
              </Link>
              <span className="truncate text-neutral-500">
                @{author.username}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="shrink-0 text-xs text-neutral-500">
                {formattedDate}
              </span>
            </div>

            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete post"
                className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Content */}
          {post.content && (
            <Link to={`/post/${post._id}`} className="block">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
                {post.content}
              </p>
            </Link>
          )}

          {/* Media Grid */}
          {Array.isArray(post.media) && post.media.length > 0 && (
            <div
              className={`grid gap-2 pt-1 ${
                post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {post.media.map((item, idx) => {
                const src = typeof item === "string" ? item : item.url;
                const isVideo = item?.type === "video";
                return isVideo ? (
                  <video
                    key={idx}
                    src={src}
                    controls
                    className="max-h-80 w-full rounded-xl border border-neutral-800 object-cover"
                  />
                ) : (
                  <img
                    key={idx}
                    src={src}
                    alt="Post attachment"
                    loading="lazy"
                    className="max-h-80 w-full rounded-xl border border-neutral-800 object-cover"
                  />
                );
              })}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center gap-6 pt-1">
            <button
              onClick={handleLike}
              className={`group inline-flex items-center gap-1.5 text-xs font-medium transition ${
                liked
                  ? "text-rose-500"
                  : "text-neutral-500 hover:text-rose-400"
              }`}
            >
              <Heart
                className={`h-4 w-4 transition-transform group-active:scale-125 ${
                  liked ? "fill-rose-500" : ""
                }`}
              />
              <span>{likeCount}</span>
            </button>

            <Link
              to={`/post/${post._id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.commentCount || 0}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}