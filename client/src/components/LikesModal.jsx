import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import { fetchPostLikes } from "../modules/Home/home.api";

export default function LikesModal({ postId, isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPage = async (targetPage = 1, append = false) => {
    if (!postId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetchPostLikes(postId, { page: targetPage, limit: 20 });
      setUsers((prev) => (append ? [...prev, ...res.users] : res.users));
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (err) {
      setError("Could not load likes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && postId) {
      loadPage(1, false);
    }
  }, [isOpen, postId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece8de] px-5 py-3.5">
          <h3 className="text-[15px] font-bold text-[#18181b]">Likes</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close likes modal"
            className="rounded-full p-1 text-[#71717a] hover:bg-[#f4f2ea] hover:text-black"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-2.5">
          {isLoading && users.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[13px] text-[#71717a]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#1863dc]" />
              Loading likes...
            </div>
          ) : error ? (
            <div className="py-6 text-center text-[13px] text-rose-600">{error}</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#71717a]">No likes yet.</div>
          ) : (
            users.map((u) => (
              <Link
                key={u.id}
                to={`/u/${encodeURIComponent(u.username)}`}
                onClick={onClose}
                className="flex items-center justify-between rounded-xl p-2 hover:bg-[#faf9f5] transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.avatar || "/default-avatar.svg"}
                    alt={u.name}
                    onError={(e) => {
                      e.target.src = "/default-avatar.svg";
                    }}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[13.5px] font-semibold text-[#18181b]">
                        {u.name}
                      </span>
                      {u.isVerified && (
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white">
                          <Check className="h-2 w-2 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-[#71717a]">@{u.username}</p>
                  </div>
                </div>
                {u.isFollowing && (
                  <span className="rounded-full bg-[#f0eee9] px-3 py-1 text-[11.5px] font-semibold text-[#18181b]">
                    Following
                  </span>
                )}
              </Link>
            ))
          )}

          {hasMore && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => loadPage(page + 1, true)}
              className="w-full rounded-xl border border-[#ece8de] py-2 text-[12.5px] font-semibold text-[#18181b] hover:bg-[#faf9f5] disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
