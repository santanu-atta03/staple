import React, { useState, useRef } from "react";
import {
  X,
  Image as ImageIcon,
  Smile,
  MapPin,
  Tag,
  Globe,
  Users,
  Lock,
  Loader2,
  Trash2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { createNewPost, uploadMediaFiles } from "../modules/Home/home.api";

export default function GlobalPostModal({ isOpen, onClose, onPostCreated }) {
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedFeeling, setSelectedFeeling] = useState("");
  const [showFeelings, setShowFeelings] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [mediaList, setMediaList] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFilesSelected = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadMediaFiles(files);
      if (uploaded && uploaded.length > 0) {
        setMediaList((prev) => [...prev, ...uploaded]);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = (idx) => {
    setMediaList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaList.length === 0) return;

    setIsSubmitting(true);
    try {
      const extractedTags = tagsInput
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.startsWith("#") || t.length > 0)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const feelingSuffix = selectedFeeling ? ` — feeling ${selectedFeeling}` : "";
      const finalContent = content.trim() + feelingSuffix;

      const newPost = await createNewPost({
        content: finalContent,
        media: mediaList,
        tags: extractedTags,
        location: location.trim(),
        visibility,
      });

      if (onPostCreated) onPostCreated(newPost);
      onClose();
      // Notify window if Home is open
      window.dispatchEvent(new CustomEvent("staple:post_created", { detail: newPost }));
    } catch (err) {
      console.error("Failed to create post:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ece8de] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neutral-800" />
            <h3 className="text-[17px] font-bold text-neutral-900">Create Post</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* User info row */}
          <div className="flex items-center gap-3">
            <img
              src="/recreation/avatar_left_elena_hires.png"
              alt="Elena Vance"
              className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-bold text-neutral-900">Elena Vance</span>
                <span className="rounded-full bg-black px-1 text-[9px] text-white">✓</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-neutral-500">
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="rounded-md border border-[#ece8de] bg-[#f8f6f0] px-2 py-0.5 text-[11.5px] font-medium text-neutral-700 outline-none"
                >
                  <option value="public">🌐 Public</option>
                  <option value="close_friends">👥 Close Friends</option>
                  <option value="private">🔒 Only Me</option>
                </select>
                {location && <span>• {location}</span>}
              </div>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an essay, thought, architectural detail, or question..."
            className="w-full rounded-2xl border border-[#ece8de] bg-[#fdfcf9] p-3.5 text-[14px] leading-relaxed text-neutral-900 placeholder-neutral-400 focus:border-black focus:outline-none"
          />

          {/* Media Previews Grid */}
          {mediaList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mediaList.map((m, idx) => (
                <div key={idx} className="group relative h-28 overflow-hidden rounded-xl border border-black/5">
                  <img src={m.url} alt="Attached" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Uploading indicator */}
          {isUploading && (
            <div className="flex items-center gap-2 rounded-xl bg-[#f5f2ea] p-3 text-[12.5px] text-neutral-700">
              <Loader2 className="h-4 w-4 animate-spin text-black" />
              <span>Uploading image via Cloudinary...</span>
            </div>
          )}

          {/* Extra tools: Feeling, Location, Tags */}
          <div className="space-y-2">
            {showFeelings && (
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#ece8de] bg-[#faf9f5] p-2 text-[12px]">
                {["✨ Grateful", "☕ Cozy", "📸 Inspired", "🌿 Peaceful", "🎧 In the Groove", "🗼 Traveling"].map(
                  (f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setSelectedFeeling(f);
                        setShowFeelings(false);
                      }}
                      className="rounded-lg px-2.5 py-1 hover:bg-[#edeae3] transition"
                    >
                      {f}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="📍 Add location (e.g. San Francisco, CA)"
                className="flex-1 rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3 py-1.5 text-[12.5px] placeholder-neutral-400 focus:border-black focus:outline-none"
              />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="#hashtags"
                className="w-36 rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3 py-1.5 text-[12.5px] placeholder-neutral-400 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between border-t border-[#ece8de] pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-[#eae6de] transition"
              >
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                <span>Upload Photo/Video</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFeelings(!showFeelings)}
                className="flex items-center gap-1.5 rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-[#eae6de] transition"
              >
                <Smile className="h-4 w-4 text-amber-500" />
                <span>Feeling</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFilesSelected}
            />

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && mediaList.length === 0)}
              className="flex items-center gap-2 rounded-full bg-black px-6 py-2 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Post</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
