import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Send,
  Image as ImageIcon,
  Smile,
  Mic,
  MoreVertical,
  Phone,
  Video,
  Info,
  ChevronLeft,
  Check,
  CheckCheck,
  Heart,
  Paperclip,
  Share2,
  Bell,
  BellOff,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Film,
} from "lucide-react";

export default function MessagePage() {
  // Navigation / Filter State
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [mobileActiveChat, setMobileActiveChat] = useState(false); // Mobile view toggle

  // Active Selected Conversation ID
  const [activeContactId, setActiveContactId] = useState("marcus");

  // Notes bar data
  const notes = [
    {
      id: "me",
      name: "Your note",
      avatar: "/notifications/elena.png",
      note: "+ Share note",
      isSelf: true,
    },
    {
      id: "marcus",
      name: "Marcus",
      avatar: "/notifications/marcus.png",
      note: "Tokyo rain vibes ☕",
      hasStory: true,
      active: true,
    },
    {
      id: "aris",
      name: "Aris",
      avatar: "/notifications/liam.png",
      note: "Editing film scans 🎞️",
      hasStory: true,
      active: true,
    },
    {
      id: "julian",
      name: "Julian",
      avatar: "/recreation/avatar_julian_hires.png",
      note: "Vinyl listening party",
      hasStory: false,
      active: false,
    },
    {
      id: "siobhan",
      name: "Siobhan",
      avatar: "/notifications/helene.png",
      note: "Kyoto golden hour ✨",
      hasStory: true,
      active: true,
    },
  ];

  // Conversations Master Data
  const [conversations, setConversations] = useState([
    {
      id: "marcus",
      name: "Marcus Vance",
      username: "marcus_v",
      verified: true,
      avatar: "/notifications/marcus.png",
      status: "Active now",
      online: true,
      lastMessage: "Listening right now! Let me know if everyone is meeting up at 6.",
      time: "12m",
      unread: 1,
      type: "direct",
      postsCount: 248,
      followers: "14.2k",
      following: 612,
      bio: "Capturing architecture, design, and studio spaces in SF & Tokyo.",
      messages: [
        {
          id: "m1",
          sender: "marcus",
          time: "10:14 AM",
          type: "reel",
          reelImage: "/notifications/reel_thumb.png",
          reelTitle: "Analog Workspace & Studio Tour",
          reelAuthor: "@marcus_v",
          text: "Check out this retro setup we found downtown! You would love this space.",
        },
        {
          id: "m2",
          sender: "me",
          time: "10:18 AM",
          type: "text",
          text: "Omg wow, that aesthetic is unreal! Did you grab coffee there too? ☕",
          read: true,
        },
        {
          id: "m3",
          sender: "marcus",
          time: "10:20 AM",
          type: "text",
          text: "Yeah, best pour-over in the district. They play vinyl jazz records on loop.",
        },
        {
          id: "m4",
          sender: "me",
          time: "10:22 AM",
          type: "text",
          text: "Listening right now! Let me know if everyone is meeting up at 6.",
          read: true,
        },
      ],
    },
    {
      id: "aris",
      name: "Aris Thorne",
      username: "aris_t",
      verified: false,
      avatar: "/notifications/liam.png",
      status: "Active 45m ago",
      online: false,
      lastMessage: "Haha no way! Let me check the schedule 👍",
      time: "1h",
      unread: 1,
      type: "direct",
      postsCount: 112,
      followers: "4.8k",
      following: 380,
      bio: "Street photographer & printmaker. Leica M6 & Contax G2 enthusiast.",
      messages: [
        {
          id: "a1",
          sender: "aris",
          time: "9:30 AM",
          type: "text",
          text: "Did you get the negatives back from the lab yet?",
        },
        {
          id: "a2",
          sender: "me",
          time: "9:42 AM",
          type: "text",
          text: "Just picked them up! The Portra 400 rolls look incredible.",
          read: true,
        },
        {
          id: "a3",
          sender: "aris",
          time: "9:50 AM",
          type: "text",
          text: "Haha no way! Let me check the schedule 👍",
        },
      ],
    },
    {
      id: "collective",
      name: "Film Photography Collective",
      username: "collective",
      verified: true,
      avatar: "/notifications/member1.png",
      status: "8 members active",
      online: true,
      isGroup: true,
      lastMessage: "Julian: Shared 3 new scans from the weekend photo walk.",
      time: "3h",
      unread: 0,
      type: "group",
      postsCount: 1540,
      followers: "32.1k",
      following: 89,
      bio: "Curated community of film shooters, darkroom wizards, and visual archivists.",
      messages: [
        {
          id: "c1",
          sender: "julian",
          senderName: "Julian",
          avatar: "/recreation/avatar_julian_hires.png",
          time: "7:15 AM",
          type: "text",
          text: "Good morning everyone! Location for Sunday's photo walk is confirmed at SoHo canals.",
        },
        {
          id: "c2",
          sender: "me",
          time: "7:30 AM",
          type: "text",
          text: "Count me in! Bringing the 35mm f/1.4 lens.",
          read: true,
        },
        {
          id: "c3",
          sender: "maya",
          senderName: "Maya",
          avatar: "/notifications/maya.png",
          time: "8:05 AM",
          type: "text",
          text: "Bringing extra Kodak Tri-X 400 if anyone needs rolls!",
        },
      ],
    },
    {
      id: "siobhan",
      name: "Siobhan Roy",
      username: "siobhan_r",
      verified: true,
      avatar: "/notifications/helene.png",
      status: "Active 2h ago",
      online: false,
      lastMessage: "Liked your message • 1d",
      time: "Yesterday",
      unread: 0,
      type: "direct",
      postsCount: 89,
      followers: "8.9k",
      following: 420,
      bio: "Editorial design director. Minimalist typography & brutalist spaces.",
      messages: [
        {
          id: "s1",
          sender: "siobhan",
          time: "Yesterday 4:10 PM",
          type: "text",
          text: "Loved the moodboard you shared on Staple yesterday! Where did you find that font pairing?",
        },
        {
          id: "s2",
          sender: "me",
          time: "Yesterday 4:25 PM",
          type: "text",
          text: "Thanks Siobhan! It's Space Grotesk paired with Inter. Super versatile.",
          read: true,
        },
      ],
    },
    {
      id: "noah",
      name: "Noah Sterling",
      username: "noah_s",
      verified: false,
      avatar: "/notifications/lucas.png",
      status: "Offline",
      online: false,
      lastMessage: "Sent you a voice memo (0:42)",
      time: "Oct 21",
      unread: 0,
      type: "direct",
      postsCount: 45,
      followers: "1.2k",
      following: 290,
      bio: "Sound designer & field recording artist. Ambient sounds from around the world.",
      messages: [
        {
          id: "n1",
          sender: "noah",
          time: "Oct 21, 2:15 PM",
          type: "text",
          text: "Hey Elena! Sent you a voice memo (0:42) with the audio snippet for your reel.",
        },
      ],
    },
  ]);

  // Current active conversation object
  const currentChat =
    conversations.find((c) => c.id === activeContactId) || conversations[0];

  // Message input state
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of active chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  // Send a message handler
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: `m_${Date.now()}`,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
      text: inputText.trim(),
      read: true,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentChat.id) {
          return {
            ...c,
            lastMessage: newMsg.text,
            time: "Just now",
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setInputText("");
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === "unread") return c.unread > 0;
    if (activeTab === "requests") return false; // Requests count
    return true;
  });

  // Shared photos thumbnails
  const sharedMedia = [
    "/notifications/reel_thumb.png",
    "/notifications/tagged_post.png",
    "/notifications/post_liked.png",
    "/recreation/feed_graph_hires.png",
    "/notifications/marcus.png",
    "/notifications/sarah.png",
  ];

  return (
    <div className="w-full max-w-full min-w-0 pb-12 pt-2 sm:pt-4 overflow-x-hidden">
      {/* 3-Column / 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start w-full min-w-0 max-w-full">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION LIST (Col span: 4)                             */}
        {/* Hidden on mobile if viewing active chat                                   */}
        {/* ========================================================================= */}
        <div
          className={`w-full lg:col-span-4 flex flex-col gap-4 min-w-0 max-w-full ${
            mobileActiveChat ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Messages Header Card */}
          <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-4">
            {/* Title & Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#1b1c19]">
                  Messages
                </h1>
                <span className="inline-flex items-center justify-center rounded-full bg-[#eef3fe] px-2.5 py-0.5 text-xs font-semibold text-[#1863dc]">
                  2 unread
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Message Requests"
                  className="rounded-full bg-[#f0eee9] px-3 py-1 text-xs font-medium text-[#47464b] hover:bg-[#e4e2dd] transition select-none"
                >
                  Requests (2)
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#93939f]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages or friends..."
                className="w-full rounded-2xl bg-[#fbf9f4] pl-10 pr-4 py-2 text-xs sm:text-[13px] text-[#1b1c19] placeholder-[#93939f] border border-[#ece8de]/80 focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>

            {/* Stories / Active Notes Strip */}
            <div className="pt-1">
              <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none"
                    onClick={() => {
                      if (!note.isSelf && conversations.some((c) => c.id === note.id)) {
                        setActiveContactId(note.id);
                        setMobileActiveChat(true);
                      }
                    }}
                  >
                    <div className="relative">
                      <img
                        src={note.avatar}
                        alt={note.name}
                        className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full object-cover shadow-2xs transition-transform group-hover:scale-105 ${
                          note.active
                            ? "ring-2 ring-[#1863dc] p-0.5"
                            : "ring-1 ring-black/5"
                        }`}
                      />
                      {note.isSelf && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white text-[10px] font-bold shadow-xs">
                          +
                        </span>
                      )}
                      {note.active && !note.isSelf && (
                        <span className="absolute bottom-0 right-0 flex h-3 w-3 rounded-full bg-[#10b981] ring-2 ring-white" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-[#1b1c19] max-w-[54px] truncate text-center">
                      {note.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#ece8de]/60">
              {["all", "unread", "requests"].map((tab) => {
                const isActive = activeTab === tab;
                const labels = {
                  all: "All",
                  unread: "Unread",
                  requests: "Channels",
                };
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 select-none ${
                      isActive
                        ? "bg-[#1b1c19] text-white shadow-xs"
                        : "bg-[#f0eee9] text-[#47464b] hover:bg-[#e4e2dd] hover:text-[#1b1c19]"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="space-y-2">
            {filteredConversations.map((chat) => {
              const isSelected = chat.id === activeContactId;
              return (
                <article
                  key={chat.id}
                  onClick={() => {
                    setActiveContactId(chat.id);
                    setMobileActiveChat(true);
                    // Mark as read when selected
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === chat.id ? { ...c, unread: 0 } : c
                      )
                    );
                  }}
                  className={`group relative rounded-2xl p-3.5 sm:p-4 transition-all duration-200 border cursor-pointer w-full min-w-0 select-none ${
                    isSelected
                      ? "bg-[#f1f5ff] border-[#1863dc]/30 shadow-xs"
                      : "bg-white border-[#ece8de]/70 shadow-xs hover:border-[#d9d9dd] hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar with Status indicator */}
                    <div className="relative shrink-0">
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="h-11 w-11 sm:h-12 sm:w-12 rounded-full object-cover shadow-2xs group-hover:scale-105 transition-transform"
                      />
                      {chat.online && (
                        <span className="absolute bottom-0 right-0 flex h-3 w-3 rounded-full bg-[#10b981] ring-2 ring-white" />
                      )}
                    </div>

                    {/* Chat Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={`text-[13.5px] sm:text-[14px] truncate ${
                              chat.unread > 0
                                ? "font-bold text-[#1b1c19]"
                                : "font-semibold text-[#1b1c19]"
                            }`}
                          >
                            {chat.name}
                          </span>
                          {chat.verified && (
                            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                              <Check className="h-2 w-2 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#93939f] shrink-0 font-normal">
                          {chat.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p
                          className={`text-xs truncate ${
                            chat.unread > 0
                              ? "font-semibold text-[#1b1c19]"
                              : "text-[#78767b]"
                          }`}
                        >
                          {chat.lastMessage}
                        </p>

                        {chat.unread > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1863dc] px-1 text-[10px] font-bold text-white shrink-0 shadow-2xs">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: ACTIVE CHAT CONVERSATION (Col span: 5 or 8)               */}
        {/* Visible on mobile when chat is opened                                     */}
        {/* ========================================================================= */}
        <div
          className={`w-full ${
            showRightSidebar ? "lg:col-span-5" : "lg:col-span-8"
          } flex flex-col gap-4 min-w-0 max-w-full ${
            !mobileActiveChat ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="rounded-3xl bg-white shadow-xs border border-[#ece8de]/70 flex flex-col h-[750px] overflow-hidden">
            {/* Chat Window Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ece8de]/70 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileActiveChat(false)}
                  className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eee9] text-[#1b1c19] hover:bg-[#e4e2dd]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={currentChat.avatar}
                    alt={currentChat.name}
                    className="h-10 w-10 rounded-full object-cover shadow-2xs"
                  />
                  {currentChat.online && (
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-white" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-[#1b1c19] truncate">
                      {currentChat.name}
                    </span>
                    {currentChat.verified && (
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#78767b] truncate">
                    {currentChat.status}
                  </span>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  type="button"
                  title="Voice Call"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#78767b] hover:bg-[#f0eee9] hover:text-[#1b1c19] transition"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Video Call"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#78767b] hover:bg-[#f0eee9] hover:text-[#1b1c19] transition"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  title="Toggle Contact Details"
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                    showRightSidebar
                      ? "bg-[#1b1c19] text-white"
                      : "text-[#78767b] hover:bg-[#f0eee9] hover:text-[#1b1c19]"
                  }`}
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message Stream Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#fbf9f4]/40">
              {/* Date Header Pill */}
              <div className="flex justify-center">
                <span className="rounded-full bg-[#eae8e3]/80 px-3 py-1 text-[11px] font-medium text-[#78767b] select-none shadow-2xs">
                  Today 10:14 AM
                </span>
              </div>

              {/* Messages Loop */}
              {currentChat.messages.map((msg) => {
                const isMe = msg.sender === "me";

                // Reel / Media Card Message
                if (msg.type === "reel") {
                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]"
                    >
                      <img
                        src={currentChat.avatar}
                        alt={currentChat.name}
                        className="h-8 w-8 rounded-full object-cover shrink-0 shadow-2xs mt-1"
                      />
                      <div className="space-y-2">
                        {/* Reel Card */}
                        <div className="rounded-2xl overflow-hidden border border-[#ece8de] bg-white shadow-xs max-w-[280px]">
                          <div className="relative aspect-4/3 bg-black/5 overflow-hidden group">
                            <img
                              src={msg.reelImage}
                              alt="Reel preview"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-xs">
                              <Film className="h-3 w-3" />
                              <span>Reel</span>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-semibold text-[#1b1c19] truncate">
                              {msg.reelTitle}
                            </p>
                            <span className="text-[11px] text-[#78767b]">
                              {msg.reelAuthor}
                            </span>
                          </div>
                        </div>

                        {/* Accompanying text */}
                        <div className="rounded-2xl rounded-tl-xs bg-white px-4 py-2.5 shadow-2xs border border-[#ece8de]/80 text-[13.5px] text-[#1b1c19] leading-relaxed">
                          {msg.text}
                          <span className="block mt-1 text-[10px] text-[#93939f] text-right">
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Standard Text Message
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMe && (
                      <img
                        src={msg.avatar || currentChat.avatar}
                        alt="sender"
                        className="h-7 w-7 rounded-full object-cover shrink-0 shadow-2xs mb-0.5"
                      />
                    )}

                    <div
                      className={`relative max-w-[80%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed transition-all ${
                        isMe
                          ? "bg-[#18181b] text-white rounded-br-xs shadow-xs"
                          : "bg-white text-[#1b1c19] rounded-bl-xs border border-[#ece8de]/80 shadow-2xs"
                      }`}
                    >
                      {/* Sender name for group chats */}
                      {currentChat.isGroup && !isMe && msg.senderName && (
                        <span className="block text-[11px] font-bold text-[#1863dc] mb-0.5">
                          {msg.senderName}
                        </span>
                      )}

                      <p className="break-words">{msg.text}</p>

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isMe ? "text-neutral-400" : "text-[#93939f]"
                        }`}
                      >
                        <span>{msg.time}</span>
                        {isMe && (
                          <CheckCheck className="h-3 w-3 text-[#b8ede0] stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Composer Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 border-t border-[#ece8de]/70 bg-white flex items-center gap-2"
            >
              <div className="flex items-center gap-1 text-[#78767b]">
                <button
                  type="button"
                  title="Attach Photo"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f0eee9] hover:text-[#1b1c19] transition"
                >
                  <ImageIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  title="Emoji"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f0eee9] hover:text-[#1b1c19] transition"
                >
                  <Smile className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${currentChat.name}...`}
                className="flex-1 rounded-full bg-[#fbf9f4] px-4 py-2.5 text-xs sm:text-[13.5px] text-[#1b1c19] placeholder-[#93939f] border border-[#ece8de]/80 focus:outline-none focus:ring-1 focus:ring-black transition"
              />

              {/* Send or Voice Note Button */}
              {inputText.trim() ? (
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition active:scale-95 shadow-xs"
                >
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  title="Voice Memo"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0eee9] text-[#1b1c19] hover:bg-[#e4e2dd] transition active:scale-95"
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: CONTACT PROFILE & SHARED MEDIA (Col span: 3)               */}
        {/* ========================================================================= */}
        {showRightSidebar && (
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-5 sticky top-6">
            {/* Contact Details Card */}
            <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col items-center text-center">
              {/* Profile Avatar */}
              <div className="relative mt-2">
                <img
                  src={currentChat.avatar}
                  alt={currentChat.name}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-[#fbf9f4] shadow-md"
                />
                {currentChat.online && (
                  <span className="absolute bottom-1 right-1 flex h-4 w-4 rounded-full bg-[#10b981] ring-2 ring-white" />
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <h2 className="text-base font-bold text-[#1b1c19]">
                  {currentChat.name}
                </h2>
                {currentChat.verified && (
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </span>
                )}
              </div>
              <span className="text-xs text-[#78767b]">
                @{currentChat.username}
              </span>

              {/* Stats Bar */}
              <div className="flex items-center justify-center gap-3 mt-3.5 py-2 px-3 rounded-2xl bg-[#fbf9f4] w-full text-xs font-semibold text-[#1b1c19]">
                <div>
                  <span>{currentChat.postsCount}</span>
                  <span className="block text-[10px] text-[#93939f] font-normal">
                    posts
                  </span>
                </div>
                <div className="h-6 w-px bg-[#ece8de]" />
                <div>
                  <span>{currentChat.followers}</span>
                  <span className="block text-[10px] text-[#93939f] font-normal">
                    followers
                  </span>
                </div>
                <div className="h-6 w-px bg-[#ece8de]" />
                <div>
                  <span>{currentChat.following}</span>
                  <span className="block text-[10px] text-[#93939f] font-normal">
                    following
                  </span>
                </div>
              </div>

              {/* Bio */}
              <p className="mt-3 text-xs text-[#47464b] leading-relaxed">
                {currentChat.bio}
              </p>

              {/* View Profile Button */}
              <Link
                to={`/u/${currentChat.username}`}
                className="mt-4 w-full rounded-full bg-[#f0eee9] py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#1b1c19] hover:text-white transition active:scale-98 select-none text-center"
              >
                View Profile
              </Link>
            </div>

            {/* Shared Media Card */}
            <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13.5px] font-bold text-[#1b1c19]">
                  Shared Media
                </h3>
                <span className="font-mono text-xs font-semibold text-[#1863dc] hover:underline cursor-pointer">
                  See all (14)
                </span>
              </div>

              {/* 3-Column Image Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {sharedMedia.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden bg-black/5 group cursor-pointer"
                  >
                    <img
                      src={img}
                      alt="Shared asset"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation Settings / Options Card */}
            <div className="rounded-3xl bg-white p-4 shadow-xs border border-[#ece8de]/70 flex flex-col divide-y divide-[#ece8de]/60 text-xs">
              <button
                type="button"
                className="flex items-center justify-between py-2.5 text-[#1b1c19] hover:text-[#1863dc] transition"
              >
                <div className="flex items-center gap-2.5">
                  <BellOff className="h-4 w-4 text-[#78767b]" />
                  <span>Mute Notifications</span>
                </div>
                <span className="text-[11px] text-[#93939f]">Off</span>
              </button>

              <button
                type="button"
                className="flex items-center justify-between py-2.5 text-[#1b1c19] hover:text-[#1863dc] transition"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-[#78767b]" />
                  <span>Search in Conversation</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#93939f]" />
              </button>

              <button
                type="button"
                className="flex items-center justify-between py-2.5 text-[#1b1c19] hover:text-[#1863dc] transition"
              >
                <div className="flex items-center gap-2.5">
                  <Paperclip className="h-4 w-4 text-[#78767b]" />
                  <span>Shared Links</span>
                </div>
                <span className="text-[11px] font-semibold text-[#1863dc]">
                  2 links
                </span>
              </button>

              <button
                type="button"
                className="flex items-center justify-between py-2.5 text-[#da5c40] hover:text-red-700 transition"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Block {currentChat.name.split(" ")[0]}</span>
                </div>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
