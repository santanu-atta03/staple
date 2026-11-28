import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Check,
  Tag,
  Users,
  CornerDownRight,
  Send,
  Cake,
  X,
  Trash2,
  Loader2,
  Bell,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
} from "lucide-react";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  replyNotificationComment,
  toggleLikeNotificationComment,
  respondNotificationFriendRequest,
  fetchNotificationSidebar,
  respondSidebarFriendRequest,
  toggleWishBirthday,
  toggleSuggestedFriend,
} from "./notification.api";
import DeleteNotificationModal from "./DeleteNotificationModal";
import { toggleFollowUser } from "../users/profile.api";
import { useSocket } from "../../context/SocketContext";

export default function NotificationPage() {
  const { setUnreadCount: setSocketUnreadCount } = useSocket();
  const [activeTab, setActiveTab] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic notifications list from backend DB
  const [items, setItems] = useState([]);

  // Dynamic right sidebar widgets from backend DB
  const [sidebarData, setSidebarData] = useState({
    friendRequests: [],
    birthdays: [],
    suggestedFriends: [],
  });

  // Interactive Reply Drawer State
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Flying heart animation on double-click
  const [flyingHeartId, setFlyingHeartId] = useState(null);

  // Custom modal for deleting notification
  const [deletingNotification, setDeletingNotification] = useState(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // 1. Fetch notifications and unread badge from backend
  const loadNotificationsData = async (tab = activeTab) => {
    setIsLoading(true);
    try {
      const data = await fetchNotifications(tab);
      if (data) {
        setItems(data.notifications || []);
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch sidebar widgets from backend
  const loadSidebar = async () => {
    try {
      const data = await fetchNotificationSidebar();
      if (data) {
        setSidebarData({
          friendRequests: data.friendRequests || [],
          birthdays: data.birthdays || [],
          suggestedFriends: data.suggestedFriends || [],
        });
      }
    } catch (err) {
      console.warn("Failed to load notification sidebar:", err);
    }
  };

  useEffect(() => {
    loadNotificationsData(activeTab);
  }, [activeTab]);

  useEffect(() => {
    loadSidebar();
    fetchUnreadCount()
      .then((c) => setUnreadCount(c))
      .catch(() => {});
  }, []);

  // Handler: Mark all as read (backend synced)
  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    showToast("All notifications marked as read");

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn("Failed to sync mark all read:", err);
    }
  };

  // Handler: Mark single notification read on click (backend synced)
  const handleCardClick = async (id, isRead) => {
    if (isRead) return;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn("Failed to mark single read:", err);
    }
  };

  // Handler: Delete notification confirm (backend synced)
  const handleConfirmDelete = async (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingNotification(null);
    showToast("Notification removed");

    try {
      const res = await deleteNotification(id);
      if (res && typeof res.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      showToast("Failed to delete notification");
    }
  };

  // Handler: Double-click like on notification item
  const handleItemDoubleClick = async (id, item, e) => {
    if (e?.target?.closest("button, a, input, textarea")) return;

    setFlyingHeartId(id);
    setTimeout(() => {
      setFlyingHeartId((curr) => (curr === id ? null : curr));
    }, 850);

    // If it's a comment or like notification, toggle like
    if (!item.isLiked) {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, isLiked: true } : it))
      );
      try {
        await toggleLikeNotificationComment(id);
      } catch (err) {
        console.warn("Failed to like comment notification:", err);
      }
    }
  };

  // Handler: Toggle Like on Comment Notification
  const handleToggleLikeComment = async (id, e) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isLiked: !it.isLiked } : it))
    );

    try {
      const res = await toggleLikeNotificationComment(id);
      if (res) {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, isLiked: res.isLiked } : it))
        );
      }
    } catch (err) {
      console.warn("Failed to toggle like comment:", err);
    }
  };

  // Handler: Send Quick Reply (backend synced)
  const handleSendReply = async (id, userName, e) => {
    e?.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    const sentText = replyText.trim();

    try {
      const res = await replyNotificationComment(id, sentText);
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === id) {
            return {
              ...it,
              replies: [...(it.replies || []), res || { text: sentText }],
            };
          }
          return it;
        })
      );
      setActiveReplyId(null);
      setReplyText("");
      showToast(`Reply posted to @${userName || "user"}`);
    } catch (err) {
      console.error("Failed to post reply:", err);
      showToast("Failed to post reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Handler: Friend request response in feed
  const handleFeedFriendAction = async (id, action, e) => {
    e.stopPropagation();
    const status = action === "accept" || action === "confirmed" ? "confirmed" : "deleted";

    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, friendStatus: status } : it))
    );

    try {
      await respondNotificationFriendRequest(id, action);
      showToast(status === "confirmed" ? "Follow request accepted" : "Follow request removed");
    } catch (err) {
      console.error("Failed to respond to follow request:", err);
    }
  };

  // Handler: Sidebar Follow Request Action
  const handleSidebarFriendAction = async (id, action) => {
    const status = action === "accept" || action === "confirmed" ? "confirmed" : "deleted";

    setSidebarData((prev) => ({
      ...prev,
      friendRequests: prev.friendRequests.map((r) =>
        r.id === id ? { ...r, status } : r
      ),
    }));

    try {
      await respondSidebarFriendRequest(id, action);
      showToast(status === "confirmed" ? "Follow request accepted" : "Follow request removed");
    } catch (err) {
      console.error("Failed to update sidebar follow request:", err);
    }
  };

  // Handler: Sidebar Birthday Wish
  const handleToggleBirthdayWish = async (id) => {
    setSidebarData((prev) => ({
      ...prev,
      birthdays: prev.birthdays.map((b) =>
        b.id === id ? { ...b, isWished: !b.isWished } : b
      ),
    }));

    try {
      const res = await toggleWishBirthday(id);
      showToast(res.isWished ? "Birthday wish sent! 🎉" : "Birthday wish cancelled");
    } catch (err) {
      console.error("Failed to toggle birthday wish:", err);
    }
  };

  // Handler: Sidebar Toggle Suggested Friend
  const handleToggleSuggestedFriend = async (id) => {
    setSidebarData((prev) => ({
      ...prev,
      suggestedFriends: prev.suggestedFriends.map((f) =>
        f.id === id
          ? { ...f, status: f.status === "added" ? "idle" : "added" }
          : f
      ),
    }));

    try {
      const res = await toggleSuggestedFriend(id);
      showToast(res.status === "added" ? "Follow request sent" : "Request cancelled");
    } catch (err) {
      console.error("Failed to toggle suggested follow:", err);
    }
  };

  // Filter tabs
  const tabs = [
    { key: "all", label: "All" },
    { key: "likes", label: "Likes & Reactions" },
    { key: "comments", label: "Comments" },
    { key: "mentions", label: "Mentions & Tags" },
    { key: "friends", label: "Followers" },
  ];

  const todayItems = items.filter((i) => i.section === "today");
  const yesterdayItems = items.filter((i) => i.section === "yesterday" || !i.section);

  return (
    <div className="w-full lg:h-screen lg:overflow-hidden select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-xl backdrop-blur animate-fade-in-slide">
          {toastMessage}
        </div>
      )}

      {/* Main Grid: Broad and expansive across the page */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full min-w-0 max-w-full lg:h-screen lg:overflow-hidden">
        {/* ========================================================================= */}
        {/* CENTER COLUMN: Notifications Feed (Col span: 8) - ONLY THIS SCROLLS     */}
        {/* ========================================================================= */}
        <section className="w-full lg:col-span-8 flex flex-col gap-4 sm:gap-5 min-w-0 max-w-full lg:h-screen lg:overflow-y-auto no-scrollbar pt-2 sm:pt-4 pb-28">
          {/* Header Row: Title, Unread Count Pill, Mark all as read */}
          <div className="flex items-center justify-between gap-2 pt-1 w-full min-w-0 px-1 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <h1 className="text-[24px] sm:text-[32px] font-bold tracking-tight text-[#1b1c19] shrink-0">
                Notifications
              </h1>
              <span
                className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold transition-all duration-300 ${
                  unreadCount > 0
                    ? "bg-[#eef3fe] text-[#1863dc]"
                    : "bg-[#eae8e3] text-[#78767b]"
                }`}
              >
                {unreadCount} unread
              </span>
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex shrink-0 items-center gap-1.5 text-right text-[12px] sm:text-[13px] font-medium text-[#78767b] hover:text-[#1b1c19] transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4 stroke-[2.5] shrink-0 text-[#1863dc]" />
              <span>Mark all as read</span>
            </button>
          </div>

          {/* Filter Tabs (Horizontal scroll on mobile, flex on desktop - fully visible and unclipped) */}
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar w-full min-w-0 shrink-0 min-h-[48px]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150 inline-flex items-center justify-center whitespace-nowrap cursor-pointer select-none leading-normal ${
                    isActive
                      ? "bg-[#1b1c19] text-white shadow-xs ring-1 ring-black/10"
                      : "bg-[#f0eee9] text-[#47464b] hover:bg-[#e4e2dd] hover:text-[#1b1c19]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#ece8de]/60 bg-white p-12 text-center shadow-xs">
              <Loader2 className="h-6 w-6 animate-spin text-[#1863dc]" />
              <p className="mt-3 text-[13px] font-medium text-[#71717a]">
                Fetching your activity...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#ece8de]/60 bg-white p-12 text-center shadow-xs animate-fade-in-slide">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f2ea] text-[#71717a]">
                <Bell className="h-6 w-6 stroke-[1.8]" />
              </div>
              <h3 className="mt-3 text-[16px] font-bold text-[#18181b]">
                No notifications in this tab
              </h3>
              <p className="mt-1 text-[13px] text-[#71717a] max-w-xs leading-relaxed">
                When someone likes your photos, comments on your reels, or sends you a friend request, you'll see them here.
              </p>
            </div>
          )}

          {/* Dynamic Feed Content */}
          {!isLoading && items.length > 0 && (
            <div className="space-y-6 w-full min-w-0">
              {/* Section 1: TODAY */}
              {todayItems.length > 0 && (
                <div className="space-y-3 w-full min-w-0">
                  <div className="flex items-center justify-between px-1 text-xs font-bold text-[#93939f] tracking-wider uppercase">
                    <span>TODAY</span>
                    <span className="capitalize text-[11.5px] font-normal">Just now</span>
                  </div>

                  <div className="space-y-3 w-full min-w-0">
                    {todayItems.map((item) => (
                      <article
                        key={item.id}
                        onDoubleClick={(e) => handleItemDoubleClick(item.id, item, e)}
                        onClick={() => handleCardClick(item.id, item.isRead)}
                        className={`group/card relative rounded-2xl p-4 sm:p-5 transition-all duration-200 border cursor-pointer w-full min-w-0 animate-fade-in-slide overflow-hidden ${
                          !item.isRead
                            ? "bg-[#f1f5ff] border-transparent shadow-xs hover:border-[#1863dc]/20"
                            : "bg-white border-[#ece8de]/60 shadow-xs hover:border-[#d9d9dd] hover:shadow-sm"
                        }`}
                      >
                        {/* Double-Click Flying Heart Overlay */}
                        {flyingHeartId === item.id && (
                          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                            <div className="animate-heart-pop-fly text-5xl select-none filter drop-shadow-[0_4px_16px_rgba(239,68,68,0.7)]">
                              ❤️
                            </div>
                          </div>
                        )}

                        {/* Pulsing unread blue indicator on top right */}
                        {!item.isRead && (
                          <span className="absolute top-4 right-4 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1863dc] opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1863dc]" />
                          </span>
                        )}

                        <div className="flex items-start justify-between gap-3 sm:gap-4 w-full min-w-0">
                          {/* Avatar with type badge */}
                          <div className="relative shrink-0">
                            <img
                              src={item.avatar}
                              alt={item.user}
                              onError={(e) => {
                                e.target.src = item.fallbackAvatar || "/notifications/marcus.png";
                              }}
                              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover shadow-2xs ring-1 ring-black/5"
                            />

                            {/* Heart Badge */}
                            {item.badgeType === "heart" && (
                              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ffad9b] text-[#da5c40] shadow-xs">
                                <Heart className="h-3 w-3 fill-current stroke-none" />
                              </span>
                            )}

                            {/* Comment Badge */}
                            {item.badgeType === "comment" && (
                              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#b8ede0] text-[#35675d] shadow-xs">
                                <MessageCircle className="h-3 w-3 fill-current stroke-none" />
                              </span>
                            )}

                            {/* Friend Request Badge */}
                            {item.badgeType === "friend" && (
                              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1b1c19] text-white shadow-xs">
                                <UserPlus className="h-3 w-3 stroke-[2.2]" />
                              </span>
                            )}
                          </div>

                          {/* Content text */}
                          <div className="flex-1 min-w-0 pr-1">
                            {/* Card: Likes */}
                            {item.type === "likes" && (
                              <div>
                                <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                  <Link
                                    to={`/u/${item.user}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold hover:underline"
                                  >
                                    {item.titlePrefix || item.userName}
                                  </Link>
                                  {item.titleMid || " and "}
                                  <span className="font-semibold">{item.titleHighlight || "24 others"}</span>
                                  {item.titleSuffix || " liked your photo."}
                                </p>
                                <span className="block mt-0.5 text-xs text-[#93939f]">
                                  {item.time}
                                </span>
                              </div>
                            )}

                            {/* Card: Comments */}
                            {item.type === "comments" && (
                              <div>
                                <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                  <Link
                                    to={`/u/${item.user}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold hover:underline"
                                  >
                                    {item.titlePrefix || item.userName}
                                  </Link>{" "}
                                  commented on your reel:{" "}
                                  <span className="text-[#47464b] font-normal">
                                    "{item.commentText || "The light in this is unreal! ✨"}"
                                  </span>
                                </p>

                                {/* Interactive actions row: Reply, Like, timestamp */}
                                <div className="mt-2 flex items-center gap-3 sm:gap-4 text-xs font-medium text-[#47464b]">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveReplyId(activeReplyId === item.id ? null : item.id);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-[#eae8e3]/70 hover:bg-[#eae8e3] px-3 py-1 text-xs transition active:scale-95"
                                  >
                                    <CornerDownRight className="h-3.5 w-3.5" />
                                    <span>Reply</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleLikeComment(item.id, e)}
                                    className={`inline-flex items-center gap-1.5 transition active:scale-125 ${
                                      item.isLiked
                                        ? "text-[#da5c40] font-semibold"
                                        : "hover:text-black"
                                    }`}
                                  >
                                    <Heart
                                      className={`h-3.5 w-3.5 transition-transform ${
                                        item.isLiked
                                          ? "fill-[#da5c40] stroke-none scale-110"
                                          : "stroke-[2]"
                                      }`}
                                    />
                                    <span>Like</span>
                                  </button>

                                  <span className="text-[#93939f] font-normal text-[11.5px]">
                                    {item.time}
                                  </span>
                                </div>

                                {/* Replies list if any */}
                                {item.replies && item.replies.length > 0 && (
                                  <div className="mt-2.5 space-y-1.5 pl-3 border-l-2 border-[#e4e1d7]">
                                    {item.replies.map((rep, rIdx) => (
                                      <p key={rIdx} className="text-[12px] text-[#27272a]">
                                        <span className="font-semibold text-black">
                                          {rep.author?.name || "You"}
                                        </span>{" "}
                                        {rep.text}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {/* Expandable Quick Reply Form */}
                                {activeReplyId === item.id && (
                                  <form
                                    onSubmit={(e) =>
                                      handleSendReply(item.id, item.titlePrefix || item.user, e)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-2.5 flex items-center gap-2 rounded-xl border border-[#ece8de] bg-white p-2 shadow-2xs animate-fade-in"
                                  >
                                    <input
                                      type="text"
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder={`Reply to @${item.titlePrefix || item.user}...`}
                                      className="flex-1 min-w-0 rounded-lg bg-[#fbf9f4] px-3 py-1.5 text-xs text-black placeholder-[#93939f] focus:outline-none focus:ring-1 focus:ring-black"
                                      autoFocus
                                    />
                                    <button
                                      type="submit"
                                      disabled={!replyText.trim() || isSubmittingReply}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white disabled:opacity-40 transition active:scale-95 shrink-0"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                )}
                              </div>
                            )}

                            {/* Card: Follow Notification */}
                            {item.type === "follow" && (
                              <div>
                                <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                  <Link
                                    to={`/u/${item.user}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold hover:underline"
                                  >
                                    {item.titlePrefix || item.userName || item.user}
                                  </Link>{" "}
                                  started following you.
                                </p>
                                <span className="block mt-0.5 text-xs text-[#93939f]">
                                  {item.subtext || item.time}
                                </span>
                                <div className="mt-2.5 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const res = await toggleFollowUser(item.user);
                                        setItems((prev) =>
                                          prev.map((it) =>
                                            it.id === item.id
                                              ? { ...it, isFollowingBack: res.isFollowing, isRead: true }
                                              : it
                                          )
                                        );
                                        showToast(
                                          res.isFollowing
                                            ? `Following @${item.user}`
                                            : `Unfollowed @${item.user}`
                                        );
                                      } catch {
                                        showToast("Could not update follow status");
                                      }
                                    }}
                                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                                      item.isFollowingBack
                                        ? "bg-[#f0eee9] text-[#1b1c19] hover:bg-[#e4e2dd]"
                                        : "bg-black text-white hover:bg-neutral-800 shadow-2xs"
                                    }`}
                                  >
                                    {item.isFollowingBack ? "Following" : "Follow Back"}
                                  </button>
                                  <Link
                                    to={`/u/${item.user}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded-full bg-[#f0eee9] px-3.5 py-1.5 text-xs font-medium text-[#47464b] hover:bg-[#e4e2dd] transition"
                                  >
                                    View Profile
                                  </Link>
                                </div>
                              </div>
                            )}

                            {/* Card: Friend Request */}
                            {item.type === "friends" && (
                              <div>
                                <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                  <Link
                                    to={`/u/${item.user}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold hover:underline"
                                  >
                                    {item.titlePrefix || item.userName}
                                  </Link>{" "}
                                  sent you a friend request.
                                </p>
                                <span className="block mt-0.5 text-xs text-[#93939f]">
                                  {item.subtext}
                                </span>

                                {/* Action Buttons: Confirm / Delete */}
                                <div className="mt-2.5 flex items-center gap-2">
                                  {(!item.friendStatus || item.friendStatus === "pending") && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => handleFeedFriendAction(item.id, "confirmed", e)}
                                        className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-neutral-800 active:scale-95 transition"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleFeedFriendAction(item.id, "deleted", e)}
                                        className="rounded-full bg-[#f0eee9] px-3.5 py-1.5 text-xs font-medium text-[#47464b] hover:bg-[#e4e2dd] active:scale-95 transition"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}

                                  {item.friendStatus === "confirmed" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#b8ede0] px-3.5 py-1 text-xs font-semibold text-[#00201b]">
                                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                      <span>Friends</span>
                                    </span>
                                  )}

                                  {item.friendStatus === "deleted" && (
                                    <span className="text-xs text-[#93939f] italic">
                                      Request removed
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right side Thumbnail / Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.thumbnail && (
                              <img
                                src={item.thumbnail}
                                alt={item.thumbnailAlt || "Thumbnail"}
                                className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-cover shadow-2xs"
                              />
                            )}

                            {/* Dismiss button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingNotification(item);
                              }}
                              title="Remove notification"
                              className="opacity-0 group-hover/card:opacity-100 p-1 rounded-full text-neutral-400 hover:text-[#ef4444] transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: YESTERDAY */}
              {yesterdayItems.length > 0 && (
                <div className="space-y-3 pt-2 w-full min-w-0">
                  <div className="flex items-center justify-between px-1 text-xs font-bold text-[#93939f] tracking-wider uppercase">
                    <span>YESTERDAY</span>
                    <span className="capitalize text-[11.5px] font-normal">Yesterday</span>
                  </div>

                  <div className="space-y-3 w-full min-w-0">
                    {yesterdayItems.map((item) => (
                      <article
                        key={item.id}
                        onDoubleClick={(e) => handleItemDoubleClick(item.id, item, e)}
                        onClick={() => handleCardClick(item.id, item.isRead)}
                        className={`group/card relative rounded-2xl p-4 sm:p-5 transition-all duration-200 border cursor-pointer w-full min-w-0 animate-fade-in-slide overflow-hidden ${
                          !item.isRead
                            ? "bg-[#f1f5ff] border-transparent shadow-xs"
                            : "bg-white border-[#ece8de]/60 shadow-xs hover:border-[#d9d9dd] hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
                          {/* Left avatar or group icon */}
                          {item.isGroupUpdate ? (
                            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-[#b8ede0]/70 text-[#35675d]">
                              <Users className="h-5 w-5 stroke-[2]" />
                            </div>
                          ) : (
                            <div className="relative shrink-0">
                              <img
                                src={item.avatar}
                                alt={item.user}
                                onError={(e) => {
                                  e.target.src = item.fallbackAvatar || "/notifications/marcus.png";
                                }}
                                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover shadow-2xs ring-1 ring-black/5"
                              />
                              {item.badgeType === "tag" && (
                                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#eae8e3] text-[#47464b] shadow-xs">
                                  <Tag className="h-3 w-3 stroke-[2.2]" />
                                </span>
                              )}
                            </div>
                          )}

                          {/* Content text */}
                          <div className="flex-1 min-w-0 pr-1">
                            {item.isGroupUpdate ? (
                              <div>
                                <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                  <span className="font-semibold">Group update:</span> 3 new posts in{" "}
                                  <span className="font-medium text-[#1863dc] hover:underline cursor-pointer">
                                    {item.groupName}
                                  </span>
                                  .
                                </p>
                                <span className="block mt-0.5 text-xs text-[#93939f]">
                                  {item.time}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                  <Link
                                    to={`/u/${item.user}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold hover:underline"
                                  >
                                    {item.titlePrefix || item.userName}
                                  </Link>{" "}
                                  tagged you in a post:{" "}
                                  <span className="text-[#47464b] font-normal">
                                    {item.titleSuffix || '"Golden hour rooftops 📸"'}
                                  </span>
                                </p>
                                <span className="block mt-0.5 text-xs text-[#93939f]">
                                  {item.time}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right side thumbnail or member avatars */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.thumbnail && (
                              <img
                                src={item.thumbnail}
                                alt={item.thumbnailAlt || "Thumbnail"}
                                className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-cover shadow-2xs"
                              />
                            )}

                            {item.members && (
                              <div className="flex items-center -space-x-2 shrink-0">
                                {item.members.map((m, idx) => (
                                  <img
                                    key={idx}
                                    src={m}
                                    alt="Group member"
                                    className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-xs"
                                  />
                                ))}
                              </div>
                            )}

                            {/* Dismiss button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingNotification(item);
                              }}
                              title="Remove notification"
                              className="opacity-0 group-hover/card:opacity-100 p-1 rounded-full text-neutral-400 hover:text-[#ef4444] transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* RIGHT SIDEBAR COLUMN: Widgets (Col span: 4) - FIXED & STICKY, NO SCROLL   */}
        {/* ========================================================================= */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-0 h-screen overflow-hidden pt-2 sm:pt-4 pb-6">
          {/* Widget 1: Follow Requests */}
          <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[#1863dc]">
                  <UserPlus className="h-5 w-5 stroke-[2.2]" />
                </span>
                <h2 className="text-[16px] font-bold text-[#1b1c19]">
                  Follow Requests
                </h2>
              </div>
              <button
                type="button"
                onClick={() => showToast("All follow requests synced")}
                className="font-mono text-xs font-semibold text-[#1863dc] hover:underline"
              >
                See All
              </button>
            </div>

            <div className="space-y-3">
              {(sidebarData.friendRequests || []).map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={req.avatar}
                      alt={req.name}
                      onError={(e) => {
                        e.target.src = "/notifications/marcus.png";
                      }}
                      className="h-10 w-10 rounded-full object-cover shadow-2xs ring-1 ring-black/5"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13.5px] font-semibold text-[#1b1c19] truncate">
                        {req.name}
                      </span>
                      <span className="text-xs text-[#93939f] truncate">
                        {req.mutualFriends}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(!req.status || req.status === "pending") && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSidebarFriendAction(req.id, "confirmed")}
                          className="rounded-full bg-black px-3.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-neutral-800 active:scale-95 transition"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSidebarFriendAction(req.id, "deleted")}
                          className="rounded-full bg-[#f0eee9] px-2.5 py-1 text-xs font-medium text-[#47464b] hover:bg-[#e4e2dd] active:scale-95 transition"
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {req.status === "confirmed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#b8ede0] px-3 py-1 text-xs font-semibold text-[#00201b]">
                        <Check className="h-3 w-3 stroke-[3]" />
                        <span>Friends</span>
                      </span>
                    )}

                    {req.status === "deleted" && (
                      <span className="text-xs text-[#93939f] italic">Removed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 2: Birthdays */}
          <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[#da5c40]">
                <Cake className="h-5 w-5 stroke-[2.2]" />
              </span>
              <h2 className="text-[16px] font-bold text-[#1b1c19]">Birthdays</h2>
            </div>

            {(sidebarData.birthdays || []).map((bday) => (
              <div key={bday.id} className="flex items-center gap-3 pt-1">
                <div className="relative shrink-0">
                  <img
                    src={bday.avatar}
                    alt={bday.name}
                    onError={(e) => {
                      e.target.src = "/notifications/lucas.png";
                    }}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-[#ffad9b]/60 shadow-2xs"
                  />
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-[#1b1c19]">
                    Today is <span className="font-semibold">{bday.name}</span>'s birthday! 🎂
                  </p>
                  <span className="text-xs text-[#93939f]">
                    {bday.subtext}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleBirthdayWish(bday.id)}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-90 shrink-0 ${
                    bday.isWished
                      ? "bg-[#ffad9b] text-[#3d0600]"
                      : "bg-[#f0eee9] text-[#1b1c19] hover:bg-black hover:text-white"
                  }`}
                >
                  {bday.isWished ? "Wished! 🎉" : "Wish"}
                </button>
              </div>
            ))}
          </div>

          {/* Widget 3: Suggested Friends */}
          <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[#1b1c19]">
                  <Users className="h-5 w-5 stroke-[2.2]" />
                </span>
                <h2 className="text-[16px] font-bold text-[#1b1c19]">
                  Suggested Friends
                </h2>
              </div>
              <Link
                to="/explore"
                className="font-mono text-xs font-semibold text-[#1863dc] hover:underline"
              >
                See All
              </Link>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              {(sidebarData.suggestedFriends || []).map((person) => (
                <div key={person.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={person.avatar}
                      alt={person.name}
                      onError={(e) => {
                        e.target.src = "/notifications/marcus.png";
                      }}
                      className="h-9 w-9 rounded-full object-cover shadow-2xs ring-1 ring-black/5"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13.5px] font-semibold text-[#1b1c19] truncate">
                        {person.name}
                      </span>
                      <span className="text-xs text-[#93939f] truncate">
                        {person.subtitle}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSuggestedFriend(person.id)}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-95 shrink-0 ${
                      person.status === "added"
                        ? "bg-[#b8ede0] text-[#00201b]"
                        : "bg-[#f0eee9] text-[#1b1c19] hover:bg-black hover:text-white"
                    }`}
                  >
                    {person.status === "added" ? "Requested" : "Add Friend"}
                  </button>
                </div>
              ))}
            </div>

            {/* Discover More People Footer */}
            <div className="pt-2 border-t border-[#ece8de]/60 text-center">
              <Link
                to="/explore"
                className="text-xs font-semibold text-[#1863dc] hover:underline inline-flex items-center gap-1"
              >
                <span>Discover More People</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* CUSTOM DELETE NOTIFICATION CONFIRMATION MODAL (NO ALERT) */}
      <DeleteNotificationModal
        isOpen={!!deletingNotification}
        notification={deletingNotification}
        onClose={() => setDeletingNotification(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
