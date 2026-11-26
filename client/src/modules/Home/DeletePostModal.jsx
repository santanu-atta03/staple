import React, { useState, useEffect, useRef } from "react";
import { Trash2, AlertTriangle, X, Check } from "lucide-react";

export default function DeletePostModal({
  isOpen,
  post,
  onClose,
  onConfirmDelete,
}) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const holdIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const HOLD_DURATION_MS = 1200; // 1.2s hold required to confirm delete

  useEffect(() => {
    if (!isOpen) {
      setHoldProgress(0);
      setIsHolding(false);
      setIsDeleting(false);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    }
  }, [isOpen]);

  const handleStartHold = () => {
    if (isDeleting) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        setIsHolding(false);
        setIsDeleting(true);

        // Haptic feedback if available on mobile
        if (navigator.vibrate) {
          navigator.vibrate([40, 60, 40]);
        }

        setTimeout(() => {
          if (post?._id) {
            onConfirmDelete(post._id);
          }
        }, 300);
      }
    }, 20);
  };

  const handleCancelHold = () => {
    if (isDeleting) return;
    setIsHolding(false);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldProgress(0);
  };

  if (!isOpen || !post) return null;

  const author = post.authorId || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={handleCancelHold}
    >
      <div
        className="w-full max-w-[440px] rounded-[26px] border border-[#ece8de] bg-[#fbf9f4] p-6 shadow-2xl text-[#18181b] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
            <Trash2 className="h-6 w-6 stroke-[2.2]" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#edeae3] hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-[17px] font-bold text-[#18181b]">
            Delete this post?
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#71717a]">
            This action cannot be undone. This post and all associated comments, reactions, and attachments will be permanently removed.
          </p>
        </div>

        {/* Post Preview Snippet */}
        <div className="mt-4 rounded-2xl border border-[#ece8de] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <img
              src={
                author.avatar ||
                `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(author.username || "user")}`
              }
              alt={author.name || author.username || "Curator"}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(author.username || "user")}`;
              }}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-black/5"
            />
            <div className="min-w-0">
              <span className="text-[12.5px] font-semibold text-[#18181b] truncate block">
                {author.name || author.username || "Curator"}
              </span>
              <span className="text-[11px] text-[#71717a] block">
                {post.time || "Recent post"}
              </span>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-[12.5px] text-[#3f3f46]">
            {post.content || "Media attachment"}
          </p>
        </div>

        {/* Hold to Delete Interactive Button */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onMouseDown={handleStartHold}
            onMouseUp={handleCancelHold}
            onMouseLeave={handleCancelHold}
            onTouchStart={handleStartHold}
            onTouchEnd={handleCancelHold}
            onTouchCancel={handleCancelHold}
            disabled={isDeleting}
            className="group relative flex w-full select-none items-center justify-center overflow-hidden rounded-full border border-rose-200 bg-rose-50 py-3.5 px-6 font-semibold text-rose-700 shadow-xs transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {/* Animated Fill Bar */}
            <div
              className="absolute inset-y-0 left-0 bg-rose-600 transition-all ease-linear"
              style={{
                width: `${holdProgress}%`,
                transitionDuration: isHolding ? "20ms" : "200ms",
              }}
            />

            {/* Button Content */}
            <div className="relative z-10 flex items-center gap-2 text-[13.5px]">
              {isDeleting ? (
                <>
                  <Trash2 className="h-4 w-4 animate-bounce text-white" />
                  <span className="text-white font-bold">Deleting post...</span>
                </>
              ) : holdProgress > 0 ? (
                <>
                  <Trash2 className="h-4 w-4 text-white" />
                  <span className="text-white font-bold">
                    Keep holding ({Math.max(0, Math.ceil((HOLD_DURATION_MS * (100 - holdProgress)) / 1000 / 10))}s)
                  </span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 text-rose-600 group-hover:scale-110 transition" />
                  <span>Hold to Delete (1.2s)</span>
                </>
              )}
            </div>
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex w-full items-center justify-center rounded-full border border-[#ece8de] bg-white py-3 text-[13.5px] font-semibold text-neutral-700 shadow-2xs hover:bg-[#edeae3] hover:text-black transition active:scale-[0.99]"
          >
            Cancel
          </button>
        </div>

        {/* Helper Hint */}
        <p className="mt-3 text-center text-[11px] text-[#a1a1aa]">
          Press and hold the delete button until the bar fills up to confirm.
        </p>
      </div>
    </div>
  );
}
