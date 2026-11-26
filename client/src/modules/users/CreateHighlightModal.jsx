import React, { useState } from "react";
import { X, Sparkles, Image as ImageIcon } from "lucide-react";

export default function CreateHighlightModal({
  isOpen,
  onClose,
  onCreate,
}) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const defaultPresets = [
    { title: "Moments ✨", image: "/profile/hl_film.png" },
    { title: "Travel ✈️", image: "/profile/hl_kyoto.png" },
    { title: "Work 🖥️", image: "/profile/hl_spaces.png" },
    { title: "Cafes ☕", image: "/profile/hl_coffee.png" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        image: image.trim() || "/profile/hl_film.png",
      });
      setTitle("");
      setImage("");
      onClose();
    } catch (err) {
      console.error("Failed to create highlight:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-[26px] border border-[#ece8de] bg-[#fbf9f4] p-6 shadow-2xl text-[#18181b] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#ece8de]/70">
          <h3 className="text-[16px] font-bold text-[#18181b]">New Highlight</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#edeae3] hover:text-black transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
              Highlight Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kyoto 🌸, Film 35mm..."
              className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none focus:border-[#1863dc]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
              Cover Image URL (optional)
            </label>
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="/profile/hl_... or https://..."
              className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none focus:border-[#1863dc]"
            />
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-[11px] font-semibold text-[#71717a] mb-1.5 uppercase tracking-wider">
              Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {defaultPresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTitle(p.title);
                    setImage(p.image);
                  }}
                  className="rounded-full bg-white px-3 py-1 text-[11.5px] font-medium border border-[#ece8de] hover:bg-[#edeae3] transition"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#ece8de]/70 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#edeae3] px-4 py-1.5 text-[12.5px] font-semibold text-[#27272a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-full bg-black px-5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Add Highlight"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
