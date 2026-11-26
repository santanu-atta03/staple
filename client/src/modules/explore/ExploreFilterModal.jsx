import React from "react";
import { X, Check, SlidersHorizontal, Sparkles, Flame, Clock, Eye } from "lucide-react";

export default function ExploreFilterModal({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
  viewFilter,
  setViewFilter,
  verifiedOnly,
  setVerifiedOnly,
  onApply,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[26px] border border-[#ece8de] bg-[#fbf9f4] p-5 sm:p-6 shadow-2xl text-[#18181b] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#ece8de]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#18181b]">Explore Filters</h3>
              <p className="text-[11.5px] text-[#71717a]">Customize your algorithmic visual stream</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#edeae3] hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sort By Section */}
        <div className="mt-4 space-y-2">
          <label className="text-[12px] font-bold uppercase tracking-wider text-[#71717a]">
            Sort By
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "trending", label: "Trending", icon: Flame },
              { id: "popular", label: "Popular", icon: Eye },
              { id: "recent", label: "Recent", icon: Clock },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = sortBy === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-[12px] font-medium transition ${
                    isSelected
                      ? "border-black bg-black text-white shadow-xs"
                      : "border-[#ece8de] bg-white text-[#27272a] hover:bg-[#f2efe9]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Media Format Section */}
        <div className="mt-4 space-y-2">
          <label className="text-[12px] font-bold uppercase tracking-wider text-[#71717a]">
            Media Format
          </label>
          <div className="flex rounded-2xl bg-[#edeae3] p-1 gap-1">
            {[
              { id: "all", label: "All Formats" },
              { id: "photos", label: "Photos Only" },
              { id: "reels", label: "Reels / Videos" },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setViewFilter(fmt.id)}
                className={`flex-1 rounded-xl py-1.5 text-[12px] font-medium transition ${
                  viewFilter === fmt.id
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "text-[#71717a] hover:text-black"
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Verified Creators Toggle */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#ece8de] bg-white p-3.5 shadow-2xs">
          <div>
            <span className="text-[13px] font-semibold text-[#18181b] block">
              Verified Creators Only
            </span>
            <span className="text-[11px] text-[#71717a] block">
              Show works exclusively from accredited curators and artists
            </span>
          </div>

          <button
            type="button"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`flex h-6 w-11 items-center rounded-full transition-colors p-1 ${
              verifiedOnly ? "bg-black" : "bg-[#dcd8ce]"
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                verifiedOnly ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-2 border-t border-[#ece8de]">
          <button
            type="button"
            onClick={() => {
              setSortBy("trending");
              setViewFilter("all");
              setVerifiedOnly(false);
            }}
            className="text-[12.5px] font-medium text-neutral-500 hover:text-black transition"
          >
            Reset Filters
          </button>

          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="rounded-full bg-black px-6 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-neutral-800 active:scale-95"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
