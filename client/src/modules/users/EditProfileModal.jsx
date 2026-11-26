import React, { useState, useEffect } from "react";
import { X, Camera, Loader2, Check } from "lucide-react";

export default function EditProfileModal({
  isOpen,
  profile,
  onClose,
  onSave,
}) {
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
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        website: profile.website || "",
        location: profile.location || "",
        pronouns: profile.pronouns || "",
        roleTag: profile.roleTag || "",
        avatar: profile.avatar || "",
        cover: profile.cover || "",
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error("Failed to save profile:", err);
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
          {/* Avatar Preview & Quick Change */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-[#ece8de]/60">
            <img
              src={formData.avatar || "/default-avatar.svg"}
              alt="Avatar preview"
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.svg";
              }}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-[#ece8de]"
            />
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1">
                Avatar Image URL
              </label>
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://... or /profile/..."
                className="w-full rounded-xl border border-[#ece8de] bg-[#fbf9f4] px-3 py-1.5 text-[12.5px] outline-none focus:border-[#1863dc]"
              />
            </div>
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
