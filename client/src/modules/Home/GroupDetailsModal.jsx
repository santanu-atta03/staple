import React from "react";
import { X, Users, MessageSquare, Plus, Lock, Globe, Camera, Footprints, Layers } from "lucide-react";

export default function GroupDetailsModal({ group, isOpen, onClose, onToggleJoin, onOpenCreateGroup }) {
  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#ece8de] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edeae3] text-neutral-800">
              {group.icon === "camera" ? (
                <Camera className="h-6 w-6" />
              ) : group.icon === "footprints" ? (
                <Footprints className="h-6 w-6" />
              ) : (
                <Layers className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-bold text-neutral-900">{group.name}</h3>
                {group.isPrivate ? (
                  <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                    <Lock className="h-3 w-3" /> Private
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <Globe className="h-3 w-3" /> Public
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-neutral-500">
                {group.category} • {group.members || `${group.memberCount} members`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <div className="mt-4">
          <p className="text-[13.5px] leading-relaxed text-neutral-700">
            {group.description || "Community dedicated to creative collaboration, discussions, and projects."}
          </p>
        </div>

        {/* Discussions Section */}
        <div className="mt-5">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-neutral-500">
              Active Discussions ({group.discussions?.length || 0})
            </h4>
            <span className="text-[11.5px] text-neutral-400">Moderated by Admins</span>
          </div>

          <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1">
            {(group.discussions || []).length > 0 ? (
              group.discussions.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-[#ece8de] bg-[#fbf9f5] p-3 transition hover:bg-[#f5f2eb]"
                >
                  <p className="text-[13px] font-semibold text-neutral-900">{d.title}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>By {d.author}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {d.replies} replies
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-[12.5px] text-neutral-400">
                No discussions started yet. Join to start the first conversation!
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-between border-t border-[#ece8de] pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCreateGroup) onOpenCreateGroup();
            }}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-600 hover:text-black"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Group</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleJoin(group.id)}
              className={`rounded-full px-5 py-2 text-[13px] font-semibold transition active:scale-95 ${
                group.joined
                  ? "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                  : "bg-black text-white hover:bg-neutral-800"
              }`}
            >
              {group.joined ? "Leave Group" : "Join Community"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
