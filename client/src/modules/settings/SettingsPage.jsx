import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  UserRound,
  LockKeyhole,
  Bell,
  Palette,
  SlidersHorizontal,
  Users,
  CircleHelp,
  LogOut,
  Check,
  Download,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  BadgeCheck,
  Image as ImageIcon,
  Key,
  Smartphone,
  Laptop,
  Globe,
  Camera,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Volume2,
  Trash2,
  Plus,
  Activity,
  Layers,
  Eye,
  EyeOff,
  Radio,
  FileText,
  AlertCircle,
  HelpCircle,
  Send,
  Loader2,
} from "lucide-react";

// Navigation section definitions
const sections = [
  { id: "account", label: "Account & Security", icon: ShieldCheck },
  { id: "profile", label: "Profile & Public Info", icon: UserRound },
  { id: "privacy", label: "Privacy & Permissions", icon: LockKeyhole },
  { id: "notifications", label: "Notifications & Alerts", icon: Bell, badge: 4 },
  { id: "appearance", label: "Appearance & Display", icon: Palette },
  { id: "content", label: "Content & Feeds", icon: SlidersHorizontal },
  { id: "friends", label: "Close Friends & Circles", icon: Users, count: 12 },
  { id: "help", label: "Help & Guidelines", icon: CircleHelp },
];

const initialForm = {
  username: "elenavance",
  birthDate: "March 14, 1994",
  email: "elena.vance@staple.social",
  phone: "+1 (415) 890-4412",
  displayName: "Elena Vance",
  pronouns: "she/her",
  bio: "Visual designer & street photographer based between SF and Tokyo. Exploring spatial interfaces, slow coffee rituals, and high-fidelity 35mm grain. Founder at @filmphotocollective.",
  website: "https://elenavance.design",
  location: "San Francisco, CA & Tokyo, JP",
  theme: "editorial",
  fontSize: "standard",
  feedQuality: "lossless",
};

const initialFriends = [
  { id: "1", name: "Marcus Vance", handle: "marcus_v", role: "Photographer", avatar: "/notifications/marcus.png", active: true },
  { id: "2", name: "Sarah Lin", handle: "sarah_lin", role: "Curator", avatar: "/notifications/sarah.png", active: true },
  { id: "3", name: "Liam Brooks", handle: "liam_b", role: "Architect", avatar: "/notifications/liam.png", active: true },
  { id: "4", name: "Maya Chen", handle: "maya.k", role: "Art Director", avatar: "/notifications/maya.png", active: true },
  { id: "5", name: "Helene Moreau", handle: "h_moreau", role: "Printmaker", avatar: "/notifications/helene.png", active: true },
  { id: "6", name: "Kai Takahashi", handle: "kai_t", role: "Sound Artist", avatar: "/notifications/kai.png", active: true },
];

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-[#ece7de] bg-white shadow-[0_2px_8px_rgba(24,22,18,0.02)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(24,22,18,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="border-b border-[#f0ece4] pb-5">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8e8a92]">
        {eyebrow}
      </div>
      <h2 className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.025em] text-[#1b1c19] sm:text-[24px]">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 max-w-[560px] text-[13px] leading-relaxed text-[#75716c]">
          {description}
        </p>
      )}
    </div>
  );
}

function Field({ label, children, helper, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-2 flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-[0.03em] text-[#7d7982]">
        {label}
      </label>
      {children}
      {helper && <p className="mt-1.5 text-[11px] text-[#8e8a93]">{helper}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled = false, children, type = "text" }) {
  return (
    <div className="group flex min-h-11 items-center rounded-xl border border-transparent bg-[#f4f2ee] px-3.5 text-[13.5px] transition-all focus-within:border-black/20 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]">
      {children}
      <input
        type={type}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="min-w-0 flex-1 bg-transparent py-2 text-[#1b1c19] outline-none placeholder:text-[#a09c97] disabled:opacity-60"
      />
    </div>
  );
}

function Toggle({ checked = false, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 transition-colors">
      {(label || description) && (
        <div className="min-w-0 flex-1 pr-2">
          {label && <p className="text-[13.5px] font-medium text-[#1b1c19]">{label}</p>}
          {description && <p className="mt-0.5 text-[11.5px] leading-normal text-[#817d85]">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
          checked ? "bg-black" : "bg-[#dedad2]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState("idle"); // 'idle' | 'generating' | 'ready'
  const [archiveProgress, setArchiveProgress] = useState(0);

  // Avatar state
  const [currentAvatar, setCurrentAvatar] = useState("/profile/elena_glasses_avatar.png");
  const avatarOptions = [
    { label: "Current Studio Portrait", src: "/profile/elena_glasses_avatar.png" },
    { label: "Classic High-Res", src: "/recreation/avatar_left_elena_hires.png" },
    { label: "Editorial Monochrome", src: "/notifications/elena.png" },
    { label: "Alternative Angle", src: "/profile/elena_profile.png" },
  ];

  // Form State
  const [form, setForm] = useState(initialForm);
  const [hasChanges, setHasChanges] = useState(false);

  // Muted words tags
  const [mutedWords, setMutedWords] = useState(["spoilers", "crypto", "promoted", "giveaways"]);
  const [newWordInput, setNewWordInput] = useState("");

  // Close friends list
  const [friendsList, setFriendsList] = useState(initialFriends);
  const [friendsSearch, setFriendsSearch] = useState("");

  // Toggles State
  const [toggles, setToggles] = useState({
    privateAccount: false,
    storyReplies: true,
    activeStatus: true,
    readReceipts: true,
    showVerifiedBadge: true,
    showFollowerCount: true,
    showStudioSound: true,
    twoFactorAuth: true,
    emailNotifications: true,
    pushNotifications: true,
    mentions: true,
    peerSignals: true,
    autoplayMedia: true,
    sensitiveContentFilter: false,
    losslessAudio: true,
    reduceAnimations: false,
    highContrastBorders: false,
  });

  const filteredSections = useMemo(
    () =>
      sections.filter((section) =>
        section.label.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setHasChanges(true);
  };

  const updateToggle = (key, value) => {
    setToggles((current) => ({ ...current, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }, 600);
  };

  const handleDiscardChanges = () => {
    setForm(initialForm);
    setHasChanges(false);
  };

  const handleAddMutedWord = (e) => {
    e?.preventDefault();
    if (newWordInput.trim() && !mutedWords.includes(newWordInput.trim().toLowerCase())) {
      setMutedWords([...mutedWords, newWordInput.trim().toLowerCase()]);
      setNewWordInput("");
      setHasChanges(true);
    }
  };

  const handleRemoveMutedWord = (word) => {
    setMutedWords(mutedWords.filter((w) => w !== word));
    setHasChanges(true);
  };

  const toggleFriendActive = (id) => {
    setFriendsList((current) =>
      current.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item
      )
    );
    setHasChanges(true);
  };

  const triggerArchiveDownload = () => {
    setArchiveStatus("generating");
    setArchiveProgress(15);
    const step1 = setTimeout(() => setArchiveProgress(52), 400);
    const step2 = setTimeout(() => setArchiveProgress(88), 900);
    const step3 = setTimeout(() => {
      setArchiveProgress(100);
      setArchiveStatus("ready");
    }, 1400);
  };

  // Render Content Sections
  const renderActiveSection = () => {
    switch (activeSection) {
      case "account":
        return (
          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <SectionHeader
                eyebrow="[ 01 — Identity ]"
                title="Account Credentials"
                description="Manage your primary Staple namespace, contact verification, and editorial avatar."
              />

              {/* Avatar Box */}
              <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-[#f7f5f0] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-[#ece8de]">
                    <img
                      src={currentAvatar}
                      alt={form.displayName}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-[#1b1c19]">{form.displayName}</span>
                      <BadgeCheck className="h-4 w-4 fill-[#1863dc] text-white" />
                    </div>
                    <p className="font-mono text-[12px] text-[#7d7982]">@{form.username}</p>
                    <span className="mt-1 inline-flex items-center rounded-full bg-[#edfce9] px-2 py-0.5 text-[10.5px] font-medium text-[#2d6a4f]">
                      Creative Vanguard
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[12px] font-semibold text-white shadow-xs transition-transform hover:bg-neutral-800 active:scale-95"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Change photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentAvatar("/recreation/avatar_left_elena_hires.png")}
                    className="rounded-full bg-[#ebe7df] px-3.5 py-2 text-[12px] font-medium text-[#48443e] transition hover:bg-[#e0dcd4] active:scale-95"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Inputs Grid */}
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Username">
                  <Input
                    value={form.username}
                    onChange={(e) => updateForm("username", e.target.value)}
                  >
                    <span className="mr-1.5 font-mono text-[#8a858f]">@</span>
                  </Input>
                </Field>

                <Field label="Date of Birth">
                  <Input
                    value={form.birthDate}
                    onChange={(e) => updateForm("birthDate", e.target.value)}
                  >
                    <ChevronDown className="mr-2 h-4 w-4 text-[#8a8690]" />
                  </Input>
                </Field>

                <Field
                  className="sm:col-span-2"
                  label={
                    <>
                      <span>Email Address</span>
                      <span className="flex items-center gap-1 normal-case tracking-normal text-[11px] font-medium text-[#2d6a4f]">
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        Verified Domain
                      </span>
                    </>
                  }
                >
                  <Input
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                  />
                </Field>

                <Field className="sm:col-span-2" label="Phone Number">
                  <Input
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                  >
                    <Smartphone className="mr-2 h-4 w-4 text-[#8a8690]" />
                  </Input>
                </Field>
              </div>
            </Card>

            {/* Security & Sessions */}
            <Card className="p-6 sm:p-8">
              <SectionHeader
                eyebrow="[ 02 — Authentication ]"
                title="Security & Passkeys"
                description="Hardware biometric authentication, hardware keys, and authenticated hardware nodes."
              />

              <div className="mt-6 divide-y divide-[#eeeae2] rounded-2xl bg-[#f7f5f0] px-4">
                <Toggle
                  checked={toggles.twoFactorAuth}
                  onChange={(val) => updateToggle("twoFactorAuth", val)}
                  label="Two-Factor Passkey Authentication"
                  description="Enforce hardware-level WebAuthn or biometrics (TouchID / FaceID) on login."
                />

                <div className="flex items-center justify-between py-4 text-[13px]">
                  <div>
                    <p className="font-medium text-[#1b1c19]">Registered Hardware Key</p>
                    <p className="mt-0.5 text-[11.5px] text-[#817d85]">YubiKey 5C NFC • Last used today</p>
                  </div>
                  <span className="rounded-full bg-[#e8f5e9] px-2.5 py-1 text-[11px] font-semibold text-[#2e7d32]">
                    Active
                  </span>
                </div>
              </div>

              {/* Sessions */}
              <div className="mt-6">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#7d7982]">
                  Active Hardware Sessions
                </h3>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between rounded-xl border border-[#ece8de] bg-[#fbfaf8] p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eeece7] text-[#55524d]">
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[#1b1c19]">MacBook Pro 16" (Safari 17.4)</span>
                          <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                        </div>
                        <p className="text-[11px] text-[#817d85]">San Francisco, CA • Active this session</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#f0eee9] px-2.5 py-1 text-[11px] font-medium text-[#5a5651]">
                      Current
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#ece8de] bg-[#fbfaf8] p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eeece7] text-[#55524d]">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[13px] font-semibold text-[#1b1c19]">iPhone 15 Pro (Staple iOS 0.9.4)</span>
                        <p className="text-[11px] text-[#817d85]">Tokyo, JP • 3 hours ago</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#d32f2f] hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case "profile":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 01 — Public Info ]"
              title="Profile & Identity"
              description="Customize your biography, pronouns, external links, and public profile badges."
            />

            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Display Name">
                  <Input
                    value={form.displayName}
                    onChange={(e) => updateForm("displayName", e.target.value)}
                  />
                </Field>

                <Field label="Pronouns">
                  <Input
                    value={form.pronouns}
                    onChange={(e) => updateForm("pronouns", e.target.value)}
                    placeholder="e.g. she/her, they/them"
                  />
                </Field>
              </div>

              <Field
                label={
                  <>
                    <span>Biography</span>
                    <span className="font-mono text-[11px] text-[#8e8a93]">
                      {form.bio.length} / 240
                    </span>
                  </>
                }
              >
                <textarea
                  value={form.bio}
                  onChange={(e) => updateForm("bio", e.target.value)}
                  rows={4}
                  maxLength={240}
                  className="w-full resize-none rounded-xl border border-transparent bg-[#f4f2ee] p-3.5 text-[13.5px] leading-relaxed text-[#1b1c19] outline-none transition-all focus:border-black/20 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="External Website">
                  <Input
                    value={form.website}
                    onChange={(e) => updateForm("website", e.target.value)}
                  >
                    <Globe className="mr-2 h-4 w-4 text-[#8a8690]" />
                  </Input>
                </Field>

                <Field label="Location">
                  <Input
                    value={form.location}
                    onChange={(e) => updateForm("location", e.target.value)}
                  />
                </Field>
              </div>

              {/* Public Badge Toggles */}
              <div className="mt-8 rounded-2xl bg-[#f7f5f0] px-4 divide-y divide-[#eeeae2]">
                <Toggle
                  checked={toggles.showVerifiedBadge}
                  onChange={(val) => updateToggle("showVerifiedBadge", val)}
                  label="Show Verified Peer Checkmark"
                  description="Display the blue verified badge on your profile card and posts."
                />

                <Toggle
                  checked={toggles.showFollowerCount}
                  onChange={(val) => updateToggle("showFollowerCount", val)}
                  label="Public Metrics & Subscriber Count"
                  description="Display your follower and following statistics on your public profile."
                />

                <Toggle
                  checked={toggles.showStudioSound}
                  onChange={(val) => updateToggle("showStudioSound", val)}
                  label="Studio Sound Loop Status"
                  description="Feature your active ambient audio turntable widget on your profile."
                />
              </div>
            </div>
          </Card>
        );

      case "privacy":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 02 — Visibility ]"
              title="Privacy & Permissions"
              description="Configure who can inspect your essays, observe live activity, and share your stories."
            />

            <div className="mt-6 divide-y divide-[#eeeae2] rounded-2xl bg-[#f7f5f0] px-4">
              <Toggle
                checked={toggles.privateAccount}
                onChange={(val) => updateToggle("privateAccount", val)}
                label="Private Account"
                description="Only approved followers can view your feed posts and story artifacts."
              />

              <Toggle
                checked={toggles.storyReplies}
                onChange={(val) => updateToggle("storyReplies", val)}
                label="Allow Story Replies"
                description="Let peers send direct reactions and messages to your published highlights."
              />

              <Toggle
                checked={toggles.activeStatus}
                onChange={(val) => updateToggle("activeStatus", val)}
                label="Broadcast Live Presence"
                description="Show a subtle green signal indicator when you are active on Staple."
              />

              <Toggle
                checked={toggles.readReceipts}
                onChange={(val) => updateToggle("readReceipts", val)}
                label="Direct Message Read Receipts"
                description="Let senders know when you have viewed their incoming messages."
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="flex items-center justify-between rounded-xl border border-[#ece8de] bg-[#fbfaf8] p-4 text-left transition hover:bg-[#f4f2ee]"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-[#1b1c19]">Blocked Accounts</p>
                  <p className="mt-0.5 text-[11px] text-[#817d85]">0 accounts currently restricted</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#8a8690]" />
              </button>

              <button
                type="button"
                className="flex items-center justify-between rounded-xl border border-[#ece8de] bg-[#fbfaf8] p-4 text-left transition hover:bg-[#f4f2ee]"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-[#1b1c19]">Restricted Mentions</p>
                  <p className="mt-0.5 text-[11px] text-[#817d85]">Everyone can mention you</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#8a8690]" />
              </button>
            </div>
          </Card>
        );

      case "notifications":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 03 — Alerts ]"
              title="Notifications & Signals"
              description="Filter and fine-tune alerts for likes, editorial comments, peer tags, and audio trends."
            />

            <div className="mt-6 divide-y divide-[#eeeae2] rounded-2xl bg-[#f7f5f0] px-4">
              <Toggle
                checked={toggles.pushNotifications}
                onChange={(val) => updateToggle("pushNotifications", val)}
                label="Push Notifications"
                description="Deliver instant device alerts when peers interact with your artifacts."
              />

              <Toggle
                checked={toggles.emailNotifications}
                onChange={(val) => updateToggle("emailNotifications", val)}
                label="Email Digests & Editorial Briefs"
                description="Weekly curated summary of mentions, community posts, and friend activity."
              />

              <Toggle
                checked={toggles.mentions}
                onChange={(val) => updateToggle("mentions", val)}
                label="Mentions & Story Comments"
                description="Notify when tagged in comments, reels, or photo metadata."
              />

              <Toggle
                checked={toggles.peerSignals}
                onChange={(val) => updateToggle("peerSignals", val)}
                label="Peer Verification Signals"
                description="Alert when approved curators endorse or vouch for your profile."
              />
            </div>

            <div className="mt-6 rounded-2xl border border-[#ece8de] bg-[#fbfaf8] p-5">
              <h3 className="text-[13.5px] font-semibold text-[#1b1c19]">Notification Delivery Schedule</h3>
              <p className="mt-1 text-[12px] text-[#7d7982]">Batch low-priority signals to avoid digital interruption.</p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {["Realtime", "Hourly Batch", "Daily Roundup (9 AM)"].map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setForm((c) => ({ ...c, deliverySchedule: opt }));
                      setHasChanges(true);
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      (form.deliverySchedule || "Realtime") === opt
                        ? "border-black bg-black text-white shadow-xs"
                        : "border-[#ece8de] bg-white text-[#48443e] hover:bg-[#f4f2ee]"
                    }`}
                  >
                    <p className="text-[12px] font-semibold">{opt}</p>
                    <p className="mt-0.5 text-[10.5px] opacity-75">
                      {i === 0 ? "Zero latency" : i === 1 ? "Quiet intervals" : "Single digest"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        );

      case "appearance":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 04 — Interface ]"
              title="Appearance & Display"
              description="Select your canvas tone, contrast profile, and typography rendering scale."
            />

            {/* Themes */}
            <div className="mt-6">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-[#7d7982]">
                Canvas Theme
              </label>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { id: "editorial", name: "Editorial", bg: "bg-[#faf9f5]", cardBg: "bg-white", border: "border-[#ece8de]", desc: "Warm archival paper" },
                  { id: "warm_light", name: "Warm Alabaster", bg: "bg-[#f4efe6]", cardBg: "bg-[#faf6ee]", border: "border-[#e0d8ca]", desc: "Cozy cream paper" },
                  { id: "obsidian", name: "Studio Dark", bg: "bg-[#091522]", cardBg: "bg-[#111e2e]", border: "border-[#1e3047]", desc: "Deep slate contrast" },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => updateForm("theme", th.id)}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                      form.theme === th.id
                        ? "border-black ring-2 ring-black shadow-md"
                        : "border-[#ece8de] bg-white hover:border-[#cfcac1]"
                    }`}
                  >
                    <div className={`h-20 w-full rounded-xl ${th.bg} p-2.5 shadow-inner`}>
                      <div className={`h-6 w-3/4 rounded-md ${th.cardBg} border ${th.border}`} />
                      <div className="mt-2 flex gap-1.5">
                        <div className={`h-3 w-8 rounded ${th.cardBg}`} />
                        <div className={`h-3 w-5 rounded ${th.cardBg}`} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-bold text-[#1b1c19]">{th.name}</p>
                        <p className="text-[11px] text-[#817d85]">{th.desc}</p>
                      </div>
                      {form.theme === th.id && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Typography Scale */}
            <div className="mt-8 border-t border-[#eeeae2] pt-6">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-[#7d7982]">
                Interface Typography Scale
              </label>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { id: "compact", label: "Compact", scale: "85%" },
                  { id: "standard", label: "Standard", scale: "100%" },
                  { id: "expanded", label: "Expanded", scale: "115%" },
                ].map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => updateForm("fontSize", size.id)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      form.fontSize === size.id
                        ? "border-black bg-black text-white shadow-xs"
                        : "border-[#ece8de] bg-[#fbfaf8] text-[#48443e] hover:bg-[#f4f2ee]"
                    }`}
                  >
                    <p className="text-[13px] font-bold">{size.label}</p>
                    <p className="text-[11px] opacity-75">{size.scale}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Accessibility Toggles */}
            <div className="mt-8 divide-y divide-[#eeeae2] rounded-2xl bg-[#f7f5f0] px-4">
              <Toggle
                checked={toggles.reduceAnimations}
                onChange={(val) => updateToggle("reduceAnimations", val)}
                label="Reduce Motion & Animations"
                description="Disable smooth page transitions and sliding micro-interactions."
              />

              <Toggle
                checked={toggles.highContrastBorders}
                onChange={(val) => updateToggle("highContrastBorders", val)}
                label="High-Contrast Dividers"
                description="Deepen element borders and card boundaries for enhanced daylight legibility."
              />
            </div>
          </Card>
        );

      case "content":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 05 — Curation ]"
              title="Content & Feeds"
              description="Tune feed algorithms, media autoplay bandwidth, and muted topic filters."
            />

            <div className="mt-6 divide-y divide-[#eeeae2] rounded-2xl bg-[#f7f5f0] px-4">
              <Toggle
                checked={toggles.autoplayMedia}
                onChange={(val) => updateToggle("autoplayMedia", val)}
                label="Autoplay Video Reels"
                description="Play video posts silently as they scroll into view."
              />

              <Toggle
                checked={toggles.losslessAudio}
                onChange={(val) => updateToggle("losslessAudio", val)}
                label="Lossless Audio Streaming"
                description="Stream FLAC/AAC master tracks on Studio Sound players when available."
              />

              <Toggle
                checked={toggles.sensitiveContentFilter}
                onChange={(val) => updateToggle("sensitiveContentFilter", val)}
                label="Strict Sensitive Content Filter"
                description="Place blur curtains over provocative or unverified community imagery."
              />
            </div>

            {/* Muted Words Manager */}
            <div className="mt-6 rounded-2xl border border-[#ece8de] bg-[#fbfaf8] p-5">
              <h3 className="text-[13.5px] font-semibold text-[#1b1c19]">Muted Keywords & Tags</h3>
              <p className="mt-1 text-[12px] text-[#7d7982]">
                Posts containing these keywords will be quietly hidden from your Home and Explore feeds.
              </p>

              <form onSubmit={handleAddMutedWord} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a tag to mute (e.g. spoilers)..."
                  value={newWordInput}
                  onChange={(e) => setNewWordInput(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none transition focus:border-black/30"
                />
                <button
                  type="submit"
                  disabled={!newWordInput.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </form>

              <div className="mt-3.5 flex flex-wrap gap-2">
                {mutedWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#ece8de] bg-white px-3 py-1 text-[12px] font-medium text-[#48443e] shadow-2xs transition hover:border-[#cfcac1]"
                  >
                    <span>#{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMutedWord(word)}
                      className="text-[#9e9a93] hover:text-[#d32f2f]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </Card>
        );

      case "friends":
        const filteredFriends = friendsList.filter(
          (f) =>
            f.name.toLowerCase().includes(friendsSearch.toLowerCase()) ||
            f.handle.toLowerCase().includes(friendsSearch.toLowerCase())
        );

        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 06 — Circles ]"
              title="Close Friends & Circles"
              description="Organize your inner circle for sharing private stories, raw 35mm rolls, and unreleased essays."
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8a93]" />
                <input
                  type="text"
                  placeholder="Search close friends..."
                  value={friendsSearch}
                  onChange={(e) => setFriendsSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#ece8de] bg-[#fbfaf8] pl-9 pr-3 text-[13px] outline-none transition focus:border-black/30 focus:bg-white"
                />
              </div>
              <span className="shrink-0 rounded-full bg-[#f4f2ee] px-3.5 py-1.5 text-center text-[11.5px] font-semibold text-[#48443e]">
                {friendsList.filter((f) => f.active).length} Active in Circle
              </span>
            </div>

            <div className="mt-5 divide-y divide-[#eeeae2] rounded-2xl border border-[#ece8de] bg-white">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3.5 transition hover:bg-[#faf9f5]"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      onError={(e) => {
                        e.target.src = "/recreation/avatar_left_elena.png";
                      }}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-bold text-[#1b1c19]">{friend.name}</span>
                        <span className="text-[11px] text-[#817d85]">• {friend.role}</span>
                      </div>
                      <p className="font-mono text-[11.5px] text-[#8a858f]">@{friend.handle}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFriendActive(friend.id)}
                    className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-all active:scale-95 ${
                      friend.active
                        ? "bg-black text-white hover:bg-neutral-800"
                        : "border border-[#ece8de] bg-[#f4f2ee] text-[#55524d] hover:bg-[#e8e4dc]"
                    }`}
                  >
                    {friend.active ? "In Circle" : "+ Add to Circle"}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        );

      case "help":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 07 — Support ]"
              title="Help & Guidelines"
              description="Learn about the Staple protocol, copyright sovereignty, community safety, and direct concierge."
            />

            <div className="mt-6 space-y-3">
              {[
                { title: "Community Guidelines & Curatorial Standards", desc: "Understanding our zero-spam, high-signal editorial expectations." },
                { title: "Privacy Spec & Cryptographic Proofs", desc: "How our peer-to-peer data sovereignty and archival vaults work." },
                { title: "Account Recovery & Seed Phrases", desc: "Hardware key resets and multi-factor recovery pathways." },
                { title: "Staple Protocol API & Developer Docs", desc: "Build RSS hooks, headless clients, and custom media decoders." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#ece8de] bg-[#fbfaf8] p-4 transition-all hover:border-black/20 hover:bg-white hover:shadow-xs"
                >
                  <div>
                    <h4 className="text-[13.5px] font-semibold text-[#1b1c19] group-hover:text-black">
                      {item.title}
                    </h4>
                    <p className="mt-0.5 text-[11.5px] text-[#817d85]">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8a8690] transition-transform group-hover:translate-x-1" />
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-[#091522] p-6 text-white">
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#b8ede0]">
                <Sparkles className="h-4 w-4" />
                <span>Priority Concierge</span>
              </div>
              <h3 className="mt-2 text-[17px] font-bold">Need assistance with your archive?</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#c1c8d4]">
                Verified Vanguard members receive direct 24/7 human engineering support. Typical response in under 15 minutes.
              </p>
              <button
                type="button"
                onClick={() => alert("Staple Concierge connected! Ticket #ST-8821 dispatched to engineering.")}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-[12px] font-bold text-black transition hover:bg-neutral-200 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Contact Staple Concierge</span>
              </button>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full text-[#1b1c19]">
      {/* Top Header & Breadcrumbs */}
      <div className="mx-auto max-w-[1240px] pt-4 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeae2] pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8a858f]">
              <span>Staple Core</span>
              <span>/</span>
              <span>Preferences</span>
              <span>/</span>
              <span className="text-[#1b1c19]">
                {sections.find((s) => s.id === activeSection)?.label}
              </span>
            </div>
            <h1 className="mt-1 text-[32px] font-extrabold tracking-[-0.04em] text-[#1b1c19] sm:text-[38px]">
              Settings
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6ecdb] bg-[#edfce9] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#2d6a4f] shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              Cloud Synced (v0.9.4)
            </span>

            <button
              type="button"
              onClick={() => setActivityOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-[#ece8de] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#3a3733] shadow-2xs transition hover:bg-[#f4f2ee] active:scale-95"
            >
              <Activity className="h-3.5 w-3.5 text-[#636166]" />
              <span>Activity Log</span>
            </button>
          </div>
        </div>

        {/* Mobile Section Pills Carousel */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar lg:hidden">
          {sections.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium transition-all active:scale-95 ${
                  isActive
                    ? "bg-black text-white shadow-xs font-semibold"
                    : "border border-[#ece8de] bg-white text-[#55524d] hover:bg-[#f4f2ee]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ffad9b] px-1 text-[10px] font-bold text-[#643b33]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main 3-Column Layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
          {/* Left Navigation Column (Desktop) */}
          <aside className="hidden lg:col-span-3 lg:block space-y-4 sticky top-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#938e98]" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-2xl border border-[#ece8de] bg-white pl-10 pr-8 text-[12.5px] outline-none shadow-2xs transition focus:border-black/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#938e98] hover:text-black"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Navigation Menu */}
            <div className="rounded-2xl border border-[#ece8de] bg-white p-2 shadow-[0_2px_8px_rgba(24,22,18,0.02)]">
              <nav className="space-y-1">
                {filteredSections.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] transition-all duration-150 ${
                        isActive
                          ? "bg-black font-semibold text-white shadow-xs"
                          : "text-[#4a474d] hover:bg-[#f5f3ee] hover:text-[#1b1c19]"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            isActive ? "text-white" : "text-[#77737a]"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffad9b] px-1.5 text-[10.5px] font-bold text-[#643b33]">
                          {item.badge}
                        </span>
                      )}

                      {item.count && (
                        <span
                          className={`text-[11px] font-mono ${
                            isActive ? "text-white/70" : "text-[#9e9a93]"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="my-2 border-t border-[#f0ece4]" />

              <button
                type="button"
                onClick={() => setLogoutModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#dc2626] transition hover:bg-[#fef2f2]"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log Out of Staple</span>
              </button>
            </div>

            {/* Archival Vault Progress Card */}
            <div className="rounded-2xl border border-[#ece8de] bg-[#f7f5f0] p-4 text-[#4a474d] shadow-2xs">
              <div className="flex items-center justify-between text-[11.5px] font-semibold">
                <span className="uppercase tracking-wider text-[#7d7982]">Archival Vault</span>
                <span className="font-mono text-[#1b1c19]">4.2 / 10 GB</span>
              </div>

              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[#dedad2]">
                <div
                  className="h-full rounded-full bg-black transition-all duration-700 ease-out"
                  style={{ width: "42%" }}
                />
              </div>

              <p className="mt-2.5 text-[11px] leading-relaxed text-[#75716c]">
                High-fidelity 35mm negative scans and lossless audio drafts backed up continuously.
              </p>
            </div>
          </aside>

          {/* Center Main Content (Desktop col-span-6) */}
          <main className="min-w-0 lg:col-span-6">
            <div key={activeSection} className="animate-fade-in-slide">
              {renderActiveSection()}
            </div>
          </main>

          {/* Right Rail Sidebar (Desktop col-span-3) */}
          <aside className="space-y-6 lg:col-span-3">
            {/* Security Audit Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8a858f]">
                <span>Health Audit</span>
                <ShieldCheck className="h-4 w-4 text-[#1863dc]" />
              </div>

              <h3 className="mt-3 text-[17px] font-bold text-[#1b1c19]">Security Score</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#75716c]">
                Your cryptographic Staple identity protection is optimal.
              </p>

              {/* Gauge */}
              <div className="mt-5 flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    <path
                      className="text-[#eeece7]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-black transition-all duration-1000 ease-out"
                      strokeDasharray="92, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-mono text-[13px] font-bold text-[#1b1c19]">92%</span>
                </div>

                <div>
                  <p className="text-[13px] font-bold leading-tight text-[#1b1c19]">
                    Institutional<br />Grade Level
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#2d6a4f]">
                    3 of 3 checks pass
                  </p>
                </div>
              </div>

              {/* Checks */}
              <div className="mt-5 space-y-2 border-t border-[#f0ece4] pt-4 text-[11.5px]">
                <div className="flex items-center gap-2 text-[#2d6a4f]">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="text-[#3a3733]">Hardware Passkeys active</span>
                </div>
                <div className="flex items-center gap-2 text-[#2d6a4f]">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="text-[#3a3733]">No leaked token telemetry</span>
                </div>
                <div className="flex items-center gap-2 text-[#2d6a4f]">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="text-[#3a3733]">Zero untrusted IP requests</span>
                </div>
              </div>
            </Card>

            {/* Data Sovereignty Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8a858f]">
                <span>Data Sovereignty</span>
                <Download className="h-4 w-4 text-[#75716c]" />
              </div>

              <h3 className="mt-3 text-[16px] font-bold text-[#1b1c19]">Portable Archive</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[#75716c]">
                Export all published essays, story highlights, raw photos, and network edges in JSON.
              </p>

              <div className="mt-4">
                {archiveStatus === "idle" && (
                  <button
                    type="button"
                    onClick={triggerArchiveDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f4f2ee] py-3 text-[12.5px] font-bold text-[#1b1c19] transition hover:bg-[#eae6de] active:scale-98"
                  >
                    <Download className="h-4 w-4" />
                    <span>Request Archive (.zip)</span>
                  </button>
                )}

                {archiveStatus === "generating" && (
                  <div className="rounded-xl bg-[#f7f5f0] p-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-[12px] font-medium text-[#1b1c19]">
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span>Compiling archive ({archiveProgress}%)...</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#dedad2]">
                      <div
                        className="h-full rounded-full bg-black transition-all duration-300"
                        style={{ width: `${archiveProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {archiveStatus === "ready" && (
                  <div className="rounded-xl bg-[#edfce9] p-3 text-center border border-[#c3e8ca]">
                    <p className="text-[12px] font-bold text-[#2d6a4f]">✓ Archive Ready (4.2 GB)</p>
                    <a
                      href="#download"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Starting download: elena_vance_staple_archive_2025.zip");
                        setArchiveStatus("idle");
                      }}
                      className="mt-1.5 inline-block text-[11.5px] font-semibold text-[#1863dc] underline"
                    >
                      Click to download file
                    </a>
                  </div>
                )}
              </div>

              {/* Connected Platforms */}
              <div className="mt-5 border-t border-[#f0ece4] pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a858f]">
                  Connected Platforms
                </span>
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-[#f7f5f0] px-3 py-2 text-[12px]">
                    <span className="font-medium text-[#1b1c19]">Instagram Graph</span>
                    <span className="text-[10.5px] font-semibold text-[#2d6a4f]">Linked</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#f7f5f0] px-3 py-2 text-[12px]">
                    <span className="font-medium text-[#1b1c19]">Substack RSS</span>
                    <span className="text-[10.5px] font-semibold text-[#2d6a4f]">Linked</span>
                  </div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* Floating Save Dock */}
      {hasChanges && (
        <div className="fixed bottom-16 sm:bottom-6 inset-x-4 sm:inset-x-auto sm:right-8 z-40 max-w-md mx-auto animate-toast">
          <div className="flex items-center justify-between gap-4 rounded-full border border-black/10 bg-black/90 px-5 py-3 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="h-2 w-2 rounded-full bg-[#ffad9b] animate-ping" />
              <span className="font-medium">Unsaved modifications</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="text-[12px] font-medium text-white/70 hover:text-white"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-black transition-transform hover:bg-neutral-200 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Toast Alert */}
      {savedToast && (
        <div className="fixed bottom-16 sm:bottom-6 right-6 z-50 animate-toast">
          <div className="flex items-center gap-2.5 rounded-full bg-[#1b1c19] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-xl">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10b981] text-white">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            </span>
            <span>Settings synced successfully!</span>
          </div>
        </div>
      )}

      {/* Change Photo Modal */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-[#1b1c19]">Change Profile Photo</h3>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="rounded-full bg-[#f4f2ee] p-1.5 text-[#55524d] hover:bg-[#e8e4dc]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-[12.5px] text-[#75716c]">
              Select from your curated portfolio avatars or uploaded negative portraits:
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {avatarOptions.map((opt) => (
                <button
                  key={opt.src}
                  type="button"
                  onClick={() => {
                    setCurrentAvatar(opt.src);
                    setHasChanges(true);
                    setPhotoModalOpen(false);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all ${
                    currentAvatar === opt.src
                      ? "border-black bg-[#f7f5f0] ring-2 ring-black"
                      : "border-[#ece8de] bg-white hover:border-[#cfcac1]"
                  }`}
                >
                  <img
                    src={opt.src}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-1 ring-black/10"
                  />
                  <span className="text-[11.5px] font-medium text-[#1b1c19]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {activityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#eeeae2] pb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#1863dc]" />
                <h3 className="text-[18px] font-bold text-[#1b1c19]">Activity Log & Audit Trail</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivityOpen(false)}
                className="rounded-full bg-[#f4f2ee] p-1.5 text-[#55524d] hover:bg-[#e8e4dc]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {[
                { event: "Two-Factor Passkey validated", device: "MacBook Pro 16", time: "Today, 10:42 AM", ip: "San Francisco, CA" },
                { event: "Profile biography updated", device: "Safari 17.4", time: "Yesterday, 04:15 PM", ip: "San Francisco, CA" },
                { event: "Archival snapshot created (4.2 GB)", device: "Staple Daemon", time: "Nov 20, 03:00 AM", ip: "Automated Backup" },
                { event: "New session authenticated", device: "iPhone 15 Pro", time: "Nov 19, 09:20 PM", ip: "Tokyo, JP" },
                { event: "Display name verified by Guild", device: "Staple Protocol", time: "Nov 14, 11:00 AM", ip: "Guild Consensus" },
              ].map((item, idx) => (
                <div key={idx} className="rounded-xl border border-[#ece8de] bg-[#fbfaf8] p-3 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1b1c19]">{item.event}</span>
                    <span className="font-mono text-[11px] text-[#8e8a93]">{item.time}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#75716c]">
                    <span>{item.device}</span>
                    <span>{item.ip}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-[#eeeae2] flex justify-end">
              <button
                type="button"
                onClick={() => setActivityOpen(false)}
                className="rounded-full bg-black px-5 py-2 text-[12px] font-semibold text-white hover:bg-neutral-800"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-in text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fef2f2] text-[#dc2626]">
              <LogOut className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-[18px] font-bold text-[#1b1c19]">Log Out of Staple?</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#75716c]">
              Your active hardware passkey sessions will be suspended until your next cryptographic verification.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 rounded-full border border-[#ece8de] bg-[#f4f2ee] py-2.5 text-[12.5px] font-semibold text-[#48443e] hover:bg-[#eae6de]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutModalOpen(false);
                  alert("Logged out of Staple session.");
                }}
                className="flex-1 rounded-full bg-[#dc2626] py-2.5 text-[12.5px] font-semibold text-white hover:bg-red-700"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
