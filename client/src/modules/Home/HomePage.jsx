const avatarColors = [
  "bg-orange-200",
  "bg-slate-700",
  "bg-purple-400",
  "bg-rose-300",
  "bg-sky-300",
];

function Avatar({ name, color = "bg-orange-200", size = "md" }) {
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  return (
    <div
      className={`${sizes[size]} ${color} flex shrink-0 items-center justify-center rounded-full border-2 border-white font-medium text-slate-900`}
    >
      {name
        .split(" ")
        .map((item) => item[0])
        .join("")
        .slice(0, 2)}
    </div>
  );
}

function Sidebar() {
  const links = [
    ["⌂", "Home"],
    ["◎", "Explore"],
    ["♧", "Notifications"],
    ["□", "Messages"],
    ["▱", "Bookmarks"],
    ["◎", "Profile"],
    ["⚙", "Settings"],
  ];

  return (
    <aside className="fixed hidden h-screen w-[194px] border-r border-[#eeeae2] bg-[#fbfaf7] px-4 py-4 lg:block">
      <div className="mb-8 flex items-center gap-2 px-1">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-black text-xs text-white">
          S
        </div>
        <span className="text-[15px] font-medium">Staple</span>
        <span className="text-[9px] text-gray-400">v0.9.4</span>
      </div>

      <nav className="space-y-1">
        {links.map(([icon, label], index) => (
          <button
            key={label}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[11px] ${
              index === 0 ? "bg-[#efede9]" : "hover:bg-[#efede9]"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="w-4 text-center text-sm">{icon}</span>
              {label}
            </span>

            {label === "Notifications" && (
              <span className="rounded-full bg-[#ff9b83] px-1.5 py-0.5 text-[9px] text-white">
                4
              </span>
            )}

            {label === "Messages" && (
              <span className="rounded-full bg-[#a8e8d9] px-1.5 py-0.5 text-[9px] text-gray-700">
                2
              </span>
            )}
          </button>
        ))}
      </nav>

      <button className="mt-5 w-full rounded-full bg-black py-3 text-[11px] text-white">
        ✣ &nbsp; Create Post
      </button>

      <div className="absolute bottom-5 left-4 right-4 border-t border-[#e8e4de] pt-4">
        <div className="flex items-center gap-2">
          <Avatar name="Elena Vance" size="sm" />
          <div className="flex-1">
            <p className="text-[11px]">Elena Vance ✓</p>
            <p className="text-[9px] text-gray-400">@elena</p>
          </div>
          <span>•••</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="mb-4 flex items-center gap-8 border-b border-[#eeeae2] pb-3">
      <div className="flex gap-7 text-[11px]">
        <button className="rounded-full bg-[#f0eee9] px-4 py-2 font-medium">
          For You
        </button>
        <button className="flex items-center gap-1">
          Following <span className="h-1 w-1 rounded-full bg-[#1d7564]" />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-5">
        <span className="text-sm">☷</span>
        <span className="text-sm">✣</span>
        <div className="hidden w-48 rounded-full bg-white px-3 py-2 text-[11px] text-gray-400 shadow-sm sm:block">
          ⌕&nbsp; Search friends, reels, posts
        </div>
      </div>
    </header>
  );
}

function Stories() {
  const stories = [
    ["Your story", "You"],
    ["maya.k", "MK"],
    ["lucas_m", "LM"],
    ["sarah.lens", "SL"],
    ["julian_t", "JT"],
    ["karan.v", "KV"],
  ];

  return (
    <section className="mb-4 flex gap-4 overflow-hidden rounded-xl bg-white px-4 py-3">
      {stories.map(([label, initials], index) => (
        <div key={label} className="min-w-[42px] text-center">
          <div
            className={`mx-auto rounded-full p-[2px] ${
              index === 5 ? "bg-gray-300" : "bg-gradient-to-tr from-orange-400 via-pink-500 to-purple-600"
            }`}
          >
            <Avatar
              name={initials}
              color={avatarColors[index % avatarColors.length]}
              size="md"
            />
          </div>
          <p className="mt-1 truncate text-[9px] text-gray-600">{label}</p>
        </div>
      ))}
    </section>
  );
}

function Composer() {
  return (
    <section className="mb-4 rounded-xl bg-white p-4">
      <div className="flex items-center gap-2">
        <Avatar name="Elena Vance" size="sm" />
        <div className="flex flex-1 items-center justify-between rounded-full bg-[#f3f1ed] px-4 py-2 text-[11px] text-gray-400">
          What's on your mind, Elena?
          <span>✣</span>
        </div>
      </div>

      <div className="mt-3 flex justify-around border-t border-[#eeeae2] pt-3 text-[10px]">
        <span className="text-emerald-600">▣ Photo/video</span>
        <span className="text-orange-500">☻ Feeling/activity</span>
        <span className="text-blue-600">♧ Tag friends</span>
        <span className="text-red-500">▣ Reel</span>
      </div>
    </section>
  );
}

function PostCard({ type = "photo" }) {
  if (type === "poll") {
    return (
      <article className="rounded-xl bg-white p-4">
        <div className="flex items-center gap-2">
          <Avatar name="Brooklyn Bites" color="bg-orange-400" size="sm" />
          <div className="flex-1">
            <p className="text-[11px]">Brooklyn Bites & Brews ✓</p>
            <p className="text-[9px] text-gray-400">Community Poll • Food & Weekend Spots</p>
          </div>
          <span className="rounded-full bg-[#e6f8e6] px-2 py-1 font-mono text-[8px] text-green-700">
            COMMUNITY POLL
          </span>
        </div>

        <p className="mt-4 text-[13px]">
          Settling the weekend debate: Where's the ultimate matcha latte in Brooklyn? 🥤👇
        </p>

        <div className="mt-3 space-y-2 text-[11px]">
          {[
            ["Ceremonial oat matcha at Kettl Greenpoint", "58%", "bg-[#cdeee4]"],
            ["Strawberry cloud matcha at Dumbo Roasters", "24%", "bg-[#f0efeb]"],
            ["Hidden garden cafe in Williamsburg", "18%", "bg-[#f0efeb]"],
          ].map(([label, value, color], index) => (
            <div key={label} className={`flex rounded-lg ${color} px-3 py-2`}>
              <span className="mr-2 rounded-full bg-white px-1 text-[9px]">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="flex-1">{label}</span>
              <span className="font-mono text-[9px]">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-between text-[9px] text-gray-400">
          <span>3,214 votes • 5 hours left</span>
          <span className="text-blue-600">See results breakdown</span>
        </div>

        <PostActions />
      </article>
    );
  }

  return (
    <article className="rounded-xl bg-white p-4">
      <div className="flex items-center gap-2">
        <Avatar name={type === "photo" ? "Elena Vance" : "Julian Thorne"} size="sm" />
        <div className="flex-1">
          <p className="text-[11px]">
            {type === "photo" ? "Elena Vance ✓" : "Julian Thorne"}{" "}
            <span className="text-gray-400">
              @{type === "photo" ? "elena" : "jthorne"} • {type === "photo" ? "2h" : "5h"}
            </span>
          </p>
          <p className="text-[9px] text-gray-400">
            {type === "photo" ? "⌖ Gion District, Kyoto, Japan" : "⌖ Soho, New York"}
          </p>
        </div>
        <span className="text-xs">•••</span>
      </div>

      <p className="mt-4 text-[12px] leading-5">
        {type === "photo"
          ? "Lost in the wooden alleyways of Kyoto just as golden hour hit. Grateful for slow walks, iced matcha lattes, and quiet rainy afternoons 🌿✨📸"
          : "Sunday ritual: corner seat, pour-over coffee, vinyl playing in the background, and unwinding with good friends. Hope everyone's having a peaceful weekend ☕🌿"}
      </p>

      <p className="text-[11px] text-blue-600">
        {type === "photo"
          ? "#KyotoVibes #FilmPhotography #GoldenHour #TravelDiaries"
          : "#SundayMorning #CoffeeCulture #SlowLiving"}
      </p>

      {type === "photo" ? (
        <div className="mt-3 flex h-52 items-center justify-center rounded-xl bg-[#e9eee8] p-4 text-center text-[11px] text-gray-600">
          <div>
            <p className="mb-2 font-mono text-[10px]">HOME FEED / STATE TRANSITION GRAPH</p>
            <div className="text-5xl text-[#789284]">⌁⌁⌁</div>
            <p>USER ACTION → STATE ENGINE → STREAMING NODES</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f0eee9] px-3 py-3">
          <span className="rounded-lg bg-[#fff1bd] p-2">☕</span>
          <div className="flex-1">
            <p className="text-[11px]">Listening to: Jazz Impressions of Japan • Vinyl Sessions</p>
            <p className="text-[9px] text-gray-400">Playing via Staple Audio • Tap to listen</p>
          </div>
          <button className="rounded-full bg-white px-3 py-1 text-[9px]">Play</button>
        </div>
      )}

      <PostActions />
    </article>
  );
}

function PostActions() {
  return (
    <div className="mt-4 border-t border-[#eeeae2] pt-3">
      <div className="flex gap-5 text-lg">
        <span className="text-red-500">♡</span>
        <span>□</span>
        <span>▷</span>
        <span className="ml-auto">♧</span>
      </div>
      <p className="mt-2 text-[10px] text-gray-500">Liked by maya.k and 1,420 others</p>
      <p className="mt-1 text-[9px] text-gray-400">View all 48 comments</p>
    </div>
  );
}

function RightRail() {
  return (
    <aside className="hidden space-y-4 xl:block">
      <section className="rounded-xl bg-white p-4">
        <div className="mb-3 flex justify-between">
          <h2 className="text-[17px] leading-5">People You May<br />Know</h2>
          <span className="text-[9px] text-blue-600">See<br />All</span>
        </div>

        {[
          ["Marcus", "MA", "Add Friend"],
          ["Sarah Lin", "SL", "Add Friend"],
          ["Karan Var", "KV", "Follow"],
        ].map(([name, initials, action], index) => (
          <div key={name} className="mb-3 flex items-center gap-2">
            <Avatar name={initials} color={avatarColors[index]} size="sm" />
            <div className="flex-1">
              <p className="text-[10px]">{name}</p>
              <p className="text-[9px] text-gray-400">14 mutual friends</p>
            </div>
            <button className="rounded-full bg-blue-600 px-3 py-1 text-[9px] text-white">
              {action}
            </button>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-white p-4">
        <h2 className="text-[17px] leading-5">Trending Tags &<br />Sounds</h2>
        <div className="mt-4 space-y-3 text-[10px]">
          <div>
            <b>#WeekendVibes</b>
            <p className="text-gray-400">245K posts this week</p>
          </div>
          <div>
            <b>🎵 Golden Hour • JVKE</b>
            <p className="text-gray-400">Trending in Reels • 120K uses</p>
          </div>
          <div>
            <b>#FilmPhotography</b>
            <p className="text-gray-400">84K posts</p>
          </div>
          <div>
            <b>#KyotoTravel</b>
            <p className="text-gray-400">52K posts</p>
          </div>
        </div>
        <button className="mt-4 w-full rounded-lg bg-[#f0eee9] py-2 text-[10px]">
          Explore More Trends
        </button>
      </section>

      <section className="rounded-xl bg-white p-4">
        <h2 className="text-[17px]">Suggested Groups</h2>
        <div className="mt-4 space-y-3 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#dff6db] p-2">◎</span>
            <span className="flex-1">Film Photography</span>
            <button className="rounded-full bg-[#f0eee9] px-3 py-1">Join</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#ffe0d9] p-2">♟</span>
            <span className="flex-1">Urban Hikers</span>
            <button className="rounded-full bg-[#f0eee9] px-3 py-1">Join</button>
          </div>
        </div>
      </section>

      <p className="px-2 text-[9px] leading-5 text-gray-400">
        Privacy &nbsp; Terms &nbsp; Advertising &nbsp; Cookies
        <br />
        Staple Social © 2026
      </p>
    </aside>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#171719]">
      <Sidebar />

      <main className="mx-auto max-w-[1110px] px-4 py-5 lg:pl-[220px]">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(500px,1fr)_194px]">
          <div>
            <TopBar />
            <Stories />
            <Composer />
            <div className="space-y-4">
              <PostCard type="photo" />
              <PostCard type="audio" />
              <PostCard type="poll" />
              <PostCard type="photo" />
            </div>
          </div>

          <RightRail />
        </div>
      </main>
    </div>
  );
}