import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Camera,
  SlidersHorizontal,
  TrendingUp,
  MoreHorizontal,
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
  MessageSquare,
  Disc3,
  Award,
  Layers,
  Heart,
  MessageCircle,
  X,
  Volume2,
} from "lucide-react";

export default function ProfilePage() {
  const { username = "elenavance" } = useParams();

  // Active tab state
  const [activeTab, setActiveTab] = useState("posts");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState({
    name: "Elena Vance",
    username: "elenavance",
    pronouns: "she/her",
    roleTag: "Creative Vanguard",
    avatar: "/profile/elena_glasses_avatar.png",
    cover: "/profile/clean_cover.png",
    bio: "Visual designer & street photographer based between SF and Tokyo. Exploring spatial interfaces, slow coffee rituals, and high-fidelity 35mm grain. Founder at @filmphotocollective.",
    website: "elenavance.design",
    location: "San Francisco, CA & Tokyo, JP",
    joined: "Joined Staple March 2024",
    postsCount: 184,
    followersCount: "14.2k",
    followingCount: 618,
  });

  // Curated highlights
  const highlights = [
    { id: "1", title: "Kyoto 🌸", image: "/profile/hl_kyoto.png" },
    { id: "2", title: "Film 35m...", image: "/profile/hl_film.png" },
    { id: "3", title: "Spaces 🖥️", image: "/profile/hl_spaces.png" },
    { id: "4", title: "Coffee ☕", image: "/profile/hl_coffee.png" },
    { id: "5", title: "Arch 🏛️", image: "/profile/hl_arch.png" },
  ];

  // 9 Grid posts exactly matching the reference image
  const posts = [
    {
      id: "p1",
      image: "/profile/post_1_kyoto_lanterns.png",
      caption: "Lost in the wooden alleyways of Kyoto just as golden hour hit.",
      hasCarousel: true,
      likes: "1,420",
      comments: "48",
      type: "photo",
    },
    {
      id: "p2",
      image: "/profile/post_2_desk_setup.png",
      caption: "Studio workstation details: clean timber, 32-inch 6K display, and tactile mechanical switches.",
      views: "142k",
      likes: "3,890",
      comments: "112",
      type: "reel",
    },
    {
      id: "p3",
      image: "/profile/post_3_coffee_turntable.png",
      caption: "Sunday ritual: corner seat, pour-over Ethiopian roast, and vinyl jazz.",
      likes: "892",
      comments: "26",
      type: "photo",
    },
    {
      id: "p4",
      image: "/profile/post_4_canal_facades.png",
      caption: "Copenhagen canal facades in crisp morning sunlight.",
      likes: "1,048",
      comments: "42",
      type: "photo",
    },
    {
      id: "p5",
      image: "/profile/post_5_brutalist_concrete.png",
      caption: "Brutalist sanctuary wrapped in coastal fog.",
      hasCarousel: true,
      likes: "2,190",
      comments: "74",
      type: "photo",
    },
    {
      id: "p6",
      image: "/profile/post_6_rainy_portrait.png",
      caption: "Rain droplets on the gallery glass window. Monochrome 35mm.",
      likes: "743",
      comments: "19",
      type: "photo",
    },
    {
      id: "p7",
      image: "/profile/post_7_typography_book.png",
      caption: "Helvetica and Univers specimen archive from Zurich 1968.",
      likes: "1,650",
      comments: "58",
      type: "photo",
    },
    {
      id: "p8",
      image: "/profile/post_8_tokyo_neon_alley.png",
      caption: "Midnight ramen stalls in Shinjuku under warm paper lanterns.",
      hasCarousel: true,
      likes: "2,410",
      comments: "86",
      type: "photo",
    },
    {
      id: "p9",
      image: "/profile/post_9_sf_sunset.png",
      caption: "San Francisco rooftop panorama watching twilight settle over the bay.",
      likes: "1,880",
      comments: "63",
      type: "photo",
    },
  ];

  // Connections
  const connections = [
    {
      id: "marcus",
      name: "Marcus Vance",
      username: "@marcus_v",
      avatar: "/notifications/marcus.png",
    },
    {
      id: "sarah",
      name: "Sarah Lin",
      username: "@sarah_lin",
      avatar: "/notifications/sarah.png",
    },
    {
      id: "david",
      name: "David Okafor",
      username: "@dokafor",
      avatar: "/notifications/liam.png",
    },
  ];

  const handleShareProfile = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-full min-w-0 pb-16 pt-2 sm:pt-4 overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. FULL WIDTH COVER BANNER ACROSS ENTIRE PAGE                             */}
      {/* ========================================================================= */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 rounded-3xl overflow-hidden bg-neutral-200 shadow-xs border border-[#ece8de]/60">
        <img
          src={profileData.cover}
          alt="Profile cover banner"
          className="w-full h-full object-cover"
        />

        {/* Cover Top-Right Action Buttons */}
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/90 hover:bg-white text-[#1b1c19] px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md shadow-xs transition active:scale-95 select-none"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Edit Cover</span>
          </button>

          <button
            type="button"
            title="Display settings"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 hover:bg-white text-[#1b1c19] backdrop-blur-md shadow-xs transition active:scale-95"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 12-COLUMN GRID (OVERLAPPING BANNER BY -mt-14)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full min-w-0 max-w-full -mt-12 sm:-mt-16 relative z-10 px-1 sm:px-2">
        {/* ========================================================================= */}
        {/* LEFT / CENTER COLUMN: PROFILE CARD & POSTS (Col span: 8)                  */}
        {/* ========================================================================= */}
        <div className="w-full lg:col-span-8 flex flex-col gap-6 min-w-0 max-w-full">
          {/* Profile Card Content */}
          <div className="rounded-3xl bg-white shadow-xs border border-[#ece8de]/70 px-5 pb-6 sm:px-7 sm:pb-7 pt-4">
            {/* Avatar + Action Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-18 mb-4">
              {/* Avatar with Play / Audio Badge */}
              <div className="relative shrink-0">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full p-1 bg-white ring-4 ring-[#fbf9f4] shadow-md overflow-hidden">
                  <img
                    src={profileData.avatar}
                    alt={profileData.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>

                {/* Blue Play / Audio button on bottom right */}
                <button
                  type="button"
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  title={isPlayingAudio ? "Pause Audio" : "Play Profile Audio"}
                  className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#1863dc] text-white shadow-xs hover:scale-105 active:scale-90 transition ring-2 ring-white"
                >
                  <Disc3
                    className={`h-3.5 w-3.5 ${
                      isPlayingAudio ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Profile Top Actions Row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="rounded-full bg-[#18181b] px-4 sm:px-5 py-2 text-xs sm:text-[13px] font-semibold text-white shadow-xs hover:bg-neutral-800 transition active:scale-95 select-none"
                >
                  Edit Profile
                </button>

                <button
                  type="button"
                  onClick={handleShareProfile}
                  className="relative rounded-full bg-[#f0eee9] px-3.5 sm:px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] transition active:scale-95 select-none"
                >
                  <span>Share Profile</span>
                  {copiedLink && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-black px-2 py-0.5 text-[10px] text-white whitespace-nowrap shadow-xs">
                      Link copied!
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full bg-[#f0eee9] px-3.5 sm:px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] transition active:scale-95 select-none"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-[#1863dc]" />
                  <span>Insights</span>
                </button>

                <button
                  type="button"
                  title="More actions"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eee9] text-[#1b1c19] hover:bg-[#e4e2dd] transition active:scale-95"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Name & Pronouns Row */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1b1c19]">
                  {profileData.name}
                </h1>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1863dc] text-white shrink-0">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
                <span className="rounded-full bg-[#f0eee9] px-2 py-0.5 text-[11px] font-mono text-[#78767b]">
                  {profileData.pronouns}
                </span>
              </div>

              {/* Handle & Creative Vanguard Badge */}
              <div className="flex items-center gap-2 text-xs text-[#78767b]">
                <span className="font-mono">@{profileData.username}</span>
                <span>•</span>
                <span className="inline-flex items-center rounded-full bg-[#edfce9] border border-[#d8f3dc] px-2.5 py-0.5 text-[11px] font-medium text-[#2d6a4f]">
                  {profileData.roleTag}
                </span>
              </div>
            </div>

            {/* Bio Paragraph */}
            <p className="mt-3.5 text-[13.5px] sm:text-[14px] text-[#2d2d30] leading-relaxed">
              Visual designer & street photographer based between SF and Tokyo.
              Exploring spatial interfaces, slow coffee rituals, and high-fidelity
              35mm grain. Founder at{" "}
              <Link
                to="/explore"
                className="font-medium text-[#1863dc] hover:underline"
              >
                @filmphotocollective
              </Link>
              .
            </p>

            {/* Metadata row: link, location, joined date */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#78767b]">
              <a
                href={`https://${profileData.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-medium text-[#1863dc] hover:underline"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>{profileData.website}</span>
              </a>

              <div className="flex items-center gap-1.5 text-[#47464b]">
                <MapPin className="h-3.5 w-3.5 text-[#78767b]" />
                <span>{profileData.location}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#93939f] font-mono text-[11px]">
                <Calendar className="h-3 w-3" />
                <span>{profileData.joined}</span>
              </div>
            </div>

            {/* Stats Bar Container */}
            <div className="mt-5 rounded-2xl bg-[#fbf9f4] p-3.5 sm:p-4 border border-[#ece8de]/60 flex items-center justify-around text-center">
              <div className="cursor-pointer hover:opacity-80 transition">
                <span className="block text-xl sm:text-2xl font-bold text-[#1b1c19]">
                  {profileData.postsCount}
                </span>
                <span className="block text-[11px] font-mono tracking-wider text-[#93939f] uppercase mt-0.5">
                  POSTS
                </span>
              </div>
              <div className="h-7 w-px bg-[#ece8de]" />
              <div className="cursor-pointer hover:opacity-80 transition">
                <span className="block text-xl sm:text-2xl font-bold text-[#1b1c19]">
                  {profileData.followersCount}
                </span>
                <span className="block text-[11px] font-mono tracking-wider text-[#93939f] uppercase mt-0.5">
                  FOLLOWERS
                </span>
              </div>
              <div className="h-7 w-px bg-[#ece8de]" />
              <div className="cursor-pointer hover:opacity-80 transition">
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
                className="text-xs font-semibold text-[#1863dc] hover:underline"
              >
                Manage
              </button>
            </div>

            {/* Highlights Carousel Row */}
            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto pb-1 no-scrollbar pt-1">
              {highlights.map((hl) => (
                <div
                  key={hl.id}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none"
                >
                  <div className="relative h-13 w-13 sm:h-14 sm:w-14 rounded-full p-0.5 bg-white ring-2 ring-[#ece8de] group-hover:ring-[#1863dc] transition-all shadow-2xs overflow-hidden">
                    <img
                      src={hl.image}
                      alt={hl.title}
                      className="h-full w-full rounded-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#1b1c19] text-center truncate max-w-[64px]">
                    {hl.title}
                  </span>
                </div>
              ))}

              {/* Add New Highlight Button */}
              <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none">
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
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold transition-all duration-150 select-none ${
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
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f0eee9] hover:text-black transition"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Filter view"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f0eee9] hover:text-black transition"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 3x3 Grid of Posts */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
            {posts.map((post) => (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 cursor-pointer shadow-xs border border-[#ece8de]/60 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Main Photo */}
                <img
                  src={post.image}
                  alt={post.caption}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

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

          {/* Bottom Loading / Archive Status Indicator */}
          <div className="flex flex-col items-center justify-center gap-2 pt-6 pb-2 text-center select-none">
            <div className="h-5 w-5 rounded-full border-2 border-[#1863dc] border-t-transparent animate-spin" />
            <span className="font-mono text-[11px] text-[#93939f]">
              Indexing 184 archived artifacts
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: REPUTATION, ACCREDITATIONS & SOUNDTRACK (Col span: 4)        */}
        {/* ========================================================================= */}
        <aside className="w-full lg:col-span-4 flex flex-col gap-6 sticky top-6">
          {/* Widget 1: COMMUNITY STANDING */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#ece8de]/70 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#93939f]">
                COMMUNITY STANDING
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#edfce9] border border-[#d8f3dc] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#2d6a4f]">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
                <span>Verified Peer</span>
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {/* Item 1: Film Photography Collective */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0eee9] text-[#1b1c19]">
                  <Film className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13.5px] font-bold text-[#1b1c19]">
                    Film Photography Collective
                  </span>
                  <span className="text-xs text-[#78767b]">
                    Founder & Lead Curator • 8.4k members
                  </span>
                </div>
              </div>

              {/* Item 2: Spatial Guild */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0eee9] text-[#1b1c19]">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13.5px] font-bold text-[#1b1c19]">
                    Spatial Guild
                  </span>
                  <span className="text-xs text-[#78767b]">
                    Core Contributor • UI/UX Research
                  </span>
                </div>
              </div>
            </div>

            {/* Mutual Signal Box */}
            <div className="rounded-2xl bg-[#fbf9f4] p-3.5 border border-[#ece8de]/60 text-xs">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#93939f] block mb-1">
                MUTUAL SIGNAL
              </span>
              <p className="text-[#47464b] leading-relaxed">
                Followed by <span className="font-semibold text-[#1b1c19]">marcus_v</span>,{" "}
                <span className="font-semibold text-[#1b1c19]">sarah_lin</span>, and{" "}
                <span className="font-semibold text-[#1b1c19]">18 other</span> colleagues in
                your network.
              </p>
            </div>
          </div>

          {/* Widget 2: ACCREDITATIONS (Dark Badge Card) */}
          <div className="relative overflow-hidden rounded-3xl bg-[#091522] p-6 text-white shadow-md border border-neutral-800 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                ACCREDITATIONS
              </span>
              <Award className="h-5 w-5 text-[#b8ede0]" />
            </div>

            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">
                Top Visual Creator 2025
              </h3>
              <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                Ranked in the top 1% of editorial photography curators on Staple for high
                signal-to-noise ratio.
              </p>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 pt-2">
              <span className="rounded-full bg-neutral-800/90 border border-neutral-700/80 px-3 py-1 text-[11px] font-medium text-neutral-200">
                Founding Member
              </span>
              <span className="rounded-full bg-[#b8ede0] px-3.5 py-1 text-[11px] font-bold text-[#00201b] shadow-xs">
                Tier 1 Patron
              </span>
            </div>
          </div>

          {/* Widget 3: Connections */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#1b1c19]">
                  Connections
                </h3>
                <span className="text-[11px] text-[#93939f]">
                  Shared network nodes
                </span>
              </div>
              <Link
                to="#"
                className="font-mono text-xs font-semibold text-[#1863dc] hover:underline"
              >
                See all (20)
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="h-9 w-9 rounded-full object-cover shadow-2xs group-hover:scale-105 transition-transform"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold text-[#1b1c19] truncate">
                        {c.name}
                      </span>
                      <span className="text-[11px] text-[#93939f] truncate">
                        {c.username}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/messages"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eee9] text-[#78767b] hover:bg-black hover:text-white transition active:scale-95 shrink-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 4: STUDIO SOUND */}
          <div className="rounded-3xl bg-white p-5 shadow-xs border border-[#ece8de]/70 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#93939f]">
                STUDIO SOUND
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>On Loop</span>
              </span>
            </div>

            <div className="flex items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0eee9] hover:bg-[#18181b] hover:text-white transition active:scale-95"
              >
                <Disc3
                  className={`h-5 w-5 ${
                    isPlayingAudio ? "animate-spin text-[#1863dc]" : "text-[#1b1c19]"
                  }`}
                />
              </button>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-bold text-[#1b1c19] truncate">
                  Ambient Works II
                </span>
                <span className="text-xs text-[#78767b] truncate">
                  Brian Eno • Studio Sessions
                </span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="px-2 text-[11px] text-[#93939f] font-mono space-y-1">
            <div className="flex items-center gap-2">
              <span className="hover:underline cursor-pointer">Staple Protocol</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Privacy Spec</span>
            </div>
            <div>RSS Stream • 2025 Staple Systems</div>
          </div>
        </aside>
      </div>

      {/* Selected Post Modal Preview */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-3xl bg-white overflow-hidden shadow-2xl border border-[#ece8de]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-4/3 bg-black">
              <img
                src={selectedPost.image}
                alt={selectedPost.caption}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <span className="text-sm font-bold text-[#1b1c19]">
                  {profileData.name}
                </span>
              </div>
              <p className="text-xs text-[#47464b] leading-relaxed">
                {selectedPost.caption}
              </p>
              <div className="flex items-center gap-4 pt-2 border-t border-[#ece8de] text-xs font-semibold text-[#1b1c19]">
                <span className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  {selectedPost.likes}
                </span>
                <span className="flex items-center gap-1.5 text-[#78767b]">
                  <MessageCircle className="h-4 w-4" />
                  {selectedPost.comments} comments
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="relative max-w-md w-full rounded-3xl bg-white p-6 shadow-2xl border border-[#ece8de] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ece8de] pb-3">
              <h3 className="text-base font-bold text-[#1b1c19]">
                Edit Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-[#78767b] hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1b1c19] block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  className="w-full rounded-xl bg-[#fbf9f4] px-3 py-2 border border-[#ece8de] focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1b1c19] block mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                  className="w-full rounded-xl bg-[#fbf9f4] px-3 py-2 border border-[#ece8de] focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1b1c19] block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) =>
                    setProfileData({ ...profileData, location: e.target.value })
                  }
                  className="w-full rounded-xl bg-[#fbf9f4] px-3 py-2 border border-[#ece8de] focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full bg-[#f0eee9] px-4 py-1.5 text-xs font-semibold text-[#1b1c19]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
