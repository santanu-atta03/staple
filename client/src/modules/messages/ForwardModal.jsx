import React, { useState } from "react";
import { Search, X, Check, Send, Forward } from "lucide-react";

export default function ForwardModal({
  isOpen,
  message,
  conversations = [],
  currentChatId,
  onClose,
  onForward,
}) {
  const [search, setSearch] = useState("");
  const [sentMap, setSentMap] = useState({});
  const [isSending, setIsSending] = useState({});

  if (!isOpen || !message) return null;

  const filteredConversations = conversations.filter((c) => {
    if (c.id === currentChatId) return false;
    const q = search.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.username || "").toLowerCase().includes(q)
    );
  });

  const handleSendToChat = async (targetChatId) => {
    if (sentMap[targetChatId] || isSending[targetChatId]) return;

    setIsSending((prev) => ({ ...prev, [targetChatId]: true }));
    try {
      await onForward(message.id, [targetChatId]);
      setSentMap((prev) => ({ ...prev, [targetChatId]: true }));
    } catch (err) {
      console.error("Failed to forward message:", err);
    } finally {
      setIsSending((prev) => ({ ...prev, [targetChatId]: false }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-3xl border border-[#ece8de] bg-white p-5 sm:p-6 shadow-2xl text-[#18181b] animate-scale-in flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#ece8de]/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0eee9] text-[#1b1c19]">
              <Forward className="h-4.5 w-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#1b1c19]">Forward Message</h3>
              <span className="text-[11px] text-[#78767b]">Share with friends or groups</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#78767b] hover:bg-[#f0eee9] hover:text-black transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Message Preview Snippet */}
        <div className="my-3.5 rounded-2xl bg-[#fbf9f4] p-3 border border-[#ece8de]/70 text-[12.5px] flex items-start gap-2.5">
          <div className="h-7 w-1 rounded-full bg-[#1863dc] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-semibold text-[#1b1c19] block text-[11px] mb-0.5">
              Message Preview
            </span>
            <p className="line-clamp-2 text-[#47464b] text-[12px] italic">
              "{message.text || "Shared attachment"}"
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#93939f]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full rounded-2xl border border-[#ece8de] bg-[#fbf9f4] py-2 pl-9 pr-4 text-[13px] text-[#1b1c19] outline-none placeholder-[#93939f] focus:ring-1 focus:ring-black transition"
          />
        </div>

        {/* Contacts List */}
        <div
          className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 min-h-[180px] scroll-smooth"
          style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
        >
          {filteredConversations.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#78767b]">
              No other contacts found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSent = !!sentMap[c.id];
              const sending = !!isSending[c.id];

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-2.5 border border-[#ece8de]/60 hover:bg-[#fbf9f4] transition select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.svg";
                      }}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-[#1b1c19] block truncate">
                        {c.name}
                      </span>
                      <span className="text-[11.5px] text-[#78767b] block truncate">
                        @{c.username}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendToChat(c.id)}
                    disabled={isSent || sending}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-95 cursor-pointer ${
                      isSent
                        ? "bg-[#edfce9] text-[#2d6a4f] border border-[#d8f3dc]"
                        : "bg-black text-white hover:bg-neutral-800 shadow-xs"
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Sent</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        <span>{sending ? "Sending..." : "Send"}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
