import React, { useState } from "react";
import { X, Send, Sparkles } from "lucide-react";

export default function ViewNoteModal({ isOpen, note, onClose, onReply }) {
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !note) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      await onReply(note.id, replyText.trim(), note.name);
      setReplyText("");
      onClose();
    } catch (err) {
      console.error("Failed to reply to note:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[28px] border border-[#ece8de]/80 bg-white p-6 shadow-2xl animate-scale-up flex flex-col items-center text-center"
      >
        {/* Close Button Top Right */}
        <div className="w-full flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#71717a] hover:bg-[#f4f2ea] hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thought / Note Bubble */}
        <div className="relative -mt-1 mb-4 rounded-3xl bg-[#f7f5ef] border border-[#e6e2d8] px-5 py-3 shadow-sm max-w-[260px] animate-fade-in-slide">
          <p className="text-[15px] font-medium text-[#18181b] leading-relaxed break-words">
            "{note.note}"
          </p>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#f7f5ef] rotate-45 border-r border-b border-[#e6e2d8]" />
        </div>

        {/* User Avatar */}
        <div className="relative mb-3">
          <img
            src={note.avatar}
            alt={note.name}
            onError={(e) => {
              e.currentTarget.src = "/default-avatar.svg";
            }}
            className="h-20 w-20 rounded-full object-cover ring-4 ring-[#faf9f5] shadow-md"
          />
          {note.active && (
            <span className="absolute bottom-1 right-1 flex h-4 w-4 rounded-full bg-[#10b981] ring-2 ring-white" />
          )}
        </div>

        {/* Name & Subtitle */}
        <h3 className="text-[17px] font-bold text-[#18181b]">
          {note.name}
        </h3>
        <p className="text-xs text-[#71717a] mt-0.5">
          Shared a note • Active recently
        </p>

        {/* Reply Form */}
        <form onSubmit={handleSubmit} className="w-full mt-5">
          <div className="relative flex items-center">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Send message to ${note.name}...`}
              className="w-full rounded-full bg-[#f4f2ea] pl-4 pr-11 py-3 text-[13px] text-[#18181b] placeholder-[#71717a] outline-none border border-transparent focus:border-[#dcd8ce] focus:bg-white transition"
              autoFocus
            />
            <button
              type="submit"
              disabled={!replyText.trim() || isSending}
              className={`absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full transition ${
                replyText.trim()
                  ? "bg-black text-white hover:bg-neutral-800"
                  : "bg-transparent text-[#a1a1aa] cursor-not-allowed"
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
