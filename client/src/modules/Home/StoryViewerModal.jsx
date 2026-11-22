import React, { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Heart, Send, Pause, Play, Volume2, VolumeX } from "lucide-react";

export default function StoryViewerModal({ stories, initialIndex = 0, onClose, onDeleteStory, onReply, currentUser }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false);

  const activeStory = stories[currentIndex] || stories[0];
  const isOwner = activeStory?.isYours || activeStory?.name === currentUser?.username || activeStory?.name === "Your story";

  const STORY_DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    setProgress(0);
    setIsLiked(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!activeStory || isPaused) return;

    const interval = 50; // update progress every 50ms
    const step = (interval / STORY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (onReply) onReply(activeStory.id, replyText);
    setReplyText("");
  };

  if (!activeStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main Story Container */}
      <div
        className="relative flex h-full max-h-[820px] w-full max-w-[420px] flex-col justify-between overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {stories.map((story, idx) => (
            <div key={story.id || idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width:
                    idx < currentIndex
                      ? "100%"
                      : idx === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Author Header */}
        <div className="absolute top-7 inset-x-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={activeStory.avatar || "/recreation/avatar_left_elena_hires.png"}
              alt={activeStory.name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/60"
            />
            <div className="leading-tight text-white drop-shadow">
              <p className="text-[13px] font-semibold">{activeStory.name}</p>
              <p className="text-[11px] text-white/80">{activeStory.createdAt ? "Today" : "Just now"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="rounded-full bg-black/40 p-1.5 text-white backdrop-blur-xs hover:bg-black/60 transition"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            {isOwner && onDeleteStory && (
              <button
                onClick={() => onDeleteStory(activeStory.id)}
                className="rounded-full bg-rose-600/80 p-1.5 text-white hover:bg-rose-600 transition"
                title="Delete story"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Story Media (Image or Video) */}
        <div className="relative h-full w-full bg-neutral-950 flex items-center justify-center">
          <img
            src={activeStory.mediaUrl || "/profile/post_1_kyoto_lanterns.png"}
            alt="Story content"
            className="h-full w-full object-cover"
          />

          {/* Touch navigation zones */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-20 w-1/3 cursor-pointer z-20"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-20 w-1/3 cursor-pointer z-20"
          />

          {/* Story Caption */}
          {activeStory.caption && (
            <div className="absolute bottom-20 inset-x-4 z-30 rounded-xl bg-black/60 p-3 text-center text-[13.5px] font-medium text-white backdrop-blur-md">
              {activeStory.caption}
            </div>
          )}
        </div>

        {/* Story Bottom Reply Bar */}
        <div className="absolute bottom-3 inset-x-3 z-30 flex items-center gap-2">
          <form onSubmit={handleSendReply} className="flex flex-1 items-center rounded-full bg-white/20 backdrop-blur-md px-3.5 py-2 ring-1 ring-white/30">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${activeStory.name}...`}
              className="w-full bg-transparent text-[13px] text-white placeholder-white/70 outline-none"
            />
            {replyText.trim() && (
              <button type="submit" className="text-white hover:text-white/80">
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>

          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition ${
              isLiked ? "bg-rose-600 text-white" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? "fill-white" : ""}`} />
          </button>
        </div>
      </div>

      {/* Prev / Next desktop controls */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-8 top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
