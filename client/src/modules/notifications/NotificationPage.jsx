import React, { useState } from "react";
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
} from "lucide-react";

export default function NotificationPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [unreadCount, setUnreadCount] = useState(3);

  // Notifications state
  const [items, setItems] = useState([
    {
      id: "1",
      section: "today",
      type: "likes",
      unread: true,
      user: "marcus_v",
      avatar: "/notifications/marcus.png",
      badgeType: "heart",
      titlePrefix: "marcus_v",
      titleMid: " and ",
      titleHighlight: "24 others",
      titleSuffix: " liked your photo.",
      time: "10m ago",
      thumbnail: "/notifications/post_liked.png",
      thumbnailAlt: "Liked post",
    },
    {
      id: "2",
      section: "today",
      type: "comments",
      unread: true,
      user: "sarah_lin",
      avatar: "/notifications/sarah.png",
      badgeType: "comment",
      titlePrefix: "sarah_lin",
      titleSuffix: ' commented on your reel: "The light in this is unreal! ✨"',
      time: "14m ago",
      thumbnail: "/notifications/reel_thumb.png",
      thumbnailAlt: "Reel thumbnail",
      canReply: true,
    },
    {
      id: "3",
      section: "today",
      type: "friends",
      unread: true,
      user: "lucas_m",
      avatar: "/notifications/lucas.png",
      badgeType: "friend",
      titlePrefix: "lucas_m",
      titleSuffix: " sent you a friend request.",
      subtext: "4 mutual friends · 2h ago",
      time: "2h ago",
      isFriendRequest: true,
      friendStatus: "pending",
    },
    {
      id: "4",
      section: "yesterday",
      type: "mentions",
      unread: false,
      user: "kai_t",
      avatar: "/notifications/kai.png",
      badgeType: "tag",
      titlePrefix: "kai_t",
      titleSuffix: ' tagged you in a post: "Golden hour rooftops with @elenavance 📸"',
      time: "Yesterday at 5:40 PM",
      thumbnail: "/notifications/tagged_post.png",
      thumbnailAlt: "Tagged post",
    },
    {
      id: "5",
      section: "yesterday",
      type: "all",
      unread: false,
      isGroupUpdate: true,
      groupName: "Film Photography Collective",
      time: "Yesterday at 2:15 PM",
      members: ["/notifications/member1.png", "/notifications/maya.png"],
    },
  ]);

  // Reply drawer state for Sarah's comment
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);
  const [sarahCommentLiked, setSarahCommentLiked] = useState(false);

  // Right sidebar widget states
  const [mayaRequestStatus, setMayaRequestStatus] = useState("pending");
  const [lucasWished, setLucasWished] = useState(false);
  const [liamStatus, setLiamStatus] = useState("idle");
  const [heleneStatus, setHeleneStatus] = useState("idle");

  // Mark all as read
  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
    setUnreadCount(0);
  };

  // Mark single card read on click
  const handleCardClick = (id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id && item.unread) {
          setUnreadCount((c) => Math.max(0, c - 1));
          return { ...item, unread: false };
        }
        return item;
      })
    );
  };

  // Friend request actions in feed
  const handleFeedFriendAction = (id, action) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, friendStatus: action } : item
      )
    );
  };

  // Filter tabs
  const tabs = [
    { key: "all", label: "All" },
    { key: "likes", label: "Likes & Reactions" },
    { key: "comments", label: "Comments" },
    { key: "mentions", label: "Mentions & Tags" },
    { key: "friends", label: "Friend Requests" },
  ];

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  const todayItems = filteredItems.filter((i) => i.section === "today");
  const yesterdayItems = filteredItems.filter((i) => i.section === "yesterday");

  return (
    <div className="w-full max-w-full min-w-0 pb-16 pt-2 sm:pt-4 overflow-x-hidden">
      {/* Broad layout: flex column on mobile, 12-column grid on desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full min-w-0 max-w-full">
        {/* Main Feed Column */}
        <div className="w-full lg:col-span-8 flex flex-col gap-5 sm:gap-6 min-w-0 max-w-full">
          {/* Header Row: Title, Unread Count Pill, Mark all as read */}
          <div className="flex items-center justify-between gap-2 pt-1 w-full min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h1 className="text-[24px] sm:text-[34px] font-bold tracking-tight text-[#1b1c19] shrink-0">
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
              className="flex shrink-0 items-center gap-1 sm:gap-1.5 text-right text-[11px] sm:text-[13px] font-medium text-[#78767b] hover:text-[#1b1c19] transition-colors cursor-pointer select-none"
            >
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5] shrink-0" />
              <span className="leading-tight text-right">
                <span className="sm:inline hidden">Mark all as read</span>
                <span className="sm:hidden block">Mark all<br />as read</span>
              </span>
            </button>
          </div>

          {/* Filter Tabs (Horizontal scroll on mobile, flex on desktop) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full min-w-0 max-w-full touch-pan-x">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-[13px] font-medium transition-all duration-150 select-none ${
                    isActive
                      ? "bg-[#1b1c19] text-white shadow-xs"
                      : "bg-[#f0eee9] text-[#47464b] hover:bg-[#e4e2dd] hover:text-[#1b1c19]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Feed Content */}
          <div className="space-y-6 w-full min-w-0">
            {/* Section 1: TODAY */}
            {todayItems.length > 0 && (
              <div className="space-y-3 w-full min-w-0">
                <div className="flex items-center justify-between px-1 text-xs font-medium text-[#93939f] tracking-wide uppercase">
                  <span>TODAY</span>
                  <span className="capitalize text-[11.5px] font-normal">Just now</span>
                </div>

                <div className="space-y-3 w-full min-w-0">
                  {todayItems.map((item) => (
                    <article
                      key={item.id}
                      onClick={() => handleCardClick(item.id)}
                      className={`relative rounded-2xl p-3.5 sm:p-5 transition-all duration-200 border cursor-pointer w-full min-w-0 ${
                        item.unread
                          ? "bg-[#f1f5ff] border-transparent shadow-xs hover:border-[#1863dc]/20"
                          : "bg-white border-[#ece8de]/60 shadow-xs hover:border-[#d9d9dd] hover:shadow-sm"
                      }`}
                    >
                      {/* Pulsing unread blue indicator on top right */}
                      {item.unread && (
                        <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1863dc] opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1863dc]" />
                        </span>
                      )}

                      <div
                        className={`flex justify-between gap-3 sm:gap-4 w-full min-w-0 ${
                          item.canReply ? "items-start" : "items-center"
                        }`}
                      >
                        {/* Avatar with type badge */}
                        <div className="relative shrink-0">
                          <img
                            src={item.avatar}
                            alt={item.user}
                            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover shadow-2xs"
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
                          {/* Card 1: Likes */}
                          {item.type === "likes" && (
                            <div>
                              <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                <span className="font-semibold">{item.titlePrefix}</span>
                                {item.titleMid}
                                <span className="font-semibold">{item.titleHighlight}</span>
                                {item.titleSuffix}
                              </p>
                              <span className="block mt-0.5 text-xs text-[#93939f]">
                                {item.time}
                              </span>
                            </div>
                          )}

                          {/* Card 2: Comments */}
                          {item.type === "comments" && (
                            <div>
                              <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                <span className="font-semibold">{item.titlePrefix}</span>
                                {" "}commented on your reel:{" "}
                                <span className="text-[#47464b] font-normal">
                                  "The light in this is unreal! ✨"
                                </span>
                              </p>

                              {/* Interactive actions row: Reply, Like, timestamp */}
                              <div className="mt-2 flex items-center gap-3 sm:gap-4 text-xs font-medium text-[#47464b]">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyOpen(!replyOpen);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[#eae8e3]/70 hover:bg-[#eae8e3] px-2.5 sm:px-3 py-1 text-xs transition select-none"
                                >
                                  <CornerDownRight className="h-3.5 w-3.5" />
                                  <span>Reply</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSarahCommentLiked(!sarahCommentLiked);
                                  }}
                                  className={`inline-flex items-center gap-1.5 transition select-none ${
                                    sarahCommentLiked
                                      ? "text-[#da5c40] font-semibold"
                                      : "hover:text-black"
                                  }`}
                                >
                                  <Heart
                                    className={`h-3.5 w-3.5 transition-transform active:scale-125 ${
                                      sarahCommentLiked
                                        ? "fill-[#da5c40] stroke-none"
                                        : "stroke-[2]"
                                    }`}
                                  />
                                  <span>Like</span>
                                </button>

                                <span className="text-[#93939f] font-normal text-[11.5px]">
                                  {item.time}
                                </span>
                              </div>

                              {/* Expandable Quick Reply Form */}
                              {replyOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-2.5 rounded-xl border border-[#ece8de] bg-white p-2 sm:p-2.5 shadow-2xs transition-all"
                                >
                                  {replySent ? (
                                    <div className="flex items-center gap-2 py-1 text-xs font-semibold text-emerald-600">
                                      <Check className="h-4 w-4 stroke-[2.5]" />
                                      <span>Reply posted to @sarah_lin</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && replyText.trim()) {
                                            setReplySent(true);
                                            setTimeout(() => {
                                              setReplyOpen(false);
                                              setReplySent(false);
                                              setReplyText("");
                                            }, 1500);
                                          }
                                        }}
                                        placeholder="Write a reply..."
                                        className="flex-1 min-w-0 rounded-lg bg-[#fbf9f4] px-3 py-1.5 text-xs text-black placeholder-[#93939f] focus:outline-none focus:ring-1 focus:ring-black"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        disabled={!replyText.trim()}
                                        onClick={() => {
                                          if (replyText.trim()) {
                                            setReplySent(true);
                                            setTimeout(() => {
                                              setReplyOpen(false);
                                              setReplySent(false);
                                              setReplyText("");
                                            }, 1500);
                                          }
                                        }}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white disabled:opacity-40 transition active:scale-95 shrink-0"
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Card 3: Friend Request */}
                          {item.type === "friends" && (
                            <div>
                              <p className="text-[13.5px] sm:text-[14.5px] leading-snug text-[#1b1c19]">
                                <span className="font-semibold">{item.titlePrefix}</span>
                                {" "}sent you a friend request.
                              </p>
                              <span className="block mt-0.5 text-xs text-[#93939f]">
                                {item.subtext}
                              </span>

                              {/* Action Buttons: Confirm / Delete */}
                              <div className="mt-2.5 flex items-center gap-2">
                                {item.friendStatus === "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFeedFriendAction(item.id, "confirmed");
                                      }}
                                      className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-neutral-800 active:scale-95 transition select-none"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFeedFriendAction(item.id, "deleted");
                                      }}
                                      className="rounded-full bg-[#f0eee9] px-3.5 py-1.5 text-xs font-medium text-[#47464b] hover:bg-[#e4e2dd] active:scale-95 transition select-none"
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

                        {/* Right Thumbnail if present */}
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt={item.thumbnailAlt || "Thumbnail"}
                            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl object-cover shadow-2xs"
                          />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: YESTERDAY */}
            {yesterdayItems.length > 0 && (
              <div className="space-y-3 pt-2 w-full min-w-0">
                <div className="flex items-center justify-between px-1 text-xs font-medium text-[#93939f] tracking-wide uppercase">
                  <span>YESTERDAY</span>
                  <span className="capitalize text-[11.5px] font-normal">Yesterday</span>
                </div>

                <div className="space-y-3 w-full min-w-0">
                  {yesterdayItems.map((item) => (
                    <article
                      key={item.id}
                      onClick={() => handleCardClick(item.id)}
                      className={`relative rounded-2xl p-3.5 sm:p-5 transition-all duration-200 border cursor-pointer w-full min-w-0 ${
                        item.unread
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
                              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover shadow-2xs"
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
                                <span className="font-semibold">Group update:</span> 3 new
                                posts in{" "}
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
                                <span className="font-semibold">{item.titlePrefix}</span>
                                {" "}tagged you in a post:{" "}
                                <span className="text-[#47464b] font-normal">
                                  "Golden hour rooftops with @elenavance 📸"
                                </span>
                              </p>
                              <span className="block mt-0.5 text-xs text-[#93939f]">
                                {item.time}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right side thumbnail or member avatars */}
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt={item.thumbnailAlt || "Thumbnail"}
                            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl object-cover shadow-2xs"
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
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Column (Sticky on Desktop) */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-6 sticky top-6">
          {/* Widget 1: Friend Requests */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#ece8de]/70 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[#1863dc]">
                  <UserPlus className="h-5 w-5 stroke-[2.2]" />
                </span>
                <h2 className="text-lg font-bold text-[#1b1c19]">
                  Friend Requests
                </h2>
              </div>
              <Link
                to="#"
                className="font-mono text-xs font-semibold text-[#1863dc] hover:underline"
              >
                See All (2)
              </Link>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/notifications/maya.png"
                  alt="Maya Davis"
                  className="h-10 w-10 rounded-full object-cover shadow-2xs"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13.5px] font-semibold text-[#1b1c19] truncate">
                    Maya Davis
                  </span>
                  <span className="text-xs text-[#93939f] truncate">
                    12 mutual friends
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {mayaRequestStatus === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMayaRequestStatus("confirmed")}
                      className="rounded-full bg-black px-3.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-neutral-800 active:scale-95 transition"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setMayaRequestStatus("deleted")}
                      className="rounded-full bg-[#f0eee9] px-2.5 py-1 text-xs font-medium text-[#47464b] hover:bg-[#e4e2dd] active:scale-95 transition"
                    >
                      Delete
                    </button>
                  </>
                )}

                {mayaRequestStatus === "confirmed" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#b8ede0] px-3 py-1 text-xs font-semibold text-[#00201b]">
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>Friends</span>
                  </span>
                )}

                {mayaRequestStatus === "deleted" && (
                  <span className="text-xs text-[#93939f] italic">Removed</span>
                )}
              </div>
            </div>
          </div>

          {/* Widget 2: Birthdays */}
          <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[#da5c40]">
                <Cake className="h-5 w-5 stroke-[2.2]" />
              </span>
              <h2 className="text-lg font-bold text-[#1b1c19]">Birthdays</h2>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="relative shrink-0">
                <img
                  src="/notifications/lucas.png"
                  alt="Lucas Vance"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#ffad9b]/60 shadow-2xs"
                />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-[#1b1c19]">
                  Today is <span className="font-semibold">Lucas Vance</span>'s birthday! 🎂
                </p>
                <span className="text-xs text-[#93939f]">
                  Leave a message on his timeline
                </span>
              </div>

              <button
                type="button"
                onClick={() => setLucasWished(!lucasWished)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-90 shrink-0 ${
                  lucasWished
                    ? "bg-[#ffad9b] text-[#3d0600]"
                    : "bg-[#f0eee9] text-[#1b1c19] hover:bg-black hover:text-white"
                }`}
              >
                {lucasWished ? "Wished! 🎉" : "Wish"}
              </button>
            </div>
          </div>

          {/* Widget 3: Suggested Friends */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#ece8de]/70 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[#1b1c19]">
                  <Users className="h-5 w-5 stroke-[2.2]" />
                </span>
                <h2 className="text-lg font-bold text-[#1b1c19]">
                  Suggested Friends
                </h2>
              </div>
              <Link
                to="#"
                className="font-mono text-xs font-semibold text-[#1863dc] hover:underline"
              >
                See All
              </Link>
            </div>

            <div className="flex flex-col gap-3.5 pt-1">
              {/* Liam Sterling */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src="/notifications/liam.png"
                    alt="Liam Sterling"
                    className="h-10 w-10 rounded-full object-cover shadow-2xs"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13.5px] font-semibold text-[#1b1c19] truncate">
                      Liam Sterling
                    </span>
                    <span className="text-xs text-[#93939f] truncate">
                      Followed by sarah_lin
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setLiamStatus(liamStatus === "added" ? "idle" : "added")
                  }
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-95 shrink-0 ${
                    liamStatus === "added"
                      ? "bg-[#b8ede0] text-[#00201b]"
                      : "bg-[#f0eee9] text-[#1b1c19] hover:bg-black hover:text-white"
                  }`}
                >
                  {liamStatus === "added" ? "Requested" : "Add Friend"}
                </button>
              </div>

              {/* Hélène Moreau */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src="/notifications/helene.png"
                    alt="Hélène Moreau"
                    className="h-10 w-10 rounded-full object-cover shadow-2xs"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13.5px] font-semibold text-[#1b1c19] truncate">
                      Hélène Moreau
                    </span>
                    <span className="text-xs text-[#93939f] truncate">
                      8 mutual friends
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setHeleneStatus(heleneStatus === "added" ? "idle" : "added")
                  }
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-95 shrink-0 ${
                    heleneStatus === "added"
                      ? "bg-[#b8ede0] text-[#00201b]"
                      : "bg-[#f0eee9] text-[#1b1c19] hover:bg-black hover:text-white"
                  }`}
                >
                  {heleneStatus === "added" ? "Requested" : "Add Friend"}
                </button>
              </div>
            </div>

            {/* Discover More People Footer */}
            <div className="pt-2 border-t border-[#ece8de]/60 text-center">
              <Link
                to="/explore"
                className="text-xs font-semibold text-[#1863dc] hover:underline"
              >
                Discover More People →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
