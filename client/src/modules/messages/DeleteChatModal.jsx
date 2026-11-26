import React from "react";
import { Trash2, X } from "lucide-react";

export default function DeleteChatModal({ isOpen, chat, onClose, onConfirm }) {
  if (!isOpen || !chat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[24px] border border-[#ece8de]/80 bg-white p-6 shadow-2xl animate-scale-up"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#ece8de]/60">
          <div className="flex items-center gap-2 text-[#ef4444]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fee2e2]">
              <Trash2 className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-[15.5px] font-bold text-[#18181b]">
              Delete Chat?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#71717a] hover:bg-[#f4f2ea] hover:text-black transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-[#71717a]">
          Deleting this conversation with{" "}
          <span className="font-semibold text-black">{chat.name}</span> will remove the messages from your inbox. This cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f4f2ea] px-4 py-2 text-[12.5px] font-semibold text-[#18181b] hover:bg-[#eae6dd] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(chat.id)}
            className="rounded-full bg-[#ef4444] px-5 py-2 text-[12.5px] font-semibold text-white shadow-xs hover:bg-red-600 active:scale-95 transition"
          >
            Delete Chat
          </button>
        </div>
      </div>
    </div>
  );
}
