import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import {
  createPostComment,
  deletePostComment,
  fetchPostById,
  fetchPostComments,
} from "./post.api";
import PostCard from "../feed/PostCard";
import RollButton from "../../components/RollButton";

export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([fetchPostById(postId), fetchPostComments(postId)])
      .then(([postData, commentsData]) => {
        if (!active) return;
        setPost({
          ...postData,
          commentCount: commentsData.length,
        });
        setComments(commentsData);
      })
      .catch(() => navigate("/"))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [postId, navigate]);

  // Real-time Socket.io comment room subscription
  useEffect(() => {
    if (!socket || !postId) return;

    socket.emit("post:join", postId);

    const handleNewComment = (incomingComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === incomingComment._id)) return prev;
        return [incomingComment, ...prev];
      });
    };

    socket.on("post:commented", handleNewComment);

    return () => {
      socket.emit("post:leave", postId);
      socket.off("post:commented", handleNewComment);
    };
  }, [socket, postId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const created = await createPostComment(postId, commentText.trim());
      setComments((prev) => {
        if (prev.some((c) => c._id === created._id)) return prev;
        return [created, ...prev];
      });
      setPost((prev) =>
        prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev
      );
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    await deletePostComment(commentId);
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    setPost((prev) =>
      prev
        ? { ...prev, commentCount: Math.max(0, (prev.commentCount || 1) - 1) }
        : prev
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-800/70 bg-neutral-950/85 px-4 py-3.5 backdrop-blur sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white">Thread</h1>
      </header>

      {post && <PostCard post={post} onDeleted={() => navigate("/")} />}

      {/* Comment Composer */}
      <form
        onSubmit={handleAddComment}
        className="flex items-center gap-3 border-b border-neutral-800/70 px-4 py-3.5 sm:px-6"
      >
        <img
          src={
            user?.avatar ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${user?.username}`
          }
          alt={user?.username}
          className="h-8 w-8 shrink-0 rounded-full object-cover bg-neutral-800"
        />
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a reply..."
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
        />
        <RollButton
          type="submit"
          disabled={submitting || !commentText.trim()}
          className="px-4 py-1.5 text-xs"
        >
          {submitting ? "Replying..." : "Reply"}
        </RollButton>
      </form>

      {/* Comment List */}
      <div>
        {comments.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-neutral-500">
            No replies yet. Start the conversation above.
          </p>
        ) : (
          comments.map((comment) => {
            const commenter = comment.userId || {};
            const isCommentOwner =
              (user?._id || user?.id) === (commenter._id || commenter);

            return (
              <div
                key={comment._id}
                className="flex gap-3 border-b border-neutral-800/60 px-4 py-3.5 sm:px-6"
              >
                <Link to={`/u/${commenter.username}`} className="shrink-0">
                  <img
                    src={
                      commenter.avatar ||
                      `https://api.dicebear.com/9.x/initials/svg?seed=${commenter.username}`
                    }
                    alt={commenter.username}
                    className="h-8 w-8 rounded-full object-cover bg-neutral-800"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Link
                        to={`/u/${commenter.username}`}
                        className="font-semibold text-white hover:underline"
                      >
                        {commenter.name || commenter.username}
                      </Link>
                      <span className="text-neutral-500">
                        @{commenter.username}
                      </span>
                    </div>

                    {isCommentOwner && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="rounded p-1 text-neutral-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-200">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}