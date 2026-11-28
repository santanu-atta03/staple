import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  Plus,
  Send,
  Image as ImageIcon,
  Smile,
  Mic,
  MoreVertical,
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
  Trash2,
  Loader2,
  X,
  Reply,
  Forward,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import {
  fetchConversations,
  fetchNotes,
  updateUserNote,
  deleteUserNote,
  replyToNote,
  sendMessage,
  toggleLikeMessage,
  deleteConversation,
  toggleMuteConversation,
  toggleBlockConversation,
  createConversation,
  reactToMessage,
  forwardMessage,
  unsendMessage,
  fetchConversation,
} from "./messages.api";
import DeleteChatModal from "./DeleteChatModal";
import NewMessageModal from "./NewMessageModal";
import ShareNoteModal from "./ShareNoteModal";
import ViewNoteModal from "./ViewNoteModal";
import ForwardModal from "./ForwardModal";

export default function MessagePage() {
  const { socket } = useSocket();
  const { user: authUser } = useAuth();
  const currentUserId = (authUser?._id || authUser?.id || "").toString();
  const location = useLocation();

  // Navigation / Filter State
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileActiveChat, setMobileActiveChat] = useState(false); // Mobile view toggle

  // Active Selected Conversation ID: initially null so people list shows with empty placeholder on right
  const [activeContactId, setActiveContactId] = useState(null);

  // Info sidebar: initially closed, only opens when user clicks the info button (i)
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // Dynamic state loaded from backend DB
  const [conversations, setConversations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Message input state
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef(null);

  // Floating heart reaction animation on double click
  const [flyingHeartMsgId, setFlyingHeartMsgId] = useState(null);

  // Message Actions States: React, Reply, Forward
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  // Modals state
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isShareNoteOpen, setIsShareNoteOpen] = useState(false);
  const [selectedNoteForView, setSelectedNoteForView] = useState(null);
  const [chatToDelete, setChatToDelete] = useState(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Prevent jumping/scrolling the window upon opening Messages
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 1. Initial Load: Fetch conversations and notes from backend DB
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [convsData, notesData] = await Promise.all([
        fetchConversations(searchQuery, activeTab),
        fetchNotes(),
      ]);
      setConversations(convsData || []);
      setNotes(notesData || []);
    } catch (err) {
      console.error("Failed to load messages data:", err);
      setConversations([]);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [activeTab]);

  // Auto-open conversation if navigated from a user's profile
  useEffect(() => {
    const targetConvId = location.state?.conversationId;
    if (!targetConvId) return;
    setActiveContactId(targetConvId);
    setMobileActiveChat(true);
    if (!conversations.some((c) => c.id === targetConvId)) {
      fetchConversation(targetConvId)
        .then((conv) => {
          if (conv) {
            setConversations((prev) =>
              prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
            );
          }
        })
        .catch(() => {});
    }
  }, [location.state?.conversationId, conversations.length]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(searchQuery, activeTab)
        .then((data) => setConversations(data || []))
        .catch(() => {});
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Real-Time Socket Integration
  useEffect(() => {
    if (!socket) return;

    if (activeContactId) {
      socket.emit("chat:join", activeContactId);
    }

    const handleMessageReceived = ({ chatId, message }) => {
      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const existingMessages = c.messages || [];
          // Deduplicate by message ID or replace matching temporary message
          const alreadyExists = existingMessages.some(
            (m) => m.id === message.id || (m.id?.startsWith("temp_") && m.text === message.text)
          );
          const updatedMessages = alreadyExists
            ? existingMessages.map((m) =>
                m.id === message.id || (m.id?.startsWith("temp_") && m.text === message.text)
                  ? message
                  : m
              )
            : [...existingMessages, message];

          return {
            ...c,
            lastMessage: message.text || "Sent an attachment",
            time: "Just now",
            messages: c.id === activeContactId ? updatedMessages : c.messages,
          };
        })
      );
    };

    const handleMessageLiked = ({ chatId, messageId, isLiked }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: (c.messages || []).map((m) =>
                m.id === messageId ? { ...m, isLiked } : m
              ),
            };
          }
          return c;
        })
      );
    };

    const handleMessageReacted = ({ chatId, messageId, reactions }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: (c.messages || []).map((m) =>
                m.id === messageId ? { ...m, reactions } : m
              ),
            };
          }
          return c;
        })
      );
    };

    const handleMessageUnsent = ({ chatId, messageId, lastMessage }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            const filtered = (c.messages || []).filter((m) => m.id !== messageId);
            return {
              ...c,
              lastMessage: lastMessage || (filtered.length ? filtered[filtered.length - 1].text : "No messages yet"),
              messages: filtered,
            };
          }
          return c;
        })
      );
    };

    const handleNotesUpdated = ({ notes: updatedNotes, userId: updatedUserId }) => {
      if (updatedNotes && (!updatedUserId || updatedUserId === currentUserId)) {
        setNotes(updatedNotes);
      } else {
        fetchNotes().then((data) => setNotes(data || [])).catch(() => {});
      }
    };

    socket.on("message:received", handleMessageReceived);
    socket.on("message:liked", handleMessageLiked);
    socket.on("message:reacted", handleMessageReacted);
    socket.on("message:unsent", handleMessageUnsent);
    socket.on("notes:updated", handleNotesUpdated);

    return () => {
      if (activeContactId) {
        socket.emit("chat:leave", activeContactId);
      }
      socket.off("message:received", handleMessageReceived);
      socket.off("message:liked", handleMessageLiked);
      socket.off("message:reacted", handleMessageReacted);
      socket.off("message:unsent", handleMessageUnsent);
      socket.off("notes:updated", handleNotesUpdated);
    };
  }, [socket, activeContactId]);

  // Current active conversation object
  const currentChat = conversations.find((c) => c.id === activeContactId) || null;

  const isInitialContactSwitchRef = React.useRef(true);
  const prevMsgCountRef = React.useRef(0);

  // Auto-scroll to bottom of active chat stream (smooth, non-intrusive)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const msgs = currentChat?.messages || [];
    const countChanged = msgs.length !== prevMsgCountRef.current;
    prevMsgCountRef.current = msgs.length;

    if (isInitialContactSwitchRef.current) {
      container.scrollTop = container.scrollHeight;
      isInitialContactSwitchRef.current = false;
      return;
    }

    if (countChanged) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 160;
      const lastMsg = msgs[msgs.length - 1];

      const isMyLastMsg = lastMsg?.senderId
        ? String(lastMsg.senderId) === currentUserId
        : lastMsg?.sender === "me";
      if (isMyLastMsg || isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [currentChat?.messages]);

  useEffect(() => {
    isInitialContactSwitchRef.current = true;
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeContactId]);

  // Handler: Send Message (Real-Time + Backend DB, with Reply support)
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeContactId || isSending) return;

    const messageText = inputText.trim();
    const currentReply = replyingToMessage;
    setInputText("");
    setReplyingToMessage(null);
    setIsSending(true);

    // Optimistic message
    const tempMsg = {
      id: `temp_${Date.now()}`,
      sender: "me",
      senderId: currentUserId,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
      text: messageText,
      replyTo: currentReply ? { id: currentReply.id, text: currentReply.text, sender: currentReply.sender, senderName: currentReply.senderName } : undefined,
      reactions: [],
      read: true,
      isLiked: false,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeContactId) {
          return {
            ...c,
            lastMessage: messageText,
            time: "Just now",
            messages: [...(c.messages || []), tempMsg],
          };
        }
        return c;
      })
    );

    try {
      const res = await sendMessage(activeContactId, { text: messageText, replyTo: currentReply });
      if (res && res.message) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeContactId) return c;
            const currentMsgs = c.messages || [];
            const hasSavedAlready = currentMsgs.some((m) => m.id === res.message.id);
            const nextMsgs = hasSavedAlready
              ? currentMsgs.filter((m) => m.id !== tempMsg.id)
              : currentMsgs.map((m) => (m.id === tempMsg.id ? res.message : m));
            return {
              ...c,
              lastMessage: res.message.text || messageText,
              time: "Just now",
              messages: nextMsgs,
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      showToast("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Handler: React to Message with Emoji
  const handleReactWithEmoji = async (msgId, emoji) => {
    setActiveReactionMsgId(null);
    if (!activeContactId) return;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeContactId) {
          return {
            ...c,
            messages: (c.messages || []).map((m) => {
              if (m.id !== msgId) return m;
              const reactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
              const existingIdx = reactions.findIndex((r) => r.user === "me" && r.emoji === emoji);
              if (existingIdx !== -1) {
                reactions.splice(existingIdx, 1);
              } else {
                const filtered = reactions.filter((r) => r.user !== "me");
                filtered.push({ emoji, user: "me" });
                return { ...m, reactions: filtered };
              }
              return { ...m, reactions };
            }),
          };
        }
        return c;
      })
    );

    try {
      await reactToMessage(activeContactId, msgId, emoji);
    } catch (err) {
      console.warn("Failed to react to message:", err);
    }
  };

  // Handler: Forward Message to Target Chats
  const handleForwardMessage = async (msgId, targetChatIds) => {
    if (!activeContactId) return;
    try {
      const res = await forwardMessage(activeContactId, msgId, targetChatIds);
      if (res && res.forwarded) {
        showToast("Message forwarded successfully");
        loadInitialData();
      }
    } catch (err) {
      console.error("Failed to forward:", err);
      showToast("Failed to forward message");
    }
  };

  // Handler: Unsend Message
  const handleUnsendMessage = async (msgId) => {
    if (!activeContactId) return;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeContactId) {
          const filtered = (c.messages || []).filter((m) => m.id !== msgId);
          const last = filtered[filtered.length - 1];
          return {
            ...c,
            lastMessage: last ? last.text || "Sent an attachment" : "No messages yet",
            messages: filtered,
          };
        }
        return c;
      })
    );

    try {
      await unsendMessage(activeContactId, msgId);
      showToast("Message unsent");
    } catch (err) {
      console.error("Failed to unsend message:", err);
      showToast("Failed to unsend message");
    }
  };

  // Handler: Double-Click Like on Message
  const handleMessageDoubleClick = async (msgId, isLiked, e) => {
    e.stopPropagation();
    if (!activeContactId) return;

    setFlyingHeartMsgId(msgId);
    setTimeout(() => {
      setFlyingHeartMsgId((curr) => (curr === msgId ? null : curr));
    }, 800);

    const nextLiked = !isLiked;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeContactId) {
          return {
            ...c,
            messages: (c.messages || []).map((m) =>
              m.id === msgId ? { ...m, isLiked: nextLiked } : m
            ),
          };
        }
        return c;
      })
    );

    try {
      await toggleLikeMessage(activeContactId, msgId);
    } catch (err) {
      console.warn("Failed to toggle like message:", err);
    }
  };

  // Handler: Select User from New Message Modal
  const handleSelectUserFromModal = async (user) => {
    try {
      const conv = await createConversation({
        userId: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      });

      if (conv) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === conv.id)) return prev;
          return [conv, ...prev];
        });
        setActiveContactId(conv.id);
        setMobileActiveChat(true);
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  // Handler: Delete Chat Confirm
  const handleConfirmDeleteChat = async (chatId) => {
    try {
      await deleteConversation(chatId);
      setConversations((prev) => prev.filter((c) => c.id !== chatId));
      if (activeContactId === chatId) {
        setActiveContactId(null);
        setShowRightSidebar(false);
      }
      setChatToDelete(null);
      showToast("Chat deleted");
    } catch (err) {
      console.error("Failed to delete chat:", err);
      showToast("Failed to delete chat");
    }
  };

  // Handler: Toggle Mute
  const handleToggleMute = async (chatId) => {
    try {
      const res = await toggleMuteConversation(chatId);
      setConversations((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, isMuted: res.isMuted } : c))
      );
      showToast(res.isMuted ? "Notifications muted" : "Notifications unmuted");
    } catch (err) {
      console.error("Failed to toggle mute:", err);
    }
  };

  // Handler: Toggle Block
  const handleToggleBlock = async (chatId) => {
    try {
      const res = await toggleBlockConversation(chatId);
      setConversations((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, isBlocked: res.isBlocked } : c))
      );
      showToast(res.isBlocked ? "User blocked" : "User unblocked");
    } catch (err) {
      console.error("Failed to toggle block:", err);
    }
  };

  // Handler: Share Personal Note
  const handleSaveNote = async (noteText) => {
    try {
      const updatedNotes = await updateUserNote(noteText);
      setNotes(updatedNotes || []);
      showToast("Note shared!");
    } catch (err) {
      console.error("Failed to update note:", err);
      showToast("Failed to share note");
    }
  };

  // Handler: Delete Personal Note
  const handleDeleteNote = async () => {
    try {
      const updatedNotes = await deleteUserNote();
      setNotes(updatedNotes || []);
      showToast("Note removed");
    } catch (err) {
      console.error("Failed to delete note:", err);
      showToast("Failed to delete note");
    }
  };

  // Handler: Reply to Friend's Note
  const handleReplyToNote = async (friendId, text, friendName) => {
    try {
      await replyToNote(friendId, text);
      showToast(`Reply sent to ${friendName}!`);
      setActiveContactId(friendId);
      setMobileActiveChat(true);

      // Refresh target conversation with new reply
      const conv = await fetchConversation(friendId);
      if (conv) {
        setConversations((prev) =>
          prev.map((c) => (c.id === friendId ? { ...c, ...conv } : c))
        );
      }
    } catch (err) {
      console.error("Failed to reply to note:", err);
      showToast("Failed to send reply");
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === "unread") return c.unread > 0;
    return true;
  });

  const sharedMedia = (currentChat?.messages || [])
    .map((message) => message.mediaUrl)
    .filter(Boolean);

  return (
    <div className="w-full lg:h-screen lg:overflow-hidden select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-xl backdrop-blur animate-fade-in-slide">
          {toastMessage}
        </div>
      )}

      {/* 3-Column / 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start w-full min-w-0 max-w-full lg:h-screen lg:overflow-hidden pt-2 sm:pt-3">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION LIST (Col span: 4)                             */}
        {/* ========================================================================= */}
        <div
          className={`w-full lg:col-span-4 flex flex-col gap-3.5 min-w-0 max-w-full lg:h-screen lg:overflow-hidden ${
            mobileActiveChat ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Messages Header Card */}
          <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3.5 shrink-0">
            {/* Title & Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1b1c19]">
                  Messages
                </h1>
                <span className="inline-flex items-center justify-center rounded-full bg-[#eef3fe] px-2.5 py-0.5 text-xs font-semibold text-[#1863dc]">
                  {conversations.reduce((acc, c) => acc + (c.unread || 0), 0)} unread
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="New Message"
                  onClick={() => setIsNewMessageOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eee9] text-[#1b1c19] hover:bg-black hover:text-white transition active:scale-95"
                >
                  <Plus className="h-4.5 w-4.5" />
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

            {/* Stories / Active Notes Strip (Instagram-style Thought Bubbles) */}
            <div className="pt-1 pb-1">
              <div className="flex items-start gap-3.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
                {notes.map((note) => {
                  const hasNote = Boolean(note.note && note.note.trim());
                  return (
                    <div
                      key={note.id}
                      className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group select-none relative"
                      onClick={() => {
                        if (note.isSelf) {
                          setIsShareNoteOpen(true);
                        } else if (hasNote) {
                          setSelectedNoteForView(note);
                        } else {
                          setActiveContactId(note.id);
                          setMobileActiveChat(true);
                        }
                      }}
                    >
                      {/* Floating Thought / Note Bubble */}
                      <div className="h-6 flex items-center justify-center">
                        {hasNote ? (
                          <div className="relative z-10 max-w-[76px] rounded-full bg-white px-2.5 py-0.5 text-[10.5px] font-medium text-[#18181b] shadow-xs border border-[#e4e0d6] truncate text-center transition-transform group-hover:scale-105">
                            {note.note}
                            {/* Pointer tail */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rotate-45 border-r border-b border-[#e4e0d6]" />
                          </div>
                        ) : note.isSelf ? (
                          <div className="relative z-10 rounded-full bg-[#f0eee9] px-2 py-0.5 text-[10px] font-medium text-[#71717a] border border-[#e0ded6] group-hover:bg-[#e4e0d6] group-hover:text-black transition">
                            + Note
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </div>

                      {/* Avatar with Status Ring */}
                      <div className="relative">
                        <img
                          src={note.avatar}
                          alt={note.name}
                          onError={(e) => {
                            e.currentTarget.src = "/default-avatar.svg";
                          }}
                          className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full object-cover shadow-2xs transition-transform group-hover:scale-105 ${
                            note.active
                              ? "ring-2 ring-[#1863dc] p-0.5"
                              : "ring-1 ring-black/5"
                          }`}
                        />
                        {note.isSelf && !hasNote && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white text-[10px] font-bold shadow-xs">
                            +
                          </span>
                        )}
                        {note.active && !note.isSelf && (
                          <span className="absolute bottom-0 right-0 flex h-3 w-3 rounded-full bg-[#10b981] ring-2 ring-white" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-[#1b1c19] max-w-[62px] truncate text-center">
                        {note.isSelf ? "Your note" : note.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#ece8de]/60">
              {["all", "unread"].map((tab) => {
                const isActive = activeTab === tab;
                const labels = {
                  all: "All",
                  unread: "Unread",
                };
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 select-none ${
                      isActive
                        ? "bg-[#1b1c19] text-white shadow-xs font-semibold"
                        : "bg-[#f0eee9] text-[#47464b] hover:bg-[#e4e2dd] hover:text-[#1b1c19]"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations Scroll List (Scrolls Internally) */}
          <div
            className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-24 pr-0.5 scroll-smooth min-h-0"
            style={{ overscrollBehavior: "contain", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-[#ece8de]/70 shadow-xs">
                <Loader2 className="h-6 w-6 animate-spin text-[#1863dc]" />
                <span className="mt-2 text-xs text-[#71717a]">Loading conversations...</span>
              </div>
            )}

            {!isLoading && filteredConversations.length === 0 && (
              <div className="p-6 text-center bg-white rounded-3xl border border-[#ece8de]/70 shadow-xs">
                <p className="text-xs text-[#71717a]">No conversations found</p>
                <button
                  type="button"
                  onClick={() => setIsNewMessageOpen(true)}
                  className="mt-3 rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  Start New Chat
                </button>
              </div>
            )}

            {!isLoading &&
              filteredConversations.map((chat) => {
                const isSelected = chat.id === activeContactId;
                return (
                  <article
                    key={chat.id}
                    onClick={() => {
                      setActiveContactId(chat.id);
                      setMobileActiveChat(true);
                      // Mark as read in local state
                      setConversations((prev) =>
                        prev.map((c) =>
                          c.id === chat.id ? { ...c, unread: 0 } : c
                        )
                      );
                    }}
                    className={`group relative rounded-2xl p-3.5 sm:p-4 transition-all duration-200 border cursor-pointer w-full min-w-0 select-none animate-fade-in ${
                      isSelected
                        ? "bg-[#f1f5ff] border-[#1863dc]/30 shadow-xs"
                        : "bg-white border-[#ece8de]/60 shadow-xs hover:border-[#d9d9dd] hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      {/* Avatar with online badge */}
                      <div className="relative shrink-0">
                        <img
                          src={chat.avatar}
                          alt={chat.name}
                          onError={(e) => {
                            e.target.src = "/notifications/marcus.png";
                          }}
                          className="h-11 w-11 rounded-full object-cover shadow-2xs ring-1 ring-black/5"
                        />
                        {chat.online && (
                          <span className="absolute bottom-0 right-0 flex h-3 w-3 rounded-full bg-[#10b981] ring-2 ring-white" />
                        )}
                      </div>

                      {/* Name & Last Message preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <h2 className="text-[13.5px] font-semibold text-[#1b1c19] truncate">
                              {chat.name}
                            </h2>
                            {chat.verified && (
                              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                                <Check className="h-2 w-2 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#93939f] shrink-0">
                            {chat.time}
                          </span>
                        </div>

                        <p
                          className={`mt-0.5 text-xs truncate ${
                            chat.unread > 0
                              ? "font-semibold text-black"
                              : "text-[#78767b]"
                          }`}
                        >
                          {chat.lastMessage}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {chat.unread > 0 && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1863dc] text-[10px] font-bold text-white shadow-xs">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER / RIGHT: EMPTY PLACEHOLDER STATE (WHEN NO CHAT SELECTED)           */}
        {/* ========================================================================= */}
        {!currentChat && (
          <div className="hidden lg:flex lg:col-span-8 h-screen items-center justify-center rounded-3xl bg-white shadow-xs border border-[#ece8de]/70 p-8 text-center animate-fade-in">
            <div className="flex flex-col items-center max-w-sm">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-black/10 bg-[#faf9f5] mb-5">
                <Send className="h-10 w-10 stroke-[1.4] text-neutral-800 -rotate-12 translate-x-0.5 -translate-y-0.5" />
              </div>
              <h2 className="text-[22px] font-bold text-[#18181b]">
                Your Messages
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#71717a]">
                Send private photos and messages to a friend or group.
              </p>
              <button
                type="button"
                onClick={() => setIsNewMessageOpen(true)}
                className="mt-6 rounded-full bg-black px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-xs hover:bg-neutral-800 active:scale-95 transition"
              >
                Send Message
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CENTER COLUMN: ACTIVE CHAT CONVERSATION (Col span: 5 or 8)                */}
        {/* ========================================================================= */}
        {currentChat && (
          <div
            className={`w-full ${
              showRightSidebar ? "lg:col-span-5" : "lg:col-span-8"
            } flex-col rounded-3xl bg-white shadow-xs border border-[#ece8de]/70 lg:h-screen lg:overflow-hidden ${
              mobileActiveChat ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Chat Header Bar */}
            <div className="p-3.5 sm:p-4 border-b border-[#ece8de]/70 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileActiveChat(false)}
                  className="lg:hidden p-1 text-[#1b1c19] hover:bg-[#f0eee9] rounded-full transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={currentChat.avatar}
                    alt={currentChat.name}
                    onError={(e) => {
                      e.target.src = "/notifications/marcus.png";
                    }}
                    className="h-10 w-10 rounded-full object-cover shadow-2xs ring-1 ring-black/5"
                  />
                  {currentChat.online && (
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-white" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h2 className="text-[14.5px] font-bold text-[#1b1c19] truncate">
                      {currentChat.name}
                    </h2>
                    {currentChat.verified && (
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#78767b] block truncate">
                    {currentChat.status}
                  </span>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Toggle Info Sidebar Button: Click to open/close details */}
                <button
                  type="button"
                  title="Conversation Details"
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
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

            {/* Message Stream Area (ONLY THIS SCROLLS INTERNALLY) */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-3.5 bg-[#fbf9f4]/40 scroll-smooth min-h-0"
              style={{ overscrollBehavior: "contain", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
            >
              {/* Date Header Pill */}
              <div className="flex justify-center">
                <span className="rounded-full bg-[#eae8e3]/80 px-3 py-1 text-[11px] font-medium text-[#78767b] select-none shadow-2xs">
                  Today 10:14 AM
                </span>
              </div>

              {/* Messages Loop */}
              {(currentChat.messages || []).map((msg) => {
                const isMe = msg.senderId
                  ? String(msg.senderId) === currentUserId
                  : msg.sender === "me";

                // Action Toolbar Helper Component
                const actionToolbar = (
                  <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-0.5 rounded-full bg-white/95 backdrop-blur-md px-1.5 py-0.5 shadow-xs border border-[#ece8de] text-[#71717a] shrink-0 select-none">
                    {/* React Emoji Picker Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        title="React"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionMsgId(
                            activeReactionMsgId === msg.id ? null : msg.id
                          );
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#f0eee9] hover:text-[#18181b] transition cursor-pointer"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>

                      {/* Quick Reaction Emojis Dropdown */}
                      {activeReactionMsgId === msg.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-white/98 backdrop-blur-md px-2 py-1 shadow-lg border border-[#ece8de] animate-in fade-in zoom-in-95"
                        >
                          {["❤️", "🙌", "😂", "😮", "😢", "🔥"].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleReactWithEmoji(msg.id, emoji)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] hover:scale-125 transition-transform duration-100 active:scale-95 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reply Button */}
                    <button
                      type="button"
                      title="Reply"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyingToMessage({
                          id: msg.id,
                          text: msg.text || (msg.type === "reel" ? "Reel" : "Attachment"),
                          sender: msg.sender,
                          senderName:
                            msg.senderName || (isMe ? "You" : currentChat.name),
                        });
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#f0eee9] hover:text-[#18181b] transition cursor-pointer"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>

                    {/* Forward Button */}
                    <button
                      type="button"
                      title="Forward"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForwardingMessage(msg);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#f0eee9] hover:text-[#18181b] transition cursor-pointer"
                    >
                      <Forward className="h-3.5 w-3.5" />
                    </button>

                    {/* Unsend Button (For own messages) */}
                    {isMe && (
                      <button
                        type="button"
                        title="Unsend"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsendMessage(msg.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );

                // Reel / Media Card Message
                if (msg.type === "reel") {
                  return (
                    <div
                      key={msg.id}
                      className="group relative flex items-center gap-2 max-w-[85%] sm:max-w-[75%]"
                    >
                      <img
                        src={currentChat.avatar}
                        alt={currentChat.name}
                        className="h-8 w-8 rounded-full object-cover shrink-0 shadow-2xs self-end mb-1"
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
                        <div
                          onDoubleClick={(e) => handleMessageDoubleClick(msg.id, msg.isLiked, e)}
                          className="relative rounded-2xl rounded-tl-xs bg-white px-4 py-2.5 shadow-2xs border border-[#ece8de]/80 text-[13.5px] text-[#1b1c19] leading-relaxed cursor-pointer"
                        >
                          {msg.text}
                          <span className="block mt-1 text-[10px] text-[#93939f] text-right">
                            {msg.time}
                          </span>
                          {msg.isLiked && (
                            <span className="absolute -bottom-1.5 -right-1 text-xs">
                              ❤️
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action toolbar for reel */}
                      {actionToolbar}
                    </div>
                  );
                }

                // Standard Text Message
                return (
                  <div
                    key={msg.id}
                    className={`group relative flex items-center gap-2 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMe && (
                      <img
                        src={msg.avatar || currentChat.avatar}
                        alt="sender"
                        className="h-7 w-7 rounded-full object-cover shrink-0 shadow-2xs self-end mb-0.5"
                      />
                    )}

                    {/* Toolbar on LEFT for sent messages */}
                    {isMe && actionToolbar}

                    <div
                      onDoubleClick={(e) => handleMessageDoubleClick(msg.id, msg.isLiked, e)}
                      className={`relative max-w-[80%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed transition-all cursor-pointer ${
                        isMe
                          ? "bg-[#18181b] text-white rounded-br-xs shadow-xs"
                          : "bg-white text-[#1b1c19] rounded-bl-xs border border-[#ece8de]/80 shadow-2xs"
                      }`}
                    >
                      {/* Flying heart animation on double click */}
                      {flyingHeartMsgId === msg.id && (
                        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                          <div className="animate-heart-pop-fly text-3xl select-none">
                            ❤️
                          </div>
                        </div>
                      )}

                      {/* Forwarded Header Indicator */}
                      {msg.forwarded && (
                        <div
                          className={`flex items-center gap-1 text-[10.5px] mb-1 font-medium ${
                            isMe ? "text-white/70" : "text-[#78767b]"
                          }`}
                        >
                          <Forward className="h-3 w-3 stroke-[2.2]" />
                          <span>Forwarded</span>
                        </div>
                      )}

                      {/* Quoted Replying Message Snippet */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 rounded-xl px-3 py-1.5 text-xs border-l-2 transition-all ${
                            isMe
                              ? "bg-white/15 border-white/70 text-white/95"
                              : "bg-[#ece8de]/70 border-[#1863dc] text-[#2d2d30]"
                          }`}
                        >
                          <div className="flex items-center gap-1 font-semibold text-[11px] opacity-90">
                            <Reply className="h-2.5 w-2.5 stroke-[2.5]" />
                            <span>
                              {msg.replyTo.senderName || (msg.replyTo.sender === "me" ? "You" : currentChat.name)}
                            </span>
                          </div>
                          <p className="line-clamp-1 text-[11.5px] mt-0.5 opacity-85">
                            {msg.replyTo.text || "Attachment"}
                          </p>
                        </div>
                      )}

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

                      {/* Liked heart reaction badge */}
                      {msg.isLiked && (
                        <span className="absolute -bottom-1.5 -right-1 text-xs filter drop-shadow">
                          ❤️
                        </span>
                      )}

                      {/* Emoji Reactions Pill Badge */}
                      {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            // Toggle off own reaction if exists
                            const own = msg.reactions.find((r) => r.user === "me");
                            if (own) handleReactWithEmoji(msg.id, own.emoji);
                          }}
                          className={`absolute -bottom-2.5 ${
                            isMe ? "right-2" : "left-2"
                          } z-10 flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 shadow-xs border border-[#ece8de] text-[11px] cursor-pointer hover:scale-105 transition select-none`}
                        >
                          {msg.reactions.map((r, idx) => (
                            <span key={idx}>{r.emoji}</span>
                          ))}
                          {msg.reactions.length > 1 && (
                            <span className="text-[10px] font-semibold text-neutral-600 ml-0.5">
                              {msg.reactions.length}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Toolbar on RIGHT for incoming messages */}
                    {!isMe && actionToolbar}
                  </div>
                );
              })}
            </div>

            {/* Replying Banner */}
            {replyingToMessage && (
              <div className="mx-3 sm:mx-4 mb-2 flex items-center justify-between rounded-2xl bg-[#f0eee9] px-3.5 py-2 border border-[#ece8de] animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-6 w-1 rounded-full bg-[#1863dc] shrink-0" />
                  <div className="min-w-0 text-xs">
                    <div className="flex items-center gap-1 font-semibold text-[#1b1c19]">
                      <Reply className="h-3 w-3 text-[#1863dc]" />
                      <span>Replying to {replyingToMessage.senderName}</span>
                    </div>
                    <p className="text-[#78767b] truncate mt-0.5 max-w-[260px] sm:max-w-md">
                      {replyingToMessage.text}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#78767b] hover:bg-[#e4e2dd] hover:text-black transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}


            {/* Chat Composer Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 border-t border-[#ece8de]/70 bg-white flex items-center gap-2 shrink-0"
            >
              <div className="flex items-center gap-1 text-[#78767b]">
                <button
                  type="button"
                  title="Attach Photo"
                  onClick={() => showToast("Photo attachments synced via Cloudinary")}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f0eee9] hover:text-[#1b1c19] transition"
                >
                  <ImageIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  title="Emoji"
                  onClick={() => setInputText((prev) => prev + " ✨")}
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
                  disabled={isSending}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition active:scale-95 shadow-xs shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  title="Voice Memo"
                  onClick={() => showToast("Voice note recorded")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0eee9] text-[#1b1c19] hover:bg-[#e4e2dd] transition active:scale-95 shrink-0"
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: CONTACT PROFILE & SHARED MEDIA (Col span: 3)               */}
        {/* Appears ONLY when info button (i) is clicked                              */}
        {/* ========================================================================= */}
        {currentChat && showRightSidebar && (
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-0 h-screen overflow-y-auto no-scrollbar pb-24 animate-fade-in">
            {/* Contact Details Card */}
            <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col items-center text-center">
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRightSidebar(false)}
                  className="p-1 rounded-full text-[#71717a] hover:bg-[#f4f2ea] hover:text-black transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Profile Avatar */}
              <div className="relative mt-1">
                <img
                  src={currentChat.avatar}
                  alt={currentChat.name}
                  className="h-18 w-18 rounded-full object-cover ring-4 ring-[#fbf9f4] shadow-md"
                />
                {currentChat.online && (
                  <span className="absolute bottom-1 right-1 flex h-3.5 w-3.5 rounded-full bg-[#10b981] ring-2 ring-white" />
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
                  <span>{currentChat.postsCount || 0}</span>
                  <span className="text-[10px] text-[#93939f] font-normal block">
                    posts
                  </span>
                </div>
                <div className="h-4 w-px bg-[#ece8de]" />
                <div>
                  <span>{currentChat.followersCount || currentChat.followers || 0}</span>
                  <span className="text-[10px] text-[#93939f] font-normal block">
                    followers
                  </span>
                </div>
                <div className="h-4 w-px bg-[#ece8de]" />
                <div>
                  <span>{currentChat.followingCount || currentChat.following || 0}</span>
                  <span className="text-[10px] text-[#93939f] font-normal block">
                    following
                  </span>
                </div>
              </div>

              {currentChat.bio && (
                <p className="mt-3 text-xs text-[#47464b] leading-relaxed">
                  {currentChat.bio}
                </p>
              )}

              <Link
                to={`/u/${currentChat.username}`}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#f0eee9] py-2 text-xs font-semibold text-[#1b1c19] hover:bg-black hover:text-white transition"
              >
                <span>View Profile</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Shared Photos & Media Gallery */}
            <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1b1c19] uppercase tracking-wider">
                  Shared Media
                </h3>
                <span className="text-[11px] text-[#93939f]">{sharedMedia.length} items</span>
              </div>

              {sharedMedia.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pt-1">
                {sharedMedia.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden bg-black/5 group cursor-pointer"
                  >
                    <img
                      src={img}
                      alt="Shared media"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    />
                  </div>
                ))}
                </div>
              ) : (
                <p className="py-2 text-xs text-[#71717a]">No shared media yet.</p>
              )}
            </div>

            {/* Chat Settings & Privacy Options */}
            <div className="rounded-3xl bg-white p-4 shadow-xs border border-[#ece8de]/70 flex flex-col gap-1 text-xs font-medium text-[#1b1c19]">
              <button
                type="button"
                onClick={() => handleToggleMute(currentChat.id)}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#fbf9f4] transition"
              >
                <div className="flex items-center gap-2.5">
                  {currentChat.isMuted ? (
                    <BellOff className="h-4 w-4 text-[#da5c40]" />
                  ) : (
                    <Bell className="h-4 w-4 text-[#78767b]" />
                  )}
                  <span>Mute Notifications</span>
                </div>
                <span className="text-[11px] text-[#93939f]">
                  {currentChat.isMuted ? "Muted" : "On"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleBlock(currentChat.id)}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#fbf9f4] transition"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-[#78767b]" />
                  <span>Block Account</span>
                </div>
                <span className="text-[11px] text-[#93939f]">
                  {currentChat.isBlocked ? "Blocked" : ""}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setChatToDelete(currentChat)}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl text-[#ef4444] hover:bg-[#fee2e2]/40 transition text-left"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Conversation</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* CUSTOM MODALS: ZERO ALERT MODALS */}
      <DeleteChatModal
        isOpen={!!chatToDelete}
        chat={chatToDelete}
        onClose={() => setChatToDelete(null)}
        onConfirm={handleConfirmDeleteChat}
      />

      <NewMessageModal
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
        onSelectUser={handleSelectUserFromModal}
      />

      <ShareNoteModal
        isOpen={isShareNoteOpen}
        currentNote={notes.find((n) => n.isSelf)?.note || ""}
        onClose={() => setIsShareNoteOpen(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />

      {/* VIEW & REPLY TO FRIEND'S NOTE MODAL */}
      <ViewNoteModal
        isOpen={Boolean(selectedNoteForView)}
        note={selectedNoteForView}
        onClose={() => setSelectedNoteForView(null)}
        onReply={handleReplyToNote}
      />

      {/* FORWARD MESSAGE MODAL */}
      <ForwardModal
        isOpen={!!forwardingMessage}
        message={forwardingMessage}
        conversations={conversations}
        currentChatId={activeContactId}
        onClose={() => setForwardingMessage(null)}
        onForward={handleForwardMessage}
      />
    </div>
  );
}
