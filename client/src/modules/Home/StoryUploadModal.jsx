import React, { useState, useRef } from "react";
import { X, Image as ImageIcon, Sparkles, Loader2, UploadCloud } from "lucide-react";
import { uploadMediaFiles, uploadNewStory } from "./home.api";

export default function StoryUploadModal({ isOpen, onClose, onStoryCreated, currentUser }) {
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sticker, setSticker] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let finalMediaUrl = previewUrl || "/profile/post_1_kyoto_lanterns.png";

      if (selectedFile) {
        const uploaded = await uploadMediaFiles([selectedFile]);
        if (uploaded && uploaded.length > 0) {
          finalMediaUrl = uploaded[0].url;
        }
      }

      const finalCaption = sticker ? `${sticker} ${caption}` : caption;
      const story = await uploadNewStory({
        caption: finalCaption,
        mediaUrl: finalMediaUrl,
      });

      if (onStoryCreated) onStoryCreated(story);
      onClose();
    } catch (err) {
      console.error("Failed to upload story:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ece8de] pb-3">
          <h3 className="text-[17px] font-bold text-neutral-900">Create a Story</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Media Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex h-64 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#dcd8ce] bg-[#faf9f5] hover:border-black transition"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Story preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-neutral-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edeae3] group-hover:scale-105 transition">
                  <UploadCloud className="h-6 w-6 text-neutral-700" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-neutral-800">
                    Click to upload photo or video
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    Supports JPG, PNG, WebP, MP4 via Cloudinary
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Sticker / Mood selection */}
          <div className="space-y-1.5">
            <span className="text-[12px] font-semibold text-neutral-600">Add a mood / sticker:</span>
            <div className="flex flex-wrap gap-1.5">
              {["✨ Daily Grain", "☕ Morning Espresso", "🎞️ 35mm Scan", "🗼 Tokyo Wander", "🎧 Studio Sound", "🌿 Kyoto Walk"].map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSticker(sticker === item ? "" : item)}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition ${
                      sticker === item
                        ? "bg-black text-white"
                        : "bg-[#f2efe9] text-neutral-700 hover:bg-[#eae6de]"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Caption Input */}
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a story caption (optional)..."
              rows={2}
              className="w-full rounded-xl border border-[#ece8de] bg-[#fdfcf9] p-3 text-[13.5px] placeholder-neutral-400 focus:border-black focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ece8de]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex items-center gap-2 rounded-full bg-black px-6 py-2 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading to Cloud...</span>
                </>
              ) : (
                <span>Share to Your Story</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
