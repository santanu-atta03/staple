import { useEffect, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { searchPeople } from "./messages.api";

export default function NewMessageModal({ isOpen, onClose, onSelectUser }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setPeople([]);
      setIsLoading(false);
      setSearchError("");
      return undefined;
    }

    let active = true;
    setIsLoading(true);
    setSearchError("");
    const timer = window.setTimeout(() => {
      searchPeople(query.trim())
        .then((results) => {
          if (active) setPeople(results);
        })
        .catch((error) => {
          console.error("Could not search for people:", error);
          if (active) {
            setPeople([]);
            setSearchError("Could not load people. Try again.");
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, query.trim() ? 220 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[24px] border border-[#ece8de]/80 bg-white p-6 shadow-2xl animate-scale-up flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#ece8de]/60">
          <h3 className="text-[17px] font-bold text-[#18181b]">
            New Message
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#71717a] hover:bg-[#f4f2ea] hover:text-black transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717a]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full rounded-2xl bg-[#fbf9f4] pl-10 pr-4 py-2.5 text-[13px] text-[#1b1c19] placeholder-[#93939f] border border-[#ece8de]/80 focus:outline-none focus:ring-1 focus:ring-black transition"
            autoFocus
          />
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-[220px]">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-[#71717a]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching accounts...
            </div>
          ) : searchError ? (
            <p className="p-4 text-center text-xs text-[#b42318]">{searchError}</p>
          ) : people.length === 0 ? (
            <p className="p-4 text-center text-xs text-[#71717a]">
              {query.trim()
                ? `No accounts found for "${query.trim()}".`
                : "No other accounts found yet."}
            </p>
          ) : (
            people.map((person) => (
              <div
                key={person.id}
                onClick={() => {
                  onSelectUser(person);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#f4f2ea] cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={person.avatar || "/default-avatar.svg"}
                    alt={person.name}
                    onError={(event) => {
                      event.currentTarget.src = "/default-avatar.svg";
                    }}
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[13.5px] font-semibold text-[#18181b] truncate">
                        {person.name}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#71717a] block truncate">
                      @{person.username}
                    </span>
                  </div>
                </div>

                <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-neutral-700">
                  Chat
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
