import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Loader2, Check, Upload, Trash2, Lock } from "lucide-react";
import { checkUsernameAvailable, uploadProfileMedia } from "./profile.api";

export default function EditProfileModal({
  isOpen,
  profile,
  initialData,
  onClose,
  onSave,
}) {
  const source = profile || initialData;
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    website: "",
    location: "",
    pronouns: "",
    roleTag: "",
    avatar: "",
    cover: "",
    isPrivate: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("unchanged"); // unchanged | checking | available | taken | invalid

  useEffect(() => {
    if (source && isOpen) {
      setFormData({
        name: source.name || "",
        username: source.username || "",
        bio: source.bio || "",
        website: source.website || "",
        location: source.location || "",
        pronouns: source.pronouns || "",
        roleTag: source.roleTag || "",
        avatar: source.avatar || "/default-avatar.svg",
        cover: source.cover || "",
        isPrivate: Boolean(source.isPrivate),
      });
      setErrorMsg("");
      setUsernameStatus("unchanged");
    }
  }, [source, isOpen]);

  if (!isOpen) return null;

  const handleUsernameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
    setFormData((prev) => ({ ...prev, username: clean }));
    if (clean === (source?.username || "").toLowerCase()) {
      setUsernameStatus("unchanged");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    checkUsernameAvailable(clean)
      .then((available) => setUsernameStatus(available ? "available" : "taken"))
      .catch(() => setUsernameStatus("unchanged"));
  };

  const handleMediaFile = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be smaller than 5 MB.");
      return;
    }
    setErrorMsg("");
    setUploadingField(field);
    try {
      const url = await uploadProfileMedia(file);
      if (url) {
        setFormData((prev) => ({ ...prev, [field]: url }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Failed to upload ${field} image.`);
    } finally {
      setUploadingField("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      setErrorMsg(
        usernameStatus === "taken"
          ? "That username is already taken."
          : "Username must be 3-30 lowercase letters, numbers, or underscores."
      );
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        displayName: formData.name.trim(),
        fullName: formData.name.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] rounded-[26px] border border-[#ece8de] bg-[#fbf9f4] p-6 shadow-2xl text-[#18181b] animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#ece8de]/70">
          <h3 className="text-[17px] font-bold text-[#18181b]">Edit Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#edeae3] hover:text-black transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4 pr-1">
          <input
            type="file"
            ref={avatarInputRef}
            onChange={(e) => handleMediaFile(e, "avatar")}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={coverInputRef}
            onChange={(e) => handleMediaFile(e, "cover")}
            accept="image/*"
            className="hidden"
          />

          {errorMsg && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Cover Photo Preview & Upload */}
          <div className="rounded-2xl bg-white border border-[#ece8de]/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717a]">
                Cover Photo
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingField === "cover"}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f0eee9] px-3 py-1 text-[11px] font-semibold text-[#18181b] hover:bg-[#e4e2dd] transition cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  <span>{uploadingField === "cover" ? "Uploading..." : "Upload Cover"}</span>
                </button>
                {formData.cover && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, cover: "" }))}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
            <div className="h-24 w-full rounded-xl overflow-hidden bg-[#f0eee9]">
              {formData.cover ? (
                <img src={formData.cover} alt="Cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-[#71717a]">
                  No cover photo selected
                </div>
              )}
            </div>
          </div>

          {/* Avatar Preview & Upload */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-[#ece8de]/60">
            <img
              src={formData.avatar || "/default-avatar.svg"}
              alt="Avatar preview"
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.svg";
              }}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-[#ece8de]"
            />
            <div className="flex-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingField === "avatar"}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#18181b] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{uploadingField === "avatar" ? "Uploading..." : "Change Photo"}</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, avatar: "/default-avatar.svg" }))}
                className="inline-flex items-center gap-1 rounded-full bg-[#f0eee9] px-3 py-1.5 text-xs font-semibold text-[#18181b] hover:bg-[#e4e2dd] transition cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-semibold text-[#27272a]">
                Username
              </label>
              {usernameStatus === "available" && (
                <span className="text-[11px] font-semibold text-emerald-600">Available</span>
              )}
              {usernameStatus === "taken" && (
                <span className="text-[11px] font-semibold text-red-600">Already taken</span>
              )}
              {usernameStatus === "invalid" && (
                <span className="text-[11px] font-semibold text-red-600">3-30 chars (a-z, 0-9, _)</span>
              )}
            </div>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] font-mono outline-none focus:border-[#1863dc]"
            />
          </div>

          {/* Name & Pronouns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none focus:border-[#1863dc]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
                Pronouns
              </label>
              <input
                type="text"
                value={formData.pronouns}
                onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                placeholder="e.g. she/her, they/them"
                className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none focus:border-[#1863dc]"
              />
            </div>
          </div>

          {/* Role Tag & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={formData.roleTag}
                onChange={(e) => setFormData({ ...formData, roleTag: e.target.value })}
                placeholder="e.g. Creative Vanguard"
                className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none focus:border-[#1863dc]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. San Francisco, CA"
                className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none focus:border-[#1863dc]"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
              Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell the community about your craft and aesthetic..."
              className="w-full rounded-xl border border-[#ece8de] bg-white p-3 text-[13px] outline-none focus:border-[#1863dc] resize-none"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-[12px] font-semibold text-[#27272a] mb-1">
              Website or Portfolio Link
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="e.g. https://elenavance.design"
              className="w-full rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none focus:border-[#1863dc]"
            />
          </div>

          {/* Account Privacy Toggle */}
          <label className="flex items-center justify-between rounded-2xl bg-white border border-[#ece8de]/60 p-3.5 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-[#71717a]" />
              <div>
                <p className="text-[13px] font-semibold text-[#18181b]">Private Account</p>
                <p className="text-[11px] text-[#71717a]">Only approved followers can see your posts and lists</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.isPrivate}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPrivate: e.target.checked }))}
              className="h-4 w-4 accent-black"
            />
          </label>

          {/* Actions */}
          <div className="pt-3 border-t border-[#ece8de]/70 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full bg-[#edeae3] px-5 py-2 text-[13px] font-semibold text-[#27272a] hover:bg-[#e4e0d6] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-full bg-black px-6 py-2 text-[13px] font-semibold text-white hover:bg-neutral-800 transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
