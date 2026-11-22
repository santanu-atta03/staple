import { useState } from "react";
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
} from "lucide-react";

const categories = [
  { id: "for-you", label: "For You" },
  { id: "photography", label: "Photography", hasDot: true, dotColor: "bg-[#f97316]" },
  { id: "travel", label: "Travel" },
  { id: "architecture", label: "Architecture & Design" },
  { id: "food", label: "Food & Dining" },
  { id: "style", label: "Style" },
  { id: "music", label: "Music & Nightlife" },
  { id: "outdoors", label: "Outdoors" },
];

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [activeView, setActiveView] = useState("all"); // 'all' | 'photos' | 'reels'
  const [searchQuery, setSearchQuery] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // Follow states for creators
  const [creatorsStatus, setCreatorsStatus] = useState({
    nadia: false,
    julian: false,
    astrid: false,
  });

  // Join states for communities
  const [communitiesStatus, setCommunitiesStatus] = useState({
    streetFood: false,
    filmArchive: false,
    interiors: false,
  });

  const audioTrends = [
    {
      id: "golden-hour",
      title: "Golden Hour (Cinematic Edit)",
      artist: "JVKE • 284k reels",
      growth: "+64%",
      icon: Music2,
      iconColor: "text-[#0284c7]",
      bgColor: "bg-[#e0f2fe]",
    },
    {
      id: "tokyo-rain",
      title: "Tokyo Rain & Lo-Fi Rhodes",
      artist: "Original Audio • 98k reels",
      growth: "+38%",
      icon: Radio,
      iconColor: "text-[#ea580c]",
      bgColor: "bg-[#ffedd5]",
    },
    {
      id: "analog-tape",
      title: "Analog Tape Warmth Vol. 2",
      artist: "Cortex Sound • 45k reels",
      growth: "+21%",
      icon: Disc3,
      iconColor: "text-[#059669]",
      bgColor: "bg-[#d1fae5]",
    },
    {
      id: "cafe-paris",
      title: "Café de Paris (Acoustic)",
      artist: "Vintage Records • 32k reels",
      growth: "+14%",
      icon: Radio,
      iconColor: "text-[#4b5563]",
      bgColor: "bg-[#f3f4f6]",
    },
  ];

  const creators = [
    {
      id: "nadia",
      name: "Nadia Solovey",
      category: "Fashion & Editorial • 140k",
      avatar: "/explore/creator_nadia_2x.png",
      fallback: "/explore/creator_nadia.png",
    },
    {
      id: "julian",
      name: "Julian K. Chen",
      category: "Drone & Coastal • 215k",
      avatar: "/explore/creator_julian_2x.png",
      fallback: "/explore/creator_julian.png",
    },
    {
      id: "astrid",
      name: "Astrid Lind",
      category: "Scandinavian Design • 92k",
      avatar: "/explore/creator_astrid_2x.png",
      fallback: "/explore/creator_astrid.png",
    },
  ];

  const communities = [
    {
      id: "streetFood",
      name: "Street Food Worldwide",
      members: "128.4k foodies",
      icon: Utensils,
    },
    {
      id: "filmArchive",
      name: "35mm Film Archive",
      members: "84.1k photographers",
      icon: Aperture,
    },
    {
      id: "interiors",
      name: "Minimalist Interiors",
      members: "210.8k members",
      icon: Armchair,
    },
  ];

  return (
    <div className="w-full space-y-3.5 pt-2 pb-16 lg:pt-3">
      {/* TOP SEARCH BAR (Spans broad across the page) */}
      <div className="relative flex items-center justify-between rounded-full border border-[#ece8de]/70 bg-white px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] focus-within:ring-1 focus-within:ring-[#1863dc]">
        <div className="flex flex-1 items-center gap-3">
          <Search className="h-4.5 w-4.5 text-[#71717a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search photos, creators, reels, places, and tags..."
            className="w-full bg-transparent text-[13px] text-[#18181b] placeholder-[#71717a] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-[#71717a]">
          <kbd className="hidden rounded bg-[#f0eee9] px-2 py-0.5 font-mono text-[10.5px] text-[#71717a] sm:inline-block">
            ⌘K
          </kbd>
          <button
            type="button"
            aria-label="Filter"
            className="rounded-full p-1 text-[#71717a] hover:bg-[#f0eee9] hover:text-black transition"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
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
              {cat.hasDot && !isActive && (
                <span className={`h-1.5 w-1.5 rounded-full ${cat.dotColor}`} />
              )}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN TWO-COLUMN SPLIT: Explore Feed (Grid) + Right Sidebar */}
      <div className="flex justify-between gap-6 pt-1 lg:gap-8 xl:gap-9">
        {/* CENTER COLUMN: Explore Feed Header + Media Grid */}
        <section className="w-full flex-1 max-w-[700px] xl:max-w-[740px] space-y-3.5">
          {/* Header Row: "Explore Feed" + Realtime badge + View Switcher */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-bold text-[#18181b]">
                Explore Feed
              </h1>
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

          {/* EXPLORE MEDIA GRID (Matches the exact arrangement of the reference image) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* CARD 1: Brutalist building (Spans 2 columns, tall) */}
            <div className="group relative col-span-2 overflow-hidden rounded-2xl bg-neutral-900 shadow-xs aspect-[340/423]">
              <img
                src="/explore/brutalist_2x.png"
                alt="Brutalist Havens"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {/* Carousel Icon in top right */}
              <div className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs">
                <Layers className="h-3.5 w-3.5" />
              </div>

              {/* Bottom Frosted Glass Pill Bar */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-[#e8e4d8]/85 px-3 py-2 text-[11px] font-medium text-[#18181b] backdrop-blur-md">
                <span className="rounded-full bg-white/70 px-2 py-0.5 shadow-2xs">
                  Brutalist Havens
                </span>
                <span className="rounded-full bg-white/70 px-2 py-0.5 shadow-2xs">
                  Architectural Journeys
                </span>
                <span className="rounded-full bg-white/70 px-2 py-0.5 shadow-2xs">
                  Mist & Stone
                </span>
              </div>
            </div>

            {/* RIGHT SUB-COLUMN (Holds Card 2 + Card 3 stacked) */}
            <div className="col-span-1 flex flex-col gap-2.5 sm:gap-3">
              {/* CARD 2: B&W Woman Portrait Reel */}
              <div className="group relative flex-1 overflow-hidden rounded-2xl bg-neutral-900 shadow-xs min-h-[220px]">
                <img
                  src="/explore/bw_woman_reel_2x.png"
                  alt="Portrait Reel"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {/* Play Button in top right */}
                <div className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </div>
                {/* Views Counter Badge in bottom left */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                  <Play className="h-2.5 w-2.5 fill-current" />
                  <span>142K</span>
                </div>
              </div>

              {/* CARD 3: Street Woman with Red Bus */}
              <div className="group relative overflow-hidden rounded-2xl bg-neutral-900 shadow-xs h-[140px] sm:h-[160px]">
                <img
                  src="/explore/street_woman_2x.png"
                  alt="London Street"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            </div>

            {/* ROW 2: 3 Cards across (Card 4, Card 5, Card 6) */}
            {/* CARD 4: Woman at desk with laptop */}
            <div className="group relative col-span-1 aspect-square overflow-hidden rounded-2xl bg-neutral-900 shadow-xs">
              <img
                src="/explore/laptop_desk_2x.png"
                alt="Workspace"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs">
                <Layers className="h-3 w-3" />
              </div>
            </div>

            {/* CARD 5: Man with glasses portrait */}
            <div className="group relative col-span-1 aspect-square overflow-hidden rounded-2xl bg-neutral-900 shadow-xs">
              <img
                src="/explore/man_glasses_2x.png"
                alt="Portrait"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs">
                <Play className="h-3 w-3 fill-current" />
              </div>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9.5px] font-medium text-white backdrop-blur-xs">
                <Play className="h-2 w-2 fill-current" />
                <span>96K</span>
              </div>
            </div>

            {/* CARD 6: UI Preview — Maria K */}
            <div className="group relative col-span-1 aspect-square overflow-hidden rounded-2xl bg-neutral-900 shadow-xs">
              <img
                src="/explore/ui_preview_2x.png"
                alt="System Design Researcher"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>

            {/* ROW 3: CARD 7: Designer Workspace Banner (Spans 2 columns) */}
            <div className="group relative col-span-2 overflow-hidden rounded-2xl bg-neutral-900 shadow-xs h-[155px] sm:h-[175px]">
              <img
                src="/explore/designer_workspace_2x.png"
                alt="Designer Workspace"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs">
                <Camera className="h-3 w-3" />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR COLUMN: Trending Reels & Audio, Popular Creators, Trending Communities */}
        <aside className="hidden w-[330px] xl:w-[350px] shrink-0 space-y-4 xl:block">
          {/* WIDGET 1: TRENDING REELS & AUDIO */}
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
                const Icon = audio.icon;
                const isPlaying = playingAudioId === audio.id;
                return (
                  <div
                    key={audio.id}
                    className="flex items-center justify-between gap-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPlayingAudioId(isPlaying ? null : audio.id)
                        }
                        className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl transition ${audio.bgColor} ${audio.iconColor}`}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 fill-current" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-[#18181b]">
                          {audio.title}
                        </p>
                        <p className="truncate text-[10.5px] text-[#71717a]">
                          {audio.artist}
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
              className="mt-4 flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-[#1863dc] hover:underline"
            >
              <span>See All Audio Trends</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* WIDGET 2: POPULAR CREATORS */}
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-[14.5px] font-bold text-[#18181b]">
                Popular Creators
              </h2>
              <span className="text-[10.5px] font-medium text-[#71717a]">
                Top Visuals
              </span>
            </div>

            <div className="space-y-3">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between gap-2.5"
                >
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
                        <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-[#1863dc] text-white">
                          <Check className="h-1.5 w-1.5 stroke-[3]" />
                        </span>
                      </div>
                      <span className="block truncate text-[10.5px] text-[#71717a]">
                        {creator.category}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCreatorsStatus((s) => ({
                        ...s,
                        [creator.id]: !s[creator.id],
                      }))
                    }
                    className={`rounded-full px-4 py-1 text-[11.5px] font-semibold transition active:scale-95 ${
                      creatorsStatus[creator.id]
                        ? "bg-[#edeae3] text-[#18181b]"
                        : "bg-black text-white hover:bg-neutral-800"
                    }`}
                  >
                    {creatorsStatus[creator.id] ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* WIDGET 3: TRENDING COMMUNITIES */}
          <div className="rounded-[22px] border border-[#e2ded5]/80 bg-[#ede9df]/60 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-1.5">
              <h2 className="text-[14.5px] font-bold text-[#18181b]">
                Trending Communities
              </h2>
              <Users className="h-4 w-4 text-[#71717a]" />
            </div>

            <p className="text-[11.5px] text-[#52525b] leading-relaxed pb-3">
              Connect with photo curators, culinary tastemakers, and visual
              storytellers.
            </p>

            <div className="space-y-2.5">
              {communities.map((comm) => {
                const Icon = comm.icon;
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
                      onClick={() =>
                        setCommunitiesStatus((s) => ({
                          ...s,
                          [comm.id]: !s[comm.id],
                        }))
                      }
                      className={`rounded-full px-3.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                        communitiesStatus[comm.id]
                          ? "bg-black text-white"
                          : "bg-[#edeae3] text-[#18181b] hover:bg-[#e4e0d6]"
                      }`}
                    >
                      {communitiesStatus[comm.id] ? "Joined" : "Join"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
