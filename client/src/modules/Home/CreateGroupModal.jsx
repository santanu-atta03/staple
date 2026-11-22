import React, { useState } from "react";
import { X, Users, Lock, Globe, Loader2 } from "lucide-react";
import { createNewGroup } from "./home.api";

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Creative Arts");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const group = await createNewGroup({
        name,
        category,
        description,
        isPrivate,
      });
      if (onGroupCreated) onGroupCreated(group);
      onClose();
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ece8de] pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-neutral-800" />
            <h3 className="text-[17px] font-bold text-neutral-900">Create New Group</h3>
          </div>
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
              Group Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kyoto Street Photographers"
              className="w-full rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3.5 py-2 text-[13.5px] placeholder-neutral-400 focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[#ece8de] bg-[#fdfcf9] px-3.5 py-2 text-[13.5px] text-neutral-800 focus:border-black focus:outline-none"
            >
              <option>Creative Arts</option>
              <option>Design & Technology</option>
              <option>Outdoors & Adventure</option>
              <option>Music & Audio</option>
              <option>Architecture & Spaces</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about? What kind of content should members share?"
              className="w-full rounded-xl border border-[#ece8de] bg-[#fdfcf9] p-3 text-[13px] placeholder-neutral-400 focus:border-black focus:outline-none"
            />
          </div>

          {/* Privacy Switch */}
          <div className="flex items-center justify-between rounded-xl border border-[#ece8de] bg-[#faf9f5] p-3">
            <div className="flex items-center gap-2.5">
              {isPrivate ? <Lock className="h-4 w-4 text-neutral-600" /> : <Globe className="h-4 w-4 text-emerald-600" />}
              <div>
                <p className="text-[12.5px] font-semibold text-neutral-800">
                  {isPrivate ? "Private Community" : "Public Community"}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {isPrivate ? "Only approved members can view posts" : "Anyone on Staple can find and join"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPrivate ? "bg-black" : "bg-neutral-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  isPrivate ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
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
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 rounded-full bg-black px-6 py-2 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Group</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
