import React, { useState } from "react";
import { X, MapPin, Tag, Globe, Lock, Users, Loader2 } from "lucide-react";
import { editPost } from "./home.api";

export default function EditPostModal({ post, isOpen, onClose, onPostUpdated }) {
  const [content, setContent] = useState(post?.content || "");
  const [location, setLocation] = useState(post?.location || "");
  const [tagsInput, setTagsInput] = useState((post?.tags || []).join(" "));
  const [visibility, setVisibility] = useState(post?.visibility || "public");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const extractedTags = tagsInput
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.startsWith("#") || t.length > 0)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const updated = await editPost(post._id, {
        content: content.trim(),
        location: location.trim(),
        tags: extractedTags,
        visibility,
      });

      if (onPostUpdated) onPostUpdated(updated);
      onClose();
    } catch (err) {
      console.error("Failed to update post:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ece8de] pb-3">
          <h3 className="text-[17px] font-bold text-neutral-900">Edit Post</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1">
              Post Content
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-2xl border border-[#ece8de] bg-[#fdfcf9] p-3 text-[13.5px] leading-relaxed text-neutral-900 focus:border-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                <span>Location Tag</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3.5 py-2 text-[13px] placeholder-neutral-400 focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-neutral-500" />
                <span>Hashtags</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="#design #minimalism"
                className="w-full rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3.5 py-2 text-[13px] placeholder-neutral-400 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1">
              Visibility
            </label>
            <div className="flex gap-2">
              {[
                { id: "public", label: "Public", icon: Globe },
                { id: "close_friends", label: "Close Friends", icon: Users },
                { id: "private", label: "Only Me", icon: Lock },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVisibility(opt.id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] font-medium transition ${
                      visibility === opt.id
                        ? "border-black bg-black text-white"
                        : "border-[#ece8de] bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#ece8de] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex items-center gap-2 rounded-full bg-black px-6 py-2 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
