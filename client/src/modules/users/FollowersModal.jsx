import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Search, Check, UserPlus } from "lucide-react";

export default function FollowersModal({
  isOpen,
  initialTab = "followers",
  username,
  isSelf = false,
  followers = [],
  following = [],
  isLoading = false,
  onClose,
  onToggleFollow,
  onRemoveFollower,
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [followMap, setFollowMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setSearch("");
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentList = tab === "followers" ? followers : following;
  const filteredList = currentList.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  });

  const handleToggle = async (user) => {
    const isNowFollowing = followMap[user.username] !== undefined
      ? !followMap[user.username]
      : !user.isFollowing;

    setFollowMap((prev) => ({ ...prev, [user.username]: isNowFollowing }));
    if (onToggleFollow) {
      await onToggleFollow(user.username);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[26px] border border-[#ece8de] bg-[#fbf9f4] p-5 shadow-2xl text-[#18181b] animate-scale-in max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ece8de]/70">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTab("followers")}
              className={`text-[14.5px] font-bold transition pb-1 border-b-2 ${
                tab === "followers"
                  ? "border-black text-black"
                  : "border-transparent text-[#71717a] hover:text-black"
              }`}
            >
              Followers ({followers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("following")}
              className={`text-[14.5px] font-bold transition pb-1 border-b-2 ${
                tab === "following"
                  ? "border-black text-black"
                  : "border-transparent text-[#71717a] hover:text-black"
              }`}
            >
              Following ({following.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#edeae3] hover:text-black transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative my-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="w-full rounded-full border border-[#ece8de]/80 bg-white py-2 pl-9 pr-4 text-[13px] outline-none placeholder-[#a1a1aa] focus:border-[#1863dc]"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 min-h-[220px]">
          {isLoading ? (
            <div className="py-10 text-center text-[13px] text-[#71717a]">
              Loading {tab}...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#71717a]">
              No {tab} found.
            </div>
          ) : (
            filteredList.map((u) => {
              const isFollowing =
                followMap[u.username] !== undefined
                  ? followMap[u.username]
                  : !!u.isFollowing;

              return (
                <div
                  key={u.id || u.username}
                  className="flex items-center justify-between rounded-2xl bg-white p-2.5 border border-[#ece8de]/50 shadow-2xs hover:bg-[#faf8f4] transition"
                >
                  <div
                    onClick={() => {
                      onClose();
                      navigate(`/u/${u.username}`);
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <img
                      src={u.avatar || "/default-avatar.svg"}
                      alt={u.name}
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.svg";
                      }}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-[#18181b] block truncate hover:underline">
                        {u.name}
                      </span>
                      <span className="text-[11.5px] text-[#71717a] block truncate">
                        @{u.username}
                      </span>
                      {u.mutual && (
                        <span className="text-[10.5px] text-[#a1a1aa] block truncate">
                          {u.mutual}
                        </span>
                      )}
                    </div>
                  </div>

                  {!u.isSelf && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelf && tab === "followers" && onRemoveFollower && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove @${u.username} from your followers?`)) {
                              onRemoveFollower(u.username);
                            }
                          }}
                          className="rounded-full bg-[#f0eee9] px-3 py-1.5 text-[11.5px] font-medium text-[#dc2626] hover:bg-red-50 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(u);
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-95 cursor-pointer shrink-0 ${
                          isFollowing
                            ? "bg-[#edeae3] text-neutral-800 hover:bg-[#e2ded5]"
                            : "bg-black text-white hover:bg-neutral-800"
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
