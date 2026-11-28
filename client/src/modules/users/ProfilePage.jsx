import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Camera,
  SlidersHorizontal,
  Check,
  MapPin,
  Link as LinkIcon,
  Calendar,
  Grid,
  Film,
  Tag,
  Repeat2,
  ArrowUpDown,
  Filter,
  Plus,
  Layers,
  Heart,
  MessageCircle,
  MessageSquare,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import {
  fetchUserProfile,
  updateUserProfile,
  fetchUserPosts,
  fetchUserHighlights,
  createUserHighlight,
  toggleFollowUser,
} from "./profile.api";
import { createConversation } from "../messages/messages.api";
import { updateAvatar } from "../settings/settings.api";
import EditProfileModal from "./EditProfileModal";
import FollowersModal from "./FollowersModal";
import PostViewerModal from "./PostViewerModal";
import HighlightViewerModal from "./HighlightViewerModal";
import CreateHighlightModal from "./CreateHighlightModal";
import ProfilePhotoModal from "./ProfilePhotoModal";

export default function ProfilePage() {
  const { username: paramUsername } = useParams();
  const { user } = useAuth();
  const currentUsername = paramUsername || user?.username || "";
  const accountKey = `${currentUsername}:${user?._id || user?.id || ""}`;

  return <ProfilePageContent key={accountKey} currentUsername={currentUsername} />;
}

function ProfilePageContent({ currentUsername }) {
  const { socket } = useSocket();
  const { user: authUser, setUser } = useAuth();
  const navigate = useNavigate();

  const isSelf = Boolean(
    authUser &&
      (currentUsername.toLowerCase() === authUser.username?.toLowerCase() ||
        !currentUsername)
  );

  const fallbackAvatar = "/default-avatar.svg";

  // Active tab state
  const [activeTab, setActiveTab] = useState("posts");
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState("followers");
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [showCreateHighlightModal, setShowCreateHighlightModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Loading states
  // Profile data
  const [profileData, setProfileData] = useState(() => ({
    name: (isSelf ? authUser?.name : null) || "",
    username: currentUsername,
    pronouns: (isSelf ? authUser?.pronouns : null) || "",
    roleTag: (isSelf ? authUser?.roleTag : null) || "",
    avatar: (isSelf ? authUser?.avatar : null) || fallbackAvatar,
    fallbackAvatar,
    cover: (isSelf ? authUser?.cover : null) || "",
    bio: (isSelf ? authUser?.bio : null) || "",
    website: (isSelf ? authUser?.website : null) || "",
    location: (isSelf ? authUser?.location : null) || "",
    joined: (isSelf ? authUser?.joined : null) || "",
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    isSelf,
    isFollowing: false,
    isVerified: false,
  }));

  const [highlights, setHighlights] = useState([]);
  const [posts, setPosts] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (!currentUsername) return undefined;
    let active = true;

    fetchUserProfile(currentUsername)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setProfileData((prev) => ({
            ...prev,
            name: "",
            username: currentUsername,
            avatar: fallbackAvatar,
            bio: "",
            website: "",
            location: "",
            cover: "",
            isSelf: false,
          }));
          return;
        }
        setProfileData((prev) => ({
          ...prev,
          ...data,
          avatar: data.avatar || fallbackAvatar,
          cover: data.cover || "",
          isSelf,
        }));
      })
      .catch((error) => {
        console.error("Failed to load profile:", error);
        if (active) {
          setProfileData((prev) => ({
            ...prev,
            name: "",
            username: currentUsername,
            avatar: fallbackAvatar,
            bio: "",
            website: "",
            location: "",
            cover: "",
            isSelf: false,
          }));
        }
      });

    fetchUserHighlights(currentUsername)
      .then((data) => {
        if (active) setHighlights(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load highlights:", error);
        if (active) setHighlights([]);
      });

    return () => {
      active = false;
    };
  }, [currentUsername, isSelf]);

  useEffect(() => {
    if (!currentUsername) return undefined;
    let active = true;

    fetchUserPosts(currentUsername, activeTab)
      .then((data) => {
        if (active) setPosts(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load tab posts:", error);
        if (active) setPosts([]);
      });

    return () => {
      active = false;
    };
  }, [currentUsername, activeTab]);

  // 4. Real-time Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    const handleUserUpdated = ({ username: updatedUsername, user }) => {
      const cleanUpdated = (updatedUsername || "").replace(/^@/, "").toLowerCase();
      const cleanCurrent = currentUsername.replace(/^@/, "").toLowerCase();
      if (!updatedUsername || cleanUpdated === cleanCurrent) {
        setProfileData((prev) => ({ ...prev, ...user }));
      }
    };

    const handleFollowUpdated = ({ targetUsername, isFollowing, followersCount, followingCount }) => {
      const cleanTarget = (targetUsername || "").toLowerCase();
      const cleanCurrent = (currentUsername || "").toLowerCase();
      if (!targetUsername || cleanTarget === cleanCurrent) {
        setProfileData((prev) => ({
          ...prev,
          ...(typeof isFollowing === "boolean" ? { isFollowing } : {}),
          followersCount: followersCount ?? prev.followersCount,
          followingCount: followingCount ?? prev.followingCount,
        }));
      }
    };

    const handleHighlightCreated = ({ highlight }) => {
      if (highlight) {
        setHighlights((prev) => [highlight, ...prev]);
      }
    };

    // DOM event listener for instantaneous local follow updates across tabs/components
    const handleDomFollowUpdated = (e) => {
      const detail = e.detail;
      if (detail && (!detail.username || detail.username.toLowerCase() === currentUsername.toLowerCase())) {
        setProfileData((prev) => ({
          ...prev,
          ...(typeof detail.isFollowing === "boolean" ? { isFollowing: detail.isFollowing } : {}),
          followersCount: detail.followersCount ?? (detail.isFollowing ? (prev.followersCount || 0) + 1 : Math.max(0, (prev.followersCount || 1) - 1)),
        }));
      }
    };
    window.addEventListener("staple:follow_updated", handleDomFollowUpdated);

    socket.on("user:updated", handleUserUpdated);
    socket.on("follow:updated", handleFollowUpdated);
    socket.on("highlight:created", handleHighlightCreated);

    return () => {
      window.removeEventListener("staple:follow_updated", handleDomFollowUpdated);
      socket.off("user:updated", handleUserUpdated);
      socket.off("follow:updated", handleFollowUpdated);
      socket.off("highlight:created", handleHighlightCreated);
    };
  }, [socket, currentUsername]);

  // Toggle follow/unfollow for other user profiles
  const handleToggleFollow = async () => {
    try {
      const res = await toggleFollowUser(currentUsername);
      setProfileData((prev) => ({
        ...prev,
        isFollowing: res.isFollowing,
        followersCount: res.followersCount ?? prev.followersCount,
      }));
      window.dispatchEvent(
        new CustomEvent("staple:follow_updated", {
          detail: {
            username: currentUsername,
            isFollowing: res.isFollowing,
            followersCount: res.followersCount,
          },
        })
      );
      showToast(res.isFollowing ? `Following @${currentUsername}` : `Unfollowed @${currentUsername}`);
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      showToast("Could not update follow status");
    }
  };

  // Start direct message conversation from profile (Instagram-style)
  const handleStartMessage = async () => {
    const targetId = profileData._id || profileData.id;
    if (!targetId) {
      navigate("/messages");
      return;
    }
    try {
      const conv = await createConversation({ userId: targetId });
      navigate("/messages", { state: { conversationId: conv?.id } });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      showToast("Could not open conversation");
    }
  };

  const handleShareProfile = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    showToast("Profile link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveProfile = async (formData) => {
    try {
      const updated = await updateUserProfile(formData);
      setProfileData((prev) => ({ ...prev, ...updated }));
      setShowEditModal(false);
      showToast("Profile changes saved successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      showToast("Could not save profile changes");
    }
  };

  const handleChangeAvatar = async (newUrl) => {
    try {
      const res = await updateAvatar(newUrl);
      if (!res?.user) throw new Error("Avatar update returned no user");
      setProfileData((prev) => ({ ...prev, avatar: res.user.avatar }));
      if (setUser) setUser(res.user);
      showToast("Profile photo updated!");
    } catch (err) {
      console.error("Failed to update avatar:", err);
      showToast("Could not update profile photo");
    }
  };

  const handleResetAvatar = async () => {
    try {
      const defaultAvatar = "/default-avatar.svg";
      const res = await updateAvatar("reset");
      if (!res?.user) throw new Error("Avatar reset returned no user");
      setProfileData((prev) => ({ ...prev, avatar: res.user.avatar || defaultAvatar }));
      if (setUser) setUser(res.user);
      showToast("Profile photo reset to default!");
    } catch (err) {
      console.error("Failed to reset avatar:", err);
      showToast("Could not reset profile photo");
    }
  };

  const handleCreateHighlight = async (highlightData) => {
    try {
      const created = await createUserHighlight(currentUsername, highlightData);
      setHighlights((prev) => [created, ...prev]);
      setShowCreateHighlightModal(false);
      showToast("New highlight published!");
    } catch (err) {
      console.error("Failed to create highlight:", err);
      showToast("Could not publish highlight");
    }
  };

  const openFollowers = (tab = "followers") => {
    setFollowersModalTab(tab);
    setShowFollowersModal(true);
  };

  return (
    <div
      className="w-full max-w-full min-w-0 pb-16 pt-2 sm:pt-4 overflow-x-hidden lg:h-screen lg:overflow-y-auto no-scrollbar scroll-smooth"
      style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-xl backdrop-blur animate-fade-in-slide">
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. FULL WIDTH COVER BANNER ACROSS ENTIRE PAGE                             */}
      {/* ========================================================================= */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 rounded-3xl overflow-hidden bg-neutral-200 shadow-xs border border-[#ece8de]/60">
        {profileData.cover && (
          <img
            src={profileData.cover}
            alt="Profile cover banner"
            className="w-full h-full object-cover"
          />
        )}

        {/* Cover Top-Right Action Buttons */}
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2">
          {profileData.isSelf && (
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-white/90 hover:bg-white text-[#1b1c19] px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md shadow-xs transition active:scale-95 select-none cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Edit Cover</span>
            </button>
          )}

          <button
            type="button"
            title="Display settings"
            onClick={() => showToast("Display settings: High fidelity theme active")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 hover:bg-white text-[#1b1c19] backdrop-blur-md shadow-xs transition active:scale-95 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 12-COLUMN GRID (OVERLAPPING BANNER BY -mt-12 sm:-mt-16)           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full min-w-0 max-w-full -mt-12 sm:-mt-16 relative z-10 px-1 sm:px-2">
        {/* ========================================================================= */}
        {/* LEFT / CENTER COLUMN: PROFILE CARD & POSTS (Col span: 8)                  */}
        {/* ========================================================================= */}
        <div className={`w-full ${profileData.bio || profileData.website || profileData.location ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-6 min-w-0 max-w-full`}>
          {/* Profile Card Content */}
          <div className="rounded-3xl bg-white shadow-xs border border-[#ece8de]/70 px-5 pb-6 sm:px-7 sm:pb-7 pt-4">
            {/* Avatar + Action Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-18 mb-4">
              {/* Profile Avatar */}
              <div className="relative shrink-0">
                <div
                  onClick={() => setShowPhotoModal(true)}
                  title="View / change profile photo"
                  className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full p-1 bg-white ring-4 ring-[#fbf9f4] shadow-md overflow-hidden cursor-pointer hover:ring-black/20 hover:scale-102 transition group select-none"
                >
                  <img
                    src={profileData.avatar}
                    alt={profileData.name}
                    onError={(e) => {
                      e.target.src = profileData.fallbackAvatar || fallbackAvatar;
                    }}
                    className="h-full w-full rounded-full object-cover transition-transform group-hover:scale-105"
                  />
                  {profileData.isSelf && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                      <span className="text-[10.5px] font-semibold text-white drop-shadow-md">View</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Profile Top Actions Row */}
              <div className="flex flex-wrap items-center gap-2">
                {profileData.isSelf ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="rounded-full bg-[#18181b] px-4 sm:px-5 py-2 text-xs sm:text-[13px] font-semibold text-white shadow-xs hover:bg-neutral-800 transition active:scale-95 select-none cursor-pointer"
                    >
                      Edit Profile
                    </button>

                    <button
                      type="button"
                      onClick={handleShareProfile}
                      className="relative rounded-full bg-[#f0eee9] px-3.5 sm:px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] transition active:scale-95 select-none cursor-pointer"
                    >
                      <span>Share Profile</span>
                      {copiedLink && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-black px-2 py-0.5 text-[10px] text-white whitespace-nowrap shadow-xs animate-fade-in">
                          Link copied!
                        </span>
                      )}
                    </button>

                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs sm:text-[13px] font-semibold transition active:scale-95 cursor-pointer ${
                        profileData.isFollowing
                          ? "bg-[#f0eee9] text-[#1b1c19] hover:bg-[#e4e2dd]"
                          : "bg-black text-white hover:bg-neutral-800 shadow-xs"
                      }`}
                    >
                      {profileData.isFollowing ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleStartMessage}
                      className="flex items-center gap-1.5 rounded-full bg-[#f0eee9] px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] transition active:scale-95 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Message</span>
                    </button>
                  </>
                )}

              </div>
            </div>

            {/* Name & Pronouns Row */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1b1c19]">
                  {profileData.name}
                </h1>
                {profileData.isVerified !== false && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                {profileData.pronouns && (
                  <span className="rounded-full bg-[#f0eee9] px-2 py-0.5 text-[11px] font-mono text-[#78767b]">
                    {profileData.pronouns}
                  </span>
                )}
              </div>

              {/* Handle and optional role tag */}
              <div className="flex items-center gap-2 text-xs text-[#78767b]">
                <span className="font-mono">@{profileData.username}</span>
                {profileData.roleTag && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center rounded-full bg-[#edfce9] border border-[#d8f3dc] px-2.5 py-0.5 text-[11px] font-medium text-[#2d6a4f]">
                      {profileData.roleTag}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Bio Paragraph */}
            {profileData.bio && (
              <p className="mt-3.5 text-[13.5px] sm:text-[14px] text-[#2d2d30] leading-relaxed">
                {profileData.bio}
              </p>
            )}

            {/* Metadata row: link, location, joined date */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#78767b]">
              {profileData.website && (
                <a
                  href={
                    profileData.website.startsWith("http")
                      ? profileData.website
                      : `https://${profileData.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-medium text-[#1863dc] hover:underline"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>{profileData.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}

              {profileData.location && (
                <div className="flex items-center gap-1.5 text-[#47464b]">
                  <MapPin className="h-3.5 w-3.5 text-[#78767b]" />
                  <span>{profileData.location}</span>
                </div>
              )}

              {profileData.joined && (
                <div className="flex items-center gap-1.5 text-[#93939f] font-mono text-[11px]">
                  <Calendar className="h-3 w-3" />
                  <span>{profileData.joined}</span>
                </div>
              )}
            </div>

            {/* Stats Bar Container (Clicking opens followers/following modal) */}
            <div className="mt-5 rounded-2xl bg-[#fbf9f4] p-3.5 sm:p-4 border border-[#ece8de]/60 flex items-center justify-around text-center">
              <div
                onClick={() => {
                  const el = document.getElementById("profile-posts-grid");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="cursor-pointer hover:opacity-80 transition select-none flex-1"
              >
                <span className="block text-xl sm:text-2xl font-bold text-[#1b1c19]">
                  {profileData.postsCount}
                </span>
                <span className="block text-[11px] font-mono tracking-wider text-[#93939f] uppercase mt-0.5">
                  POSTS
                </span>
              </div>
              <div className="h-7 w-px bg-[#ece8de]" />
              <div
                onClick={() => openFollowers("followers")}
                className="cursor-pointer hover:opacity-80 transition select-none flex-1"
              >
                <span className="block text-xl sm:text-2xl font-bold text-[#1b1c19]">
                  {profileData.followersCount}
                </span>
                <span className="block text-[11px] font-mono tracking-wider text-[#93939f] uppercase mt-0.5">
                  FOLLOWERS
                </span>
              </div>
              <div className="h-7 w-px bg-[#ece8de]" />
              <div
                onClick={() => openFollowers("following")}
                className="cursor-pointer hover:opacity-80 transition select-none flex-1"
              >
                <span className="block text-xl sm:text-2xl font-bold text-[#1b1c19]">
                  {profileData.followingCount}
                </span>
                <span className="block text-[11px] font-mono tracking-wider text-[#93939f] uppercase mt-0.5">
                  FOLLOWING
                </span>
              </div>
            </div>
          </div>

          {/* Curated Highlights Bar */}
          <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#93939f]">
                CURATED HIGHLIGHTS
              </span>
              <button
                type="button"
                onClick={() => setShowCreateHighlightModal(true)}
                className="text-xs font-semibold text-[#1863dc] hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>

            {/* Highlights Carousel Row */}
            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto pb-1 no-scrollbar pt-1">
              {highlights.map((hl) => (
                <div
                  key={hl.id}
                  onClick={() => setSelectedHighlight(hl)}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none"
                >
                  <div className="relative h-13 w-13 sm:h-14 sm:w-14 rounded-full p-0.5 bg-white ring-2 ring-[#ece8de] group-hover:ring-[#1863dc] transition-all shadow-2xs overflow-hidden">
                    <img
                      src={hl.image}
                      alt={hl.title}
                      onError={(e) => {
                        e.target.src = "/profile/hl_kyoto.png";
                      }}
                      className="h-full w-full rounded-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#1b1c19] text-center truncate max-w-[64px]">
                    {hl.title}
                  </span>
                </div>
              ))}

              {/* Add New Highlight Button */}
              <div
                onClick={() => setShowCreateHighlightModal(true)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none"
              >
                <div className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#f0eee9] group-hover:bg-[#e4e2dd] text-[#78767b] group-hover:text-black transition shadow-2xs">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-[#93939f] text-center">
                  New
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Filter Tabs + Sort & Filter Controls */}
          <div className="flex items-center justify-between border-b border-[#ece8de]/70 pb-2 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: "posts", label: "Posts", icon: Grid },
                { id: "reels", label: "Reels", icon: Film },
                { id: "tagged", label: "Tagged", icon: Tag },
                { id: "notes", label: "Notes", icon: Repeat2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold transition-all duration-150 select-none cursor-pointer ${
                      isActive
                        ? "bg-[#f0eee9] text-[#1b1c19]"
                        : "text-[#78767b] hover:text-[#1b1c19] hover:bg-[#fbf9f4]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right icons: Sort & Filter */}
            <div className="flex items-center gap-1 text-[#78767b]">
              <button
                type="button"
                title="Sort posts"
                onClick={() => showToast("Sorted: Most recent artifacts first")}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f0eee9] hover:text-black transition cursor-pointer"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Filter view"
                onClick={() => showToast("Filters: Visual high-res archive")}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f0eee9] hover:text-black transition cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {posts.length > 0 ? (
            <div id="profile-posts-grid" className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
            {posts.map((post) => (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 cursor-pointer shadow-xs border border-[#ece8de]/60 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Main Photo */}
                {post.image ? (
                  <img
                    src={post.image}
                    alt={post.caption || ""}
                    onError={(e) => {
                      e.currentTarget.hidden = true;
                    }}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#f5f3ee] p-3 text-center text-xs text-[#47464b]">
                    {post.caption || ""}
                  </div>
                )}

                {/* Top-Right Badge: Multi-photo / Carousel indicator */}
                {post.hasCarousel && (
                  <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs shadow-xs">
                    <Layers className="h-3 w-3" />
                  </div>
                )}

                {/* Bottom-Left Badge: Reel / Video views count */}
                {post.views && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs shadow-xs">
                    <Film className="h-2.5 w-2.5" />
                    <span>{post.views}</span>
                  </div>
                )}

                {/* Hover Overlay with Likes & Comments Count */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white font-semibold text-xs sm:text-sm backdrop-blur-[2px]">
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4 fill-white stroke-none" />
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 fill-white stroke-none" />
                    <span>{post.comments}</span>
                  </div>
                </div>
              </article>
            ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#d8d4ca] bg-white/70 px-6 py-12 text-center">
              <Grid className="h-6 w-6 text-[#93939f]" />
              <p className="text-sm font-semibold text-[#1b1c19]">
                {profileData.isSelf ? "No posts yet" : "No public posts"}
              </p>
              {profileData.isSelf && (
                <Link to="/" className="text-xs font-semibold text-[#1863dc] hover:underline">
                  Create your first post
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: REPUTATION, ACCREDITATIONS & SOUNDTRACK (Col span: 4)        */}
        {/* ========================================================================= */}
        {(profileData.bio || profileData.website || profileData.location) && (
          <aside className="w-full lg:col-span-4">
            <section className="rounded-3xl border border-[#ece8de]/70 bg-white p-6 shadow-xs">
              <h2 className="text-sm font-bold text-[#1b1c19]">About</h2>
              {profileData.bio && <p className="mt-3 text-sm leading-relaxed text-[#47464b]">{profileData.bio}</p>}
              {profileData.location && <p className="mt-3 text-xs text-[#71717a]">{profileData.location}</p>}
              {profileData.website && <a className="mt-2 block break-all text-xs text-[#1863dc] hover:underline" href={profileData.website} target="_blank" rel="noreferrer">{profileData.website}</a>}
            </section>
          </aside>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS INTEGRATION (ZERO BROWSER ALERT / CONFIRM)                         */}
      {/* ========================================================================= */}

      {/* 1. Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          isOpen={showEditModal}
          initialData={profileData}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* 2. Followers / Following Modal */}
      {showFollowersModal && (
        <FollowersModal
          isOpen={showFollowersModal}
          username={profileData.username}
          initialTab={followersModalTab}
          onClose={() => setShowFollowersModal(false)}
        />
      )}

      {/* 3. Post Detail / Viewer Modal (Like & Comments, Double Tap) */}
      {selectedPost && (
        <PostViewerModal
          key={selectedPost._id || selectedPost.id}
          isOpen={!!selectedPost}
          post={selectedPost}
          user={profileData}
          onClose={() => setSelectedPost(null)}
          onUpdatePost={(updated) => {
            setPosts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
          }}
        />
      )}

      {/* 4. Highlight Story Player */}
      {selectedHighlight && (
        <HighlightViewerModal
          isOpen={!!selectedHighlight}
          highlight={selectedHighlight}
          onClose={() => setSelectedHighlight(null)}
        />
      )}

      {/* 5. Create Highlight Modal */}
      {showCreateHighlightModal && (
        <CreateHighlightModal
          isOpen={showCreateHighlightModal}
          availablePosts={posts}
          onClose={() => setShowCreateHighlightModal(false)}
          onCreate={handleCreateHighlight}
        />
      )}

      {/* 6. Profile Photo Viewer & Changer Modal (Instagram Style) */}
      <ProfilePhotoModal
        isOpen={showPhotoModal}
        isSelf={profileData.isSelf}
        avatarUrl={profileData.avatar}
        userName={profileData.name}
        onClose={() => setShowPhotoModal(false)}
        onChangePhoto={handleChangeAvatar}
        onResetPhoto={handleResetAvatar}
      />
    </div>
  );
}
