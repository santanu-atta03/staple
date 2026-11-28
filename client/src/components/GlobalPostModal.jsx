import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
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
import api from "../api/axios";
import { createNewPost } from "../modules/Home/home.api";

export default function GlobalPostModal({ isOpen, onClose, onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [taggedUsersInput, setTaggedUsersInput] = useState("");
  const [selectedFeeling, setSelectedFeeling] = useState("");
  const [showFeelings, setShowFeelings] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [mediaList, setMediaList] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(null);

  if (!isOpen) return null;

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const { data } = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });
      if (data?.media?.length > 0) {
        setMediaList((prev) => [...prev, ...data.media]);
      }
    } catch (err) {
      if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
        setUploadError(err.response?.data?.message || "Upload failed. Check file format and size.");
      }
    } finally {
      uploadAbortRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleMoveMedia = (idx, dir) => {
    setMediaList((prev) => {
      const next = [...prev];
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const handleRemoveMedia = (idx) => {
    setMediaList((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitPost = async (asDraft = false) => {
    if (!content.trim() && mediaList.length === 0) return;

    setIsSubmitting(true);
    setUploadError("");
    try {
      const extractedTags = tagsInput
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const taggedUsers = taggedUsersInput
        .split(/[\s,]+/)
        .map((u) => u.replace(/^@/, "").trim().toLowerCase())
        .filter(Boolean);

      const feelingSuffix = selectedFeeling ? ` — feeling ${selectedFeeling}` : "";
      const finalContent = content.trim() + feelingSuffix;

      const payload = {
        content: finalContent,
        media: mediaList,
        tags: extractedTags,
        taggedUsers,
        location: location.trim(),
        visibility,
        isDraft: asDraft,
      };

      const newPost = asDraft
        ? (await api.post("/posts", payload)).data?.post
        : await createNewPost(payload);

      if (onPostCreated) onPostCreated(newPost);
      onClose();
      if (!asDraft) {
        window.dispatchEvent(new CustomEvent("staple:post_created", { detail: newPost }));
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to save post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitPost(false);
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
              src={
                user?.avatar ||
                `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user?.username || user?.name || "user")}`
              }
              alt={user?.name || user?.username || "Curator"}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user?.username || "user")}`;
              }}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-bold text-neutral-900">{user?.name || user?.username || "Curator"}</span>
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

          {/* Uploading indicator with progress & cancel */}
          {isUploading && (
            <div className="space-y-2 rounded-xl bg-[#f5f2ea] p-3 text-[12.5px] text-neutral-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Uploading media... {uploadProgress}%</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {uploadError}
            </div>
          )}

          {/* Extra tools: Feeling, Location, Tags, Tagged Users */}
          <div className="space-y-2">
            <div className="flex justify-end text-[11px] text-neutral-400">
              {content.length} / 5000
            </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="📍 Location"
                className="rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3 py-1.5 text-[12.5px] placeholder-neutral-400 focus:border-black focus:outline-none"
              />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="#hashtags"
                className="rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3 py-1.5 text-[12.5px] placeholder-neutral-400 focus:border-black focus:outline-none"
              />
              <input
                type="text"
                value={taggedUsersInput}
                onChange={(e) => setTaggedUsersInput(e.target.value)}
                placeholder="@tag users"
                className="rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3 py-1.5 text-[12.5px] placeholder-neutral-400 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ece8de] pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-[#eae6de] transition cursor-pointer"
              >
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                <span>Photo/Video</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFeelings(!showFeelings)}
                className="flex items-center gap-1.5 rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-[#eae6de] transition cursor-pointer"
              >
                <Smile className="h-4 w-4 text-amber-500" />
                <span>Feeling</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleFilesSelected}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting || (!content.trim() && mediaList.length === 0)}
                onClick={() => submitPost(true)}
                className="rounded-full bg-[#f2efe9] px-4 py-2 text-[12.5px] font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] transition disabled:opacity-50 cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading || (!content.trim() && mediaList.length === 0)}
                className="flex items-center gap-2 rounded-full bg-black px-6 py-2 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
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
          </div>
        </form>
      </div>
    </div>
  );
}
