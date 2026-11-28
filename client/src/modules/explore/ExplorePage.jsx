import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Play,
  Pause,
  Music2,
  Radio,
  Disc3,
  Check,
  Users,
  Utensils,
  Aperture,
  Armchair,
  Layers,
  Camera,
  ArrowRight,
  Heart,
  MessageCircle,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  fetchExploreFeed,
  fetchExploreSidebar,
  toggleExplorePostLike,
  toggleExplorePostBookmark,
  addExplorePostComment,
  toggleFollowCreator,
  toggleJoinCommunity,
} from "./explore.api";
import { searchPeople, sendFriendRequestApi } from "../Home/home.api";
import { audioEngine } from "./audioPlayer";
import ExplorePostModal from "./ExplorePostModal";
import ExploreFilterModal from "./ExploreFilterModal";

const categories = [
  { id: "for-you", label: "For You" },
  { id: "photography", label: "Photography" },
  { id: "travel", label: "Travel" },
  { id: "architecture", label: "Architecture & Design" },
  { id: "food", label: "Food & Dining" },
  { id: "style", label: "Style" },
  { id: "music", label: "Music & Nightlife" },
  { id: "outdoors", label: "Outdoors" },
];

export default function ExplorePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [activeView, setActiveView] = useState("all"); // 'all' | 'photos' | 'reels'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("trending");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // People search state
  const [matchingPeople, setMatchingPeople] = useState([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Dynamic Feed & Sidebar states from Database
  const [items, setItems] = useState([]);
  const [audioTrends, setAudioTrends] = useState([]);
  const [creators, setCreators] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // Interactive Double-Click Heart Animation
  const [flyingHeartPostId, setFlyingHeartPostId] = useState(null);

  // Modals
  const [selectedPost, setSelectedPost] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState(null);

  const isInitialMount = useRef(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Load Explore Feed from Backend DB
  const loadExploreData = async (showLoader = false) => {
    if (showLoader || items.length === 0) {
      setIsLoading(true);
    }
    try {
      const feedItems = await fetchExploreFeed({
        category: activeCategory,
        view: activeView,
        q: searchQuery,
        sort: sortBy,
      });

      let filtered = feedItems || [];
      if (verifiedOnly) {
        filtered = filtered.filter((item) => item.authorId?.isVerified);
      }
      setItems(filtered);
    } catch (err) {
      console.error("Explore feed load error:", err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Explore Sidebar from Backend DB
  const loadSidebar = async () => {
    try {
      const sidebar = await fetchExploreSidebar();
      if (sidebar) {
        setAudioTrends(sidebar.audioTrends || []);
        setCreators(sidebar.creators || []);
        setCommunities(sidebar.communities || []);
      }
    } catch (err) {
      console.warn("Explore sidebar error:", err);
    }
  };

  useEffect(() => {
    loadExploreData(true);
  }, [activeCategory, activeView, sortBy, verifiedOnly]);

  useEffect(() => {
    loadSidebar();
    return () => {
      audioEngine.stop();
    };
  }, []);

  // Debounced search (skips first render to avoid flicker)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      loadExploreData(false);
      if (searchQuery.trim().length > 0) {
        setIsSearchingPeople(true);
        try {
          const results = await searchPeople(searchQuery.trim());
          setMatchingPeople(results);
        } catch (err) {
          console.warn("Failed to search people on explore:", err);
          setMatchingPeople([]);
        } finally {
          setIsSearchingPeople(false);
        }
      } else {
        setMatchingPeople([]);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendFriendRequest = async (person, e) => {
    e.stopPropagation();
    try {
      const res = await sendFriendRequestApi(person.id);
      const newStatus = res.status || "added";
      setMatchingPeople((prev) =>
        prev.map((p) => (p.id === person.id ? { ...p, friendStatus: newStatus } : p))
      );
      showToast(
        newStatus === "added"
          ? `Friend request sent to @${person.username}!`
          : `Friend request cancelled`
      );
    } catch (err) {
      console.error("Failed to send friend request:", err);
      showToast("Could not send friend request");
    }
  };

  // Handler: Double-Click Like with Flying Heart Animation
  const handleItemDoubleClick = async (postId, e) => {
    e.stopPropagation();
    setFlyingHeartPostId(postId);
    setTimeout(() => {
      setFlyingHeartPostId((curr) => (curr === postId ? null : curr));
    }, 850);

    const post = items.find((p) => p._id === postId);
    if (post && !post.isLiked) {
      // Optimistic update
      setItems((prev) =>
        prev.map((it) =>
          it._id === postId
            ? { ...it, isLiked: true, likesCount: (it.likesCount || 0) + 1 }
            : it
        )
      );

      try {
        const res = await toggleExplorePostLike(postId);
        if (res) {
          setItems((prev) =>
            prev.map((it) =>
              it._id === postId
                ? { ...it, isLiked: res.isLiked, likesCount: res.likesCount }
                : it
            )
          );
          if (selectedPost && selectedPost._id === postId) {
            setSelectedPost((curr) => ({
              ...curr,
              isLiked: res.isLiked,
              likesCount: res.likesCount,
            }));
          }
        }
      } catch (err) {
        console.warn("Explore like error:", err);
      }
    }
  };

  // Handler: Single Like Toggle
  const handleToggleLike = async (postId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it._id === postId) {
          const newLiked = !it.isLiked;
          const newCount = Math.max(0, (it.likesCount || 0) + (newLiked ? 1 : -1));
          return { ...it, isLiked: newLiked, likesCount: newCount };
        }
        return it;
      })
    );

    try {
      const res = await toggleExplorePostLike(postId);
      if (res && selectedPost && selectedPost._id === postId) {
        setSelectedPost((curr) => ({
          ...curr,
          isLiked: res.isLiked,
          likesCount: res.likesCount,
        }));
      }
    } catch (err) {
      console.warn("Toggle like error:", err);
    }
  };

  // Handler: Bookmark Toggle
  const handleToggleBookmark = async (postId) => {
    setItems((prev) =>
      prev.map((it) => (it._id === postId ? { ...it, isSaved: !it.isSaved } : it))
    );

    try {
      const res = await toggleExplorePostBookmark(postId);
      showToast(res.isSaved ? "Saved to Bookmarks" : "Removed from Bookmarks");
      if (selectedPost && selectedPost._id === postId) {
        setSelectedPost((curr) => ({ ...curr, isSaved: res.isSaved }));
      }
    } catch (err) {
      console.warn("Toggle bookmark error:", err);
    }
  };

  // Handler: Add Comment to Explore Post
  const handleAddComment = async (postId, text) => {
    try {
      const res = await addExplorePostComment(postId, text);
      if (res && res.comment) {
        setItems((prev) =>
          prev.map((it) => {
            if (it._id === postId) {
              return {
                ...it,
                commentsCount: res.commentsCount,
                comments: res.comments,
              };
            }
            return it;
          })
        );
        if (selectedPost && selectedPost._id === postId) {
          setSelectedPost((curr) => ({
            ...curr,
            commentsCount: res.commentsCount,
            comments: res.comments,
          }));
        }
        showToast("Comment posted!");
      }
    } catch (err) {
      console.error("Add comment error:", err);
    }
  };

  // Handler: Toggle Creator Follow
  const handleToggleFollow = async (creatorId) => {
    try {
      const res = await toggleFollowCreator(creatorId);
      setCreators((prev) =>
        prev.map((creator) =>
          creator.id === creatorId
            ? {
                ...creator,
                isFollowing: res.isFollowing,
                followersCount: res.followersCount,
              }
            : creator
        )
      );
      showToast(res.isFollowing ? "Creator followed" : "Creator unfollowed");
      if (selectedPost && selectedPost.authorId?._id === creatorId) {
        setSelectedPost((curr) => ({
          ...curr,
          authorId: {
            ...curr.authorId,
            isFollowing: res.isFollowing,
            followersCount: res.followersCount,
          },
        }));
      }
    } catch (error) {
      console.error("Follow error:", error);
      showToast("Could not update follow status");
    }
  };

  // Handler: Toggle Community Join
  const handleToggleCommunity = async (communityId) => {
    try {
      const res = await toggleJoinCommunity(communityId);
      showToast(res.joined ? "Joined community" : "Left community");
    } catch (error) {
      console.error("Community toggle error:", error);
      showToast("Could not update community membership");
    }
  };

  // Handler: Play Ambient Synthesizer Audio
  const handleToggleAudio = (audioId) => {
    if (playingAudioId === audioId) {
      audioEngine.stop();
      setPlayingAudioId(null);
    } else {
      audioEngine.playTrack(audioId);
      setPlayingAudioId(audioId);
    }
  };

  const getCommunityIcon = (iconName) => {
    switch (iconName) {
      case "utensils":
        return Utensils;
      case "aperture":
        return Aperture;
      case "armchair":
        return Armchair;
      default:
        return Users;
    }
  };

  const getAudioIcon = (id) => {
    switch (id) {
      case "golden-hour":
        return Music2;
      case "tokyo-rain":
        return Radio;
      case "analog-tape":
        return Disc3;
      default:
        return Radio;
    }
  };

  // Render Grid Cards Matching Staple Layout
  const renderCard = (item, idx) => {
    if (!item) return null;
    const media = item.media && item.media.length > 0 ? item.media[0] : null;
    const isReel = item.isReel;

    // First card: 2 columns, tall showcase with bottom frosted bar
    if (idx === 0) {
      return (
        <div
          key={item._id}
          onClick={() => setSelectedPost(item)}
          onDoubleClick={(e) => handleItemDoubleClick(item._id, e)}
          className="group relative col-span-2 overflow-hidden rounded-2xl bg-neutral-900 shadow-xs aspect-[340/423] cursor-pointer select-none animate-fade-in-slide"
        >
          {media?.url ? (
            <img
              src={media.url}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : null}

          {/* Double-Click Flying Heart Overlay */}
          {flyingHeartPostId === item._id && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="animate-heart-pop-fly text-7xl select-none filter drop-shadow-[0_10px_28px_rgba(239,68,68,0.85)]">
                ❤️
              </div>
            </div>
          )}

          {/* Hover Overlay with Stats */}
          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white text-[14px] font-bold z-10 backdrop-blur-2xs">
            <div className="flex items-center gap-1.5">
              <Heart className="h-5 w-5 fill-current text-white" />
              <span>{item.likesCount || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-5 w-5 fill-current text-white" />
              <span>{item.commentsCount || 0}</span>
            </div>
          </div>

          {/* Carousel / Layers Icon in top right */}
          <div className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs z-20">
            <Layers className="h-3.5 w-3.5" />
          </div>

          {/* Bottom Frosted Glass Pill Bar */}
          {item.pillTags && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-[#e8e4d8]/85 px-3 py-2 text-[11px] font-medium text-[#18181b] backdrop-blur-md z-20">
              {item.pillTags.map((pt, pIdx) => (
                <span
                  key={pIdx}
                  className="rounded-full bg-white/70 px-2 py-0.5 shadow-2xs truncate max-w-[32%]"
                >
                  {pt}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Standard card layout
    const isSpecialReel = idx === 1;
    const isSpecialBanner = idx === 6;

    let spanClasses = "col-span-1 aspect-square";
    if (isSpecialReel) spanClasses = "col-span-1 min-h-[220px]";
    if (idx === 2) spanClasses = "col-span-1 h-[140px] sm:h-[160px]";
    if (isSpecialBanner) spanClasses = "col-span-2 h-[155px] sm:h-[175px]";

    return (
      <div
        key={item._id}
        onClick={() => setSelectedPost(item)}
        onDoubleClick={(e) => handleItemDoubleClick(item._id, e)}
        className={`group relative overflow-hidden rounded-2xl bg-neutral-900 shadow-xs cursor-pointer select-none animate-fade-in-slide ${spanClasses}`}
      >
        {media?.url ? (
          <img
            src={media.url}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : null}

        {/* Double-Click Flying Heart Overlay */}
        {flyingHeartPostId === item._id && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div className="animate-heart-pop-fly text-6xl select-none filter drop-shadow-[0_10px_28px_rgba(239,68,68,0.85)]">
              ❤️
            </div>
          </div>
        )}

        {/* Hover Overlay with Stats */}
        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white text-[13px] font-bold z-10 backdrop-blur-2xs">
          <div className="flex items-center gap-1.5">
            <Heart className="h-4.5 w-4.5 fill-current text-white" />
            <span>{item.likesCount || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-4.5 w-4.5 fill-current text-white" />
            <span>{item.commentsCount || 0}</span>
          </div>
        </div>

        {/* Badges */}
        {isReel ? (
          <>
            <div className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs z-20">
              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
            </div>
            {item.views && (
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs z-20">
                <Play className="h-2.5 w-2.5 fill-current" />
                <span>{item.views}</span>
              </div>
            )}
          </>
        ) : isSpecialBanner ? (
          <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs z-20">
            <Camera className="h-3 w-3" />
          </div>
        ) : (
          <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs z-20">
            <Layers className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full lg:h-screen lg:overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-xl backdrop-blur animate-fade-in-slide">
          {toastMessage}
        </div>
      )}

      {/* MAIN TWO-COLUMN SPLIT: Explore Feed (Grid) + Right Sidebar */}
      <div className="flex justify-between gap-6 pt-1 lg:gap-8 xl:gap-9 w-full lg:h-screen lg:overflow-hidden">
        {/* CENTER COLUMN: Search + Category Tags + Explore Feed - ONLY THIS SCROLLS */}
        <section className="w-full flex-1 max-w-[700px] xl:max-w-[740px] space-y-3.5 lg:h-screen lg:overflow-y-auto no-scrollbar pt-2 pb-28">
          {/* TOP SEARCH BAR (Spans broad across the feed) */}
          <div className="relative">
            <div className="relative flex items-center justify-between rounded-full border border-[#ece8de]/70 bg-white px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] focus-within:ring-1 focus-within:ring-[#1863dc]">
              <div className="flex flex-1 items-center gap-3">
                <Search className="h-4.5 w-4.5 text-[#71717a]" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search photos, creators, reels, places, and tags..."
                  className="w-full bg-transparent text-[13px] text-[#18181b] placeholder-[#71717a] outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setMatchingPeople([]);
                    }}
                    className="text-[#71717a] hover:text-black mr-2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-[#71717a]">
                <kbd className="hidden rounded bg-[#f0eee9] px-2 py-0.5 font-mono text-[10.5px] text-[#71717a] sm:inline-block">
                  ⌘K
                </kbd>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  aria-label="Filter"
                  className="rounded-full p-1 text-[#71717a] hover:bg-[#f0eee9] hover:text-black transition"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* People search results dropdown on Explore */}
            {searchQuery.trim().length > 0 && isSearchFocused && (
              <div className="absolute top-12 inset-x-0 z-40 max-h-80 overflow-y-auto rounded-2xl border border-[#ece8de] bg-white p-2 shadow-2xl animate-fade-in no-scrollbar">
                <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                  Matching People & Creators
                </div>
                {isSearchingPeople ? (
                  <div className="flex items-center justify-center p-4 text-xs text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching people...
                  </div>
                ) : matchingPeople.length > 0 ? (
                  <div className="space-y-1">
                    {matchingPeople.map((person) => (
                      <div
                        key={person.id}
                        onMouseDown={() => navigate(`/profile/${person.username}`)}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#faf9f5] cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={person.avatar}
                            alt={person.name}
                            onError={(e) => {
                              e.target.src = "/default-avatar.svg";
                            }}
                            className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-black/5"
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-neutral-900 truncate">
                              {person.name}
                            </p>
                            <p className="text-[11.5px] text-neutral-500 truncate">
                              @{person.username}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onMouseDown={(e) => handleSendFriendRequest(person, e)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 transition active:scale-95 ${
                            person.friendStatus === "friends"
                              ? "bg-[#b8ede0] text-[#00201b]"
                              : person.friendStatus === "added"
                              ? "bg-[#b8ede0] text-[#00201b]"
                              : "bg-[#f0eee9] text-[#1b1c19] hover:bg-black hover:text-white"
                          }`}
                        >
                          {person.friendStatus === "friends"
                            ? "Friends"
                            : person.friendStatus === "added"
                            ? "Requested"
                            : "Add Friend"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-neutral-500">
                    No people found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* HORIZONTAL CATEGORY TAGS SCROLLER */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                    isActive
                      ? "bg-black text-white shadow-xs font-semibold"
                      : "bg-[#f0eee9] text-[#27272a] hover:bg-[#e6e2d8]"
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Header Row: "Explore Feed" + Realtime badge + View Switcher */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-bold text-[#18181b]">Explore Feed</h1>
              <span className="rounded-md border border-[#dcd8ce] bg-[#edeae3]/80 px-2 py-0.5 font-mono text-[9.5px] font-medium tracking-wide text-[#71717a]">
                Realtime
              </span>
            </div>

            {/* Filter Toggle: All | Photos | Reels */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveView("all")}
                className={`rounded-full px-3 py-0.5 text-[12px] font-medium transition ${
                  activeView === "all"
                    ? "bg-[#edeae3] font-semibold text-black shadow-2xs"
                    : "text-[#71717a] hover:text-black"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveView("photos")}
                className={`rounded-full px-3 py-0.5 text-[12px] font-medium transition ${
                  activeView === "photos"
                    ? "bg-[#edeae3] font-semibold text-black shadow-2xs"
                    : "text-[#71717a] hover:text-black"
                }`}
              >
                Photos
              </button>
              <button
                type="button"
                onClick={() => setActiveView("reels")}
                className={`rounded-full px-3 py-0.5 text-[12px] font-medium transition ${
                  activeView === "reels"
                    ? "bg-[#edeae3] font-semibold text-black shadow-2xs"
                    : "text-[#71717a] hover:text-black"
                }`}
              >
                Reels
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#ece8de]/60 bg-white p-14 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <Loader2 className="h-6 w-6 animate-spin text-[#1863dc]" />
              <p className="mt-3 text-[13px] font-medium text-[#71717a]">
                Curating visual explore stream...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#ece8de]/60 bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)] animate-fade-in-slide">
              <Sparkles className="h-8 w-8 text-neutral-400" />
              <h3 className="mt-3 text-[16px] font-bold text-[#18181b]">
                No visual works found
              </h3>
              <p className="mt-1 text-[12.5px] text-[#71717a] max-w-sm">
                Try searching for another keyword or switch category tags above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("for-you");
                  setActiveView("all");
                }}
                className="mt-4 rounded-full bg-black px-4 py-2 text-[12px] font-semibold text-white shadow-xs"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* DYNAMIC EXPLORE MEDIA GRID */}
          {items.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {/* Row 1: Item 0 (spans 2 cols) + Item 1 & 2 stacked in right sub-column */}
              {items[0] && renderCard(items[0], 0)}

              {(items[1] || items[2]) && (
                <div className="col-span-1 flex flex-col gap-2.5 sm:gap-3">
                  {items[1] && renderCard(items[1], 1)}
                  {items[2] && renderCard(items[2], 2)}
                </div>
              )}

              {/* Subsequent items */}
              {items.slice(3).map((item, subIdx) => renderCard(item, subIdx + 3))}
            </div>
          )}
        </section>

        {/* RIGHT SIDEBAR COLUMN: Sticky, Spacious, Interactive - FIXED, DOES NOT SCROLL WITH FEED */}
        <aside className="sticky top-0 hidden h-screen w-[330px] xl:w-[350px] shrink-0 space-y-4 xl:block overflow-hidden pt-2 pb-16">
          {/* WIDGET 1: TRENDING REELS & AUDIO (Real Ambient Web Audio Synthesizer) */}
          {audioTrends.length > 0 && (
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-[14.5px] font-bold text-[#18181b]">
                Trending Reels & Audio
              </h2>
              <span className="font-mono text-[9.5px] font-bold tracking-wider text-[#ef4444]">
                VIRAL
              </span>
            </div>

            <div className="space-y-3">
              {audioTrends.map((audio) => {
                const Icon = getAudioIcon(audio.id);
                const isPlaying = playingAudioId === audio.id;
                return (
                  <div key={audio.id} className="flex items-center justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAudio(audio.id)}
                        className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl transition ${
                          audio.bgColor || "bg-[#e0f2fe]"
                        } ${audio.iconColor || "text-[#0284c7]"} active:scale-95`}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 fill-current animate-pulse" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-[#18181b]">
                          {audio.title}
                        </p>
                        <p className="truncate text-[10.5px] text-[#71717a]">
                          {isPlaying ? "● Synthesizer Playing" : audio.artist}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-[#dcfce7] px-2 py-0.5 font-mono text-[10px] font-bold text-[#15803d]">
                      {audio.growth}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => showToast("4 verified audio tracks in sync")}
              className="mt-4 flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-[#1863dc] hover:underline"
            >
              <span>See All Audio Trends</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          )}

          {/* WIDGET 2: POPULAR CREATORS (Synced with Backend DB) */}
          {creators.length > 0 && (
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-[14.5px] font-bold text-[#18181b]">Popular Creators</h2>
            </div>

            <div className="space-y-3">
              {creators.map((creator) => (
                <div key={creator.id} className="flex items-center justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      onError={(e) => {
                        e.target.src = creator.fallback;
                      }}
                      className="h-8.5 w-8.5 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-[12.5px] font-semibold text-[#18181b]">
                          {creator.name}
                        </span>
                        {creator.isVerified && (
                          <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-[#1863dc] text-white">
                            <Check className="h-1.5 w-1.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[10.5px] text-[#71717a]">
                        @{creator.username}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFollow(creator.id)}
                    className={`rounded-full px-4 py-1 text-[11.5px] font-semibold transition active:scale-95 ${
                      creator.isFollowing
                        ? "bg-[#edeae3] text-[#18181b]"
                        : "bg-black text-white hover:bg-neutral-800"
                    }`}
                  >
                    {creator.isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* WIDGET 3: TRENDING COMMUNITIES (Synced with Backend DB) */}
          {communities.length > 0 && (
          <div className="rounded-[22px] border border-[#e2ded5]/80 bg-[#ede9df]/60 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-1.5">
              <h2 className="text-[14.5px] font-bold text-[#18181b]">
                Trending Communities
              </h2>
              <Users className="h-4 w-4 text-[#71717a]" />
            </div>

            <p className="text-[11.5px] text-[#52525b] leading-relaxed pb-3">
              Connect with photo curators, culinary tastemakers, and visual storytellers.
            </p>

            <div className="space-y-2.5">
              {communities.map((comm) => {
                const Icon = getCommunityIcon(comm.icon);
                return (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-[#f4f2ea] text-[#3f3f46]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-[#18181b]">
                          {comm.name}
                        </p>
                        <p className="truncate font-mono text-[10px] text-[#71717a]">
                          {comm.members}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleCommunity(comm.id)}
                      className={`rounded-full px-3.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                        comm.joined
                          ? "bg-black text-white"
                          : "bg-[#edeae3] text-[#18181b] hover:bg-[#e4e0d6]"
                      }`}
                    >
                      {comm.joined ? "Joined" : "Join"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </aside>
      </div>

      {/* INSTAGRAM-STYLE POST DETAIL MODAL */}
      <ExplorePostModal
        isOpen={!!selectedPost}
        post={selectedPost}
        currentUser={user}
        onClose={() => setSelectedPost(null)}
        onToggleLike={handleToggleLike}
        onToggleBookmark={handleToggleBookmark}
        onAddComment={handleAddComment}
        onToggleFollow={handleToggleFollow}
      />

      {/* EXPLORE FILTERS MODAL */}
      <ExploreFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewFilter={activeView}
        setViewFilter={setActiveView}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        onApply={() => loadExploreData(true)}
      />
    </div>
  );
}
