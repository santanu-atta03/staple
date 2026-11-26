import React, { useState, useEffect } from "react";
import { Sparkles, X, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ShareNoteModal({ isOpen, currentNote, onClose, onSave, onDelete }) {
  const { user } = useAuth();
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNoteText(currentNote || "");
    }
  }, [isOpen, currentNote]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onSave(noteText.trim());
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  };

  const emojis = ["☕", "✨", "📸", "🎧", "🌿", "🌙", "🔥", "🚀"];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[28px] border border-[#ece8de]/80 bg-white p-6 shadow-2xl animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ece8de]/60">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef3fe] text-[#1863dc]">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-[16px] font-bold text-[#18181b]">
              {currentNote ? "Edit your note" : "Share a note"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#71717a] hover:bg-[#f4f2ea] hover:text-black transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Preview of Note Bubble + Avatar */}
        <div className="flex flex-col items-center justify-center pt-5 pb-2">
          <div className="relative mb-2 rounded-2xl bg-[#f4f2ea] border border-[#e6e2d8] px-4 py-2 text-center max-w-[200px] min-h-[38px] flex items-center justify-center shadow-xs">
            <span className="text-[13px] font-medium text-[#18181b] break-words">
              {noteText.trim() ? noteText : "Share what's on your mind..."}
            </span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#f4f2ea] rotate-45 border-r border-b border-[#e6e2d8]" />
          </div>

          <img
            src={user?.avatar || "/default-avatar.svg"}
            alt={user?.name || user?.username || ""}
            onError={(e) => {
              e.currentTarget.src = "/default-avatar.svg";
            }}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-black/5 shadow-xs"
          />
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 60))}
              placeholder="Share a thought, emoji, or current vibe (e.g. Kyoto rain vibes ☕)..."
              rows={2}
              maxLength={60}
              className="w-full rounded-2xl bg-[#fbf9f4] p-3.5 text-[13.5px] text-[#1b1c19] placeholder-[#93939f] border border-[#ece8de]/80 focus:outline-none focus:ring-1 focus:ring-black resize-none transition"
              autoFocus
            />

            {/* Quick Emoji Bar */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNoteText((prev) => (prev + " " + emoji).trim().slice(0, 60))}
                  className="rounded-full bg-[#f4f2ea] px-2 py-1 text-sm hover:bg-[#eae6dd] transition shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mt-2 text-[11px] text-[#71717a] px-1">
              <span>Visible to friends for 24h</span>
              <span>{noteText.length}/60</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            {currentNote ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444] hover:text-[#dc2626] transition py-1 px-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete note</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[#f4f2ea] px-4 py-2 text-[12.5px] font-semibold text-[#18181b] hover:bg-[#eae6dd] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!noteText.trim()}
                className={`rounded-full px-5 py-2 text-[12.5px] font-semibold transition ${
                  noteText.trim()
                    ? "bg-black text-white hover:bg-neutral-800 active:scale-95 shadow-xs"
                    : "bg-[#e4e2dd] text-[#a1a1aa] cursor-not-allowed"
                }`}
              >
                Share
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
