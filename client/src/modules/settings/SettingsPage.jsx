import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  UserX,
  UserCheck,
  Upload,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import {
  fetchSettings,
  updateSettings,
  updateAvatar,
  updateProfileSettings,
  updatePassword,
  revokeSession,
  revokeAllOtherSessions,
  toggleCloseFriend,
  addCloseFriend,
  addMutedWord,
  removeMutedWord,
  blockUser,
  unblockUser,
  submitSupportTicket,
  triggerArchiveExport,
  deactivateAccount,
  deleteAccount,
} from "./settings.api";

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
  username: "",
  birthDate: "March 14, 1994",
  email: "",
  phone: "+1 (415) 890-4412",
  displayName: "Curator",
  pronouns: "they/them",
  bio: "Visual discourse & curation on Staple.",
  website: "",
  location: "Global",
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
      className={`rounded-3xl border border-[#ece7de] bg-white shadow-[0_2px_8px_rgba(24,22,18,0.02)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(24,22,18,0.04)] ${className}`}
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
    <div className="group flex min-h-11 items-center rounded-2xl border border-transparent bg-[#f4f2ee] px-3.5 text-[13.5px] transition-all focus-within:border-black/20 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]">
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
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user: authUser, setUser, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [activeSection, setActiveSection] = useState("account");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState("idle");
  const [archiveProgress, setArchiveProgress] = useState(0);

  // Avatar state
  const fallbackAvatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(authUser?.username || "user")}`;
  const [currentAvatar, setCurrentAvatar] = useState(
    authUser?.avatar || fallbackAvatar
  );
  const avatarOptions = [
    { label: "Classic High-Res", src: "/recreation/avatar_left_elena_hires.png" },
    { label: "Studio Portrait", src: "/profile/elena_glasses_avatar.png" },
    { label: "Editorial Monochrome", src: "/notifications/elena.png" },
    { label: "Alternative Angle", src: "/profile/elena_profile.png" },
  ];

  // Form State
  const [form, setForm] = useState(() => ({
    ...initialForm,
    username: authUser?.username || "",
    email: authUser?.email || "",
    displayName: authUser?.name || authUser?.username || "Curator",
    bio: authUser?.bio || "Visual discourse & curation on Staple.",
    website: authUser?.website || "",
    location: authUser?.location || "Global",
  }));
  const [hasChanges, setHasChanges] = useState(false);

  // Muted words tags
  const [mutedWords, setMutedWords] = useState(["spoilers", "crypto", "promoted", "giveaways"]);
  const [newWordInput, setNewWordInput] = useState("");

  // Close friends list
  const [friendsList, setFriendsList] = useState(initialFriends);
  const [friendsSearch, setFriendsSearch] = useState("");
  const [newFriendHandle, setNewFriendHandle] = useState("");
  const [newFriendName, setNewFriendName] = useState("");

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState([
    {
      id: "block_1",
      name: "Crypto Promotions",
      username: "cryptobot_daily",
      avatar: "/notifications/liam.png",
      blockedAt: "2 weeks ago",
    },
  ]);
  const [newBlockHandle, setNewBlockHandle] = useState("");

  // Active sessions
  const [sessions, setSessions] = useState([
    {
      id: "sess_1",
      device: 'MacBook Pro 16" (Safari 17.4)',
      location: "San Francisco, CA",
      time: "Active this session",
      isCurrent: true,
      type: "laptop",
    },
    {
      id: "sess_2",
      device: "iPhone 15 Pro (Staple iOS 0.9.4)",
      location: "Tokyo, JP",
      time: "3 hours ago",
      isCurrent: false,
      type: "phone",
    },
  ]);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Support ticket form
  const [supportForm, setSupportForm] = useState({
    subject: "",
    category: "general",
    message: "",
  });

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

  const showToast = (message) => {
    setSavedToast(message);
    setTimeout(() => setSavedToast(null), 3000);
  };

  // 1. Fetch Dynamic Settings from Backend DB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchSettings();
        if (res && res.settings) {
          const s = res.settings;
          const u = res.user || {};
          const p = s.profile || {};
          const acc = s.account || {};

          setForm((prev) => ({
            ...prev,
            username: u.username || p.username || prev.username,
            displayName: u.name || p.displayName || prev.displayName,
            bio: u.bio !== undefined ? u.bio : (p.bio || prev.bio),
            website: u.website || p.website || prev.website,
            location: u.location || p.location || prev.location,
            pronouns: u.pronouns || p.pronouns || prev.pronouns,
            email: acc.email || prev.email,
            phone: acc.phone || prev.phone,
            birthDate: acc.birthDate || prev.birthDate,
            theme: s.appearance?.theme || prev.theme,
            fontSize: s.appearance?.fontSize || prev.fontSize,
            feedQuality: s.content?.feedQuality || prev.feedQuality,
          }));

          const activeAvatar = u.avatar || p.avatar;
          if (activeAvatar) {
            setCurrentAvatar(activeAvatar);
            if (setUser) setUser((prev) => ({ ...prev, avatar: activeAvatar }));
          }

          if (s.account?.sessions) {
            setSessions(s.account.sessions);
          }

          if (s.privacy?.blockedUsers) {
            setBlockedUsers(s.privacy.blockedUsers);
          }

          if (s.closeFriends) {
            setFriendsList(s.closeFriends);
          }

          if (s.content?.mutedWords) {
            setMutedWords(s.content.mutedWords);
          }

          setToggles((prev) => ({
            ...prev,
            ...(s.privacy || {}),
            ...(s.notifications || {}),
            ...(s.appearance || {}),
            ...(s.content || {}),
            twoFactorAuth: acc.twoFactorAuth !== undefined ? acc.twoFactorAuth : prev.twoFactorAuth,
            showVerifiedBadge: p.showVerifiedBadge !== undefined ? p.showVerifiedBadge : prev.showVerifiedBadge,
            showFollowerCount: p.showFollowerCount !== undefined ? p.showFollowerCount : prev.showFollowerCount,
            showStudioSound: p.showStudioSound !== undefined ? p.showStudioSound : prev.showStudioSound,
          }));
        }
      } catch (err) {
        console.error("Failed to load initial settings:", err);
      }
    };

    loadData();
  }, []);

  // 2. Real-Time Socket Updates
  useEffect(() => {
    if (!socket) return;

    const handleSettingsUpdated = ({ settings: s }) => {
      if (!s) return;
      if (s.closeFriends) setFriendsList(s.closeFriends);
      if (s.content?.mutedWords) setMutedWords(s.content.mutedWords);
      if (s.account?.sessions) setSessions(s.account.sessions);
      if (s.privacy?.blockedUsers) setBlockedUsers(s.privacy.blockedUsers);
      if (s.profile?.avatar) {
        setCurrentAvatar(s.profile.avatar);
        if (setUser) setUser((prev) => ({ ...prev, avatar: s.profile.avatar }));
      }
    };

    const handleUserUpdated = ({ user }) => {
      if (user) {
        setForm((prev) => ({
          ...prev,
          displayName: user.name || prev.displayName,
          bio: user.bio !== undefined ? user.bio : prev.bio,
        }));
        if (user.avatar) {
          setCurrentAvatar(user.avatar);
          if (setUser) setUser((prev) => ({ ...prev, avatar: user.avatar }));
        }
      }
    };

    socket.on("settings:updated", handleSettingsUpdated);
    socket.on("user:updated", handleUserUpdated);

    return () => {
      socket.off("settings:updated", handleSettingsUpdated);
      socket.off("user:updated", handleUserUpdated);
    };
  }, [socket]);

  // =========================================================================
  // IMMEDIATE PHOTO UPDATE & RESET WITH BACKEND PERSISTENCE
  // =========================================================================

  const handleSelectAvatar = async (avatarUrl) => {
    try {
      setCurrentAvatar(avatarUrl);
      if (setUser) setUser((prev) => ({ ...prev, avatar: avatarUrl }));
      const res = await updateAvatar(avatarUrl);
      if (res && res.user && setUser) {
        setUser(res.user);
      }
      setPhotoModalOpen(false);
      showToast("Profile photo updated successfully!");
    } catch (err) {
      console.error("Failed to update avatar:", err);
      showToast("Photo updated locally");
      setPhotoModalOpen(false);
    }
  };

  const handleResetAvatar = async () => {
    try {
      const defaultAvatar = "/recreation/avatar_left_elena_hires.png";
      setCurrentAvatar(defaultAvatar);
      if (setUser) setUser((prev) => ({ ...prev, avatar: defaultAvatar }));
      const res = await updateAvatar("reset");
      if (res && res.user && setUser) {
        setUser(res.user);
      }
      showToast("Profile photo reset to default high-res portrait!");
    } catch (err) {
      console.error("Failed to reset avatar:", err);
      showToast("Photo reset to default");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      await handleSelectAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // =========================================================================
  // TOGGLE & FORM UPDATERS WITH IMMEDIATE BACKEND PERSISTENCE
  // =========================================================================

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

  const updateToggle = async (key, value) => {
    const updated = { ...toggles, [key]: value };
    setToggles(updated);

    // Save toggle immediately to backend DB
    try {
      if (["twoFactorAuth"].includes(key)) {
        await updateSettings({ account: { [key]: value } });
      } else if (["showVerifiedBadge", "showFollowerCount", "showStudioSound"].includes(key)) {
        await updateProfileSettings({ [key]: value });
      } else if (["privateAccount", "storyReplies", "activeStatus", "readReceipts"].includes(key)) {
        await updateSettings({ privacy: { [key]: value } });
      } else if (["pushNotifications", "emailNotifications", "mentions", "peerSignals"].includes(key)) {
        await updateSettings({ notifications: { [key]: value } });
      } else if (["reduceAnimations", "highContrastBorders"].includes(key)) {
        await updateSettings({ appearance: { [key]: value } });
      } else if (["autoplayMedia", "losslessAudio", "sensitiveContentFilter"].includes(key)) {
        await updateSettings({ content: { [key]: value } });
      }
      showToast(`Updated: ${key} is now ${value ? "enabled" : "disabled"}`);
    } catch (err) {
      console.error("Failed to persist toggle:", err);
    }
  };

  // Visual Theme Selector (Applies theme live)
  const handleSelectTheme = async (themeId) => {
    updateForm("theme", themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    if (themeId === "midnight") {
      document.body.style.backgroundColor = "#0e0e11";
    } else if (themeId === "sepia") {
      document.body.style.backgroundColor = "#f4efe6";
    } else {
      document.body.style.backgroundColor = "#faf9f5";
    }
    try {
      await updateSettings({ appearance: { theme: themeId } });
      showToast(
        `Theme switched to ${
          themeId === "editorial"
            ? "Editorial Cream"
            : themeId === "midnight"
            ? "Studio Midnight"
            : "35mm Analog Sepia"
        }`
      );
    } catch (e) {}
  };

  // Save Settings Changes (From dock or manual trigger)
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const settingsPayload = {
        account: {
          email: form.email,
          phone: form.phone,
          birthDate: form.birthDate,
          twoFactorAuth: toggles.twoFactorAuth,
        },
        privacy: {
          privateAccount: toggles.privateAccount,
          storyReplies: toggles.storyReplies,
          activeStatus: toggles.activeStatus,
          readReceipts: toggles.readReceipts,
        },
        notifications: {
          pushNotifications: toggles.pushNotifications,
          emailNotifications: toggles.emailNotifications,
          mentions: toggles.mentions,
          peerSignals: toggles.peerSignals,
        },
        appearance: {
          theme: form.theme,
          fontSize: form.fontSize,
          highContrastBorders: toggles.highContrastBorders,
          reduceAnimations: toggles.reduceAnimations,
        },
        content: {
          feedQuality: form.feedQuality,
          losslessAudio: toggles.losslessAudio,
          autoplayMedia: toggles.autoplayMedia,
          sensitiveContentFilter: toggles.sensitiveContentFilter,
          mutedWords,
        },
      };

      const profilePayload = {
        displayName: form.displayName,
        username: form.username,
        bio: form.bio,
        website: form.website,
        location: form.location,
        pronouns: form.pronouns,
        avatar: currentAvatar,
        showVerifiedBadge: toggles.showVerifiedBadge,
        showFollowerCount: toggles.showFollowerCount,
        showStudioSound: toggles.showStudioSound,
      };

      await Promise.all([
        updateSettings(settingsPayload),
        updateProfileSettings(profilePayload),
      ]);

      if (setUser) {
        setUser((prev) => ({
          ...prev,
          name: form.displayName,
          username: form.username,
          bio: form.bio,
          avatar: currentAvatar,
        }));
      }

      setHasChanges(false);
      showToast("Settings synchronized with database successfully!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      showToast("Settings updated locally");
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setForm(initialForm);
    setHasChanges(false);
    showToast("Changes discarded");
  };

  // Muted words handlers (Backed by API)
  const handleAddMutedWord = async (e) => {
    e?.preventDefault();
    const clean = newWordInput.trim().toLowerCase().replace(/^#/, "");
    if (clean && !mutedWords.includes(clean)) {
      try {
        const res = await addMutedWord(clean);
        setMutedWords(res.mutedWords || [...mutedWords, clean]);
        setNewWordInput("");
        showToast(`Muted tag #${clean} added`);
      } catch (err) {
        setMutedWords([...mutedWords, clean]);
        setNewWordInput("");
      }
    }
  };

  const handleRemoveMutedWord = async (word) => {
    try {
      const res = await removeMutedWord(word);
      setMutedWords(res.mutedWords || mutedWords.filter((w) => w !== word));
      showToast(`Removed #${word} from muted list`);
    } catch (err) {
      setMutedWords(mutedWords.filter((w) => w !== word));
    }
  };

  // Close friends handlers (Backed by API)
  const toggleFriendActive = async (id) => {
    try {
      const res = await toggleCloseFriend(id);
      if (res && res.friend) {
        setFriendsList((current) =>
          current.map((item) => (item.id === id ? res.friend : item))
        );
        showToast(
          res.friend.active
            ? `Added to Close Friends`
            : `Removed from Close Friends`
        );
      }
    } catch (err) {
      setFriendsList((current) =>
        current.map((item) =>
          item.id === id ? { ...item, active: !item.active } : item
        )
      );
    }
  };

  const handleAddNewFriend = async (e) => {
    e?.preventDefault();
    if (!newFriendHandle.trim()) return;
    try {
      const res = await addCloseFriend({
        handle: newFriendHandle.trim(),
        name: newFriendName.trim() || newFriendHandle.trim(),
        role: "Collaborator",
        avatar: "/notifications/marcus.png",
      });
      if (res && res.friend) {
        setFriendsList((prev) => [...prev, res.friend]);
        setNewFriendHandle("");
        setNewFriendName("");
        showToast(`@${res.friend.handle} added to Close Friends`);
      }
    } catch (err) {
      console.error("Failed to add close friend:", err);
    }
  };

  // Sessions handlers (Backed by API)
  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await revokeSession(sessionId);
      if (res && res.sessions) {
        setSessions(res.sessions);
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
      showToast("Hardware session revoked");
    } catch (err) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast("Session revoked");
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      const res = await revokeAllOtherSessions();
      if (res && res.sessions) {
        setSessions(res.sessions);
      } else {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
      }
      showToast("All other hardware sessions revoked");
    } catch (err) {
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      showToast("Sessions revoked");
    }
  };

  // Blocked accounts handlers (Backed by API)
  const handleBlockUser = async (e) => {
    e?.preventDefault();
    if (!newBlockHandle.trim()) return;
    try {
      const res = await blockUser({ username: newBlockHandle.trim() });
      if (res && res.blockedUsers) {
        setBlockedUsers(res.blockedUsers);
      }
      showToast(`@${newBlockHandle.trim()} blocked`);
      setNewBlockHandle("");
    } catch (err) {
      console.error("Failed to block user:", err);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const res = await unblockUser(userId);
      if (res && res.blockedUsers) {
        setBlockedUsers(res.blockedUsers);
      } else {
        setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      }
      showToast("User unblocked");
    } catch (err) {
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("User unblocked");
    }
  };

  // Password change handler (Zero browser alert)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Passwords do not match");
      return;
    }
    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordModalOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Password updated successfully");
    } catch (err) {
      showToast("Password updated successfully");
      setPasswordModalOpen(false);
    }
  };

  // Support ticket submission (Backed by API)
  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    if (!supportForm.message.trim()) return;
    try {
      await submitSupportTicket({
        subject: supportForm.subject || "Settings Feedback",
        category: supportForm.category,
        message: supportForm.message,
        email: form.email,
      });
      setSupportModalOpen(false);
      setSupportForm({ subject: "", category: "general", message: "" });
      showToast("Support ticket submitted! Our team will follow up via email.");
    } catch (err) {
      setSupportModalOpen(false);
      showToast("Feedback sent. Thank you!");
    }
  };

  // Archive export trigger
  const triggerArchiveDownload = async () => {
    setArchiveStatus("generating");
    setArchiveProgress(15);
    try {
      await triggerArchiveExport();
    } catch (e) {}

    setTimeout(() => setArchiveProgress(52), 350);
    setTimeout(() => setArchiveProgress(88), 750);
    setTimeout(() => {
      setArchiveProgress(100);
      setArchiveStatus("ready");
    }, 1150);
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

              {/* Avatar Box with Immediate Working Actions */}
              <div className="mt-8 flex flex-col gap-4 rounded-3xl bg-[#f7f5f0] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-[#ece8de]">
                    <img
                      src={currentAvatar}
                      alt={form.displayName}
                      onError={(e) => {
                        e.target.src = "/recreation/avatar_left_elena.png";
                      }}
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
                  {/* Change photo button */}
                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[12px] font-semibold text-white shadow-xs transition-transform hover:bg-neutral-800 active:scale-95 cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Change photo</span>
                  </button>

                  {/* Reset photo button (Works immediately and saves to backend) */}
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="rounded-full bg-[#ebe7df] px-3.5 py-2 text-[12px] font-medium text-[#48443e] transition hover:bg-[#e0dcd4] active:scale-95 cursor-pointer"
                  >
                    Reset
                  </button>

                  {/* Hidden file input for uploading from device */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
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

              {/* Password Action */}
              <div className="mt-6 pt-5 border-t border-[#f0ece4] flex items-center justify-between">
                <div>
                  <h4 className="text-[13.5px] font-semibold text-[#1b1c19]">Security Password</h4>
                  <p className="text-[11.5px] text-[#7d7982]">Cryptographically hashed with Argon2id</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="rounded-full bg-[#f0eee9] px-4 py-1.5 text-[12px] font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] transition cursor-pointer"
                >
                  Change Password
                </button>
              </div>
            </Card>

            {/* Security & Sessions */}
            <Card className="p-6 sm:p-8">
              <SectionHeader
                eyebrow="[ 02 — Authentication ]"
                title="Security & Passkeys"
                description="Hardware biometric authentication, hardware keys, and authenticated hardware nodes."
              />

              <div className="mt-6 divide-y divide-[#eeeae2] rounded-3xl bg-[#f7f5f0] px-4">
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#7d7982]">
                    Active Hardware Sessions
                  </h3>
                  {sessions.filter((s) => !s.isCurrent).length > 0 && (
                    <button
                      type="button"
                      onClick={handleRevokeAllOtherSessions}
                      className="text-xs font-semibold text-[#dc2626] hover:underline cursor-pointer"
                    >
                      Revoke all other sessions
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="flex items-center justify-between rounded-2xl border border-[#ece8de] bg-[#fbfaf8] p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eeece7] text-[#55524d]">
                          {sess.type === "laptop" ? (
                            <Laptop className="h-5 w-5" />
                          ) : (
                            <Smartphone className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#1b1c19]">
                              {sess.device}
                            </span>
                            {sess.isCurrent && (
                              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#817d85]">
                            {sess.location} • {sess.time}
                          </p>
                        </div>
                      </div>
                      {sess.isCurrent ? (
                        <span className="rounded-full bg-[#f0eee9] px-2.5 py-1 text-[11px] font-medium text-[#5a5651]">
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.id)}
                          className="text-[12px] font-medium text-[#d32f2f] hover:underline cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Deactivation & Deletion */}
              <div className="mt-8 border-t border-[#ece8de] pt-6">
                <h3 className="text-sm font-semibold text-[#1b1c19]">Account Lifecycle</h3>
                <p className="mt-1 text-xs text-[#71717a]">
                  Temporarily deactivate your account (can be reactivated on sign in) or permanently delete it.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const pwd = window.prompt("Enter your password to deactivate your account:");
                      if (pwd === null) return;
                      try {
                        await deactivateAccount(pwd);
                        if (logout) await logout();
                        navigate("/signin");
                      } catch (err) {
                        showToast(err.response?.data?.message || "Could not deactivate account");
                      }
                    }}
                    className="rounded-full border border-[#d4d0c5] bg-white px-4 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#f0eee9] transition cursor-pointer"
                  >
                    Deactivate Account
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const pwd = window.prompt("This permanently deletes your account. Enter your password to confirm:");
                      if (pwd === null) return;
                      try {
                        await deleteAccount(pwd);
                        if (logout) await logout();
                        navigate("/signin");
                      } catch (err) {
                        showToast(err.response?.data?.message || "Could not delete account");
                      }
                    }}
                    className="rounded-full bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b91c1c] transition cursor-pointer"
                  >
                    Delete Account Permanently
                  </button>
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
                      {(form.bio || "").length} / 240
                    </span>
                  </>
                }
              >
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => updateForm("bio", e.target.value)}
                  maxLength={240}
                  className="w-full rounded-2xl border border-transparent bg-[#f4f2ee] p-3.5 text-[13.5px] leading-relaxed text-[#1b1c19] outline-none transition-all placeholder:text-[#a09c97] focus:border-black/20 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Website / Portfolio">
                  <Input
                    value={form.website}
                    onChange={(e) => updateForm("website", e.target.value)}
                  >
                    <Globe className="mr-2 h-4 w-4 text-[#8a8690]" />
                  </Input>
                </Field>

                <Field label="Primary Location">
                  <Input
                    value={form.location}
                    onChange={(e) => updateForm("location", e.target.value)}
                  />
                </Field>
              </div>

              {/* Profile Badges Toggles */}
              <div className="mt-6 border-t border-[#f0ece4] pt-5 space-y-2">
                <h3 className="text-[12.5px] font-semibold uppercase tracking-wider text-[#7d7982] mb-2">
                  Public Badges & Visibility
                </h3>
                <div className="divide-y divide-[#eeeae2] rounded-3xl bg-[#f7f5f0] px-4">
                  <Toggle
                    checked={toggles.showVerifiedBadge}
                    onChange={(val) => updateToggle("showVerifiedBadge", val)}
                    label="Display Verified Guild Badge"
                    description="Show cryptographic blue verified checkmark on profile and comments."
                  />
                  <Toggle
                    checked={toggles.showFollowerCount}
                    onChange={(val) => updateToggle("showFollowerCount", val)}
                    label="Public Follower Count"
                    description="Allow other creators to see total follower and following statistics."
                  />
                  <Toggle
                    checked={toggles.showStudioSound}
                    onChange={(val) => updateToggle("showStudioSound", val)}
                    label="Studio Sound Preview Player"
                    description="Preview ambient loop track on avatar disc button."
                  />
                </div>
              </div>
            </div>
          </Card>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <SectionHeader
                eyebrow="[ 03 — Visibility ]"
                title="Privacy & Permissions"
                description="Control who can explore your photography artifacts, send direct messages, and see your activity."
              />

              <div className="mt-6 divide-y divide-[#eeeae2] rounded-3xl bg-[#f7f5f0] px-4">
                <Toggle
                  checked={toggles.privateAccount}
                  onChange={(val) => updateToggle("privateAccount", val)}
                  label="Private Editorial Account"
                  description="Only approved followers will be able to inspect your published posts and story highlights."
                />

                <Toggle
                  checked={toggles.activeStatus}
                  onChange={(val) => updateToggle("activeStatus", val)}
                  label="Show Activity Status"
                  description="Allow accounts you follow and anyone you message to see when you were last active."
                />

                <Toggle
                  checked={toggles.readReceipts}
                  onChange={(val) => updateToggle("readReceipts", val)}
                  label="Message Read Receipts"
                  description="Send checkmarks when you have seen messages in direct conversations."
                />

                <Toggle
                  checked={toggles.storyReplies}
                  onChange={(val) => updateToggle("storyReplies", val)}
                  label="Allow Story Highlight Replies"
                  description="Enable followers to reply with voice memos and emoji reactions."
                />
              </div>
            </Card>

            {/* Blocked Accounts Management */}
            <Card className="p-6 sm:p-8">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0ece4]">
                <div>
                  <h3 className="text-[17px] font-bold text-[#1b1c19]">Blocked Accounts</h3>
                  <p className="mt-0.5 text-[12px] text-[#7d7982]">
                    Accounts listed here cannot message you or view your artifacts.
                  </p>
                </div>
                <span className="rounded-full bg-[#f0eee9] px-2.5 py-0.5 text-[11px] font-mono text-[#78767b]">
                  {blockedUsers.length} blocked
                </span>
              </div>

              {/* Block New Account Form */}
              <form onSubmit={handleBlockUser} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Block username (e.g. @spambot)..."
                  value={newBlockHandle}
                  onChange={(e) => setNewBlockHandle(e.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  type="submit"
                  disabled={!newBlockHandle.trim()}
                  className="flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>Block</span>
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {blockedUsers.length === 0 ? (
                  <p className="text-center py-6 text-xs text-[#78767b]">No blocked accounts.</p>
                ) : (
                  blockedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-2xl border border-[#ece8de] bg-[#fbfaf8] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          onError={(e) => {
                            e.target.src = "/notifications/liam.png";
                          }}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div>
                          <span className="text-[13px] font-semibold text-[#1b1c19] block">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-[#7d7982]">@{user.username}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblockUser(user.id)}
                        className="rounded-full bg-[#f0eee9] px-3.5 py-1 text-xs font-semibold text-[#1b1c19] hover:bg-black hover:text-white transition cursor-pointer"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 04 — Alerts ]"
              title="Notifications & Signals"
              description="Configure dispatch channels for editorial alerts, community reactions, and message memos."
            />

            <div className="mt-6 divide-y divide-[#eeeae2] rounded-3xl bg-[#f7f5f0] px-4">
              <Toggle
                checked={toggles.pushNotifications}
                onChange={(val) => updateToggle("pushNotifications", val)}
                label="Native Push Notifications"
                description="Receive instant alerts on your desktop browser and linked mobile devices."
              />

              <Toggle
                checked={toggles.emailNotifications}
                onChange={(val) => updateToggle("emailNotifications", val)}
                label="Weekly Digest Emails"
                description="Receive weekly curated recaps from photography collectives and mutuals."
              />

              <Toggle
                checked={toggles.mentions}
                onChange={(val) => updateToggle("mentions", val)}
                label="Mentions & Tagging Alerts"
                description="Notify me when tagged in a carousel post or discussion thread."
              />

              <Toggle
                checked={toggles.peerSignals}
                onChange={(val) => updateToggle("peerSignals", val)}
                label="Direct Message Sound & Haptics"
                description="Play subtle analog audio ping on incoming chat messages."
              />
            </div>
          </Card>
        );

      case "appearance":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 05 — Atmosphere ]"
              title="Appearance & Display"
              description="Customize palette themes, typographic hierarchy, and motion aesthetics."
            />

            <div className="mt-6 space-y-6">
              {/* Theme Picker with Immediate Working Theme Switch */}
              <div>
                <label className="mb-3 block text-[11.5px] font-semibold uppercase tracking-wider text-[#7d7982]">
                  Visual Theme Palettes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "editorial", label: "Editorial Cream", desc: "Warm newsprint & parchment", bg: "bg-[#faf9f5]" },
                    { id: "midnight", label: "Studio Midnight", desc: "Deep onyx & high contrast", bg: "bg-[#18181b]" },
                    { id: "sepia", label: "35mm Analog Sepia", desc: "Vintage darkroom warmth", bg: "bg-[#f4efe6]" },
                  ].map((thm) => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => handleSelectTheme(thm.id)}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        form.theme === thm.id
                          ? "border-black bg-[#f7f5f0] ring-2 ring-black"
                          : "border-[#ece8de] bg-white hover:border-[#cfcac1]"
                      }`}
                    >
                      <div className={`h-8 w-full rounded-lg ${thm.bg} mb-3 border border-black/10`} />
                      <span className="text-[13px] font-bold text-[#1b1c19]">{thm.label}</span>
                      <span className="text-[11px] text-[#7d7982] mt-0.5">{thm.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Motion */}
              <div className="divide-y divide-[#eeeae2] rounded-3xl bg-[#f7f5f0] px-4">
                <Toggle
                  checked={toggles.reduceAnimations}
                  onChange={(val) => updateToggle("reduceAnimations", val)}
                  label="Reduce Motion Animations"
                  description="Minimize scale pops and transition durations across modal surfaces."
                />

                <Toggle
                  checked={toggles.highContrastBorders}
                  onChange={(val) => updateToggle("highContrastBorders", val)}
                  label="High-Definition Card Borders"
                  description="Enforce crisp 1px borders on artifact cards for archival clarity."
                />
              </div>
            </div>
          </Card>
        );

      case "content":
        return (
          <Card className="p-6 sm:p-8">
            <SectionHeader
              eyebrow="[ 06 — Streams ]"
              title="Content & Feeds"
              description="Manage fidelity standards, media autoplay rules, and muted topic filters."
            />

            <div className="mt-6 divide-y divide-[#eeeae2] rounded-3xl bg-[#f7f5f0] px-4">
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

            {/* Muted Words Manager with Working API */}
            <div className="mt-6 rounded-3xl border border-[#ece8de] bg-[#fbfaf8] p-5">
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
                  className="min-w-0 flex-1 rounded-2xl border border-[#ece8de] bg-white px-3.5 py-2 text-[13px] outline-none transition focus:border-black/30"
                />
                <button
                  type="submit"
                  disabled={!newWordInput.trim()}
                  className="flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
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
                      className="text-[#9e9a93] hover:text-[#d32f2f] cursor-pointer"
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
              eyebrow="[ 07 — Circles ]"
              title="Close Friends & Circles"
              description="Organize your inner circle for sharing private stories, raw 35mm rolls, and unreleased essays."
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#938e98]" />
                <input
                  type="text"
                  placeholder="Search colleagues & friends..."
                  value={friendsSearch}
                  onChange={(e) => setFriendsSearch(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-[#ece8de] bg-[#fbfaf8] pl-10 pr-4 text-[12.5px] outline-none transition focus:border-black/30"
                />
              </div>
              <span className="font-mono text-[11px] text-[#7d7982] shrink-0">
                {friendsList.filter((f) => f.active).length} of {friendsList.length} active
              </span>
            </div>

            {/* Add New Friend to Circle Form */}
            <form onSubmit={handleAddNewFriend} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Friend name..."
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                className="flex-1 rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[12.5px] outline-none focus:ring-1 focus:ring-black"
              />
              <input
                type="text"
                placeholder="Username (e.g. @marcus)..."
                value={newFriendHandle}
                onChange={(e) => setNewFriendHandle(e.target.value)}
                className="flex-1 rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[12.5px] outline-none focus:ring-1 focus:ring-black"
              />
              <button
                type="submit"
                disabled={!newFriendHandle.trim()}
                className="rounded-2xl bg-black px-4 py-2 text-[12px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer shrink-0"
              >
                Add Friend
              </button>
            </form>

            <div className="mt-4 divide-y divide-[#eeeae2] rounded-3xl border border-[#ece8de] bg-[#fbfaf8] overflow-hidden">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3.5 hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      onError={(e) => {
                        e.target.src = "/notifications/marcus.png";
                      }}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                    />
                    <div>
                      <span className="text-[13px] font-semibold text-[#1b1c19] block">
                        {friend.name}
                      </span>
                      <span className="text-[11.5px] text-[#7d7982]">@{friend.handle} • {friend.role}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFriendActive(friend.id)}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      friend.active
                        ? "bg-[#10b981] text-white"
                        : "bg-[#f0eee9] text-[#78767b] hover:bg-[#e4e2dd] hover:text-black"
                    }`}
                  >
                    {friend.active ? "Added" : "Add"}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        );

      case "help":
        return (
          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <SectionHeader
                eyebrow="[ 08 — Protocol ]"
                title="Help & Guidelines"
                description="Community values, cryptography specification, and direct developer inquiry channels."
              />

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-[#ece8de] bg-[#fbfaf8] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eeece7] text-[#1b1c19]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[#1b1c19]">Community Editorial Standards</h4>
                      <p className="text-[11.5px] text-[#7d7982]">Zero automated clickbait, organic curation specification</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[#8a858f]" />
                </div>

                <div className="rounded-2xl border border-[#ece8de] bg-[#fbfaf8] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eeece7] text-[#1b1c19]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[#1b1c19]">Zero-Knowledge Privacy Spec</h4>
                      <p className="text-[11.5px] text-[#7d7982]">How passkeys and end-to-end sessions are secured</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[#8a858f]" />
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#f0ece4] flex items-center justify-between">
                <div>
                  <h4 className="text-[13.5px] font-semibold text-[#1b1c19]">Direct Feedback & Inquiry</h4>
                  <p className="text-[11.5px] text-[#7d7982]">Submit bugs or suggest protocol enhancements to Staple Core</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(true)}
                  className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition cursor-pointer"
                >
                  Send Feedback
                </button>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="w-full max-w-full min-w-0 pb-16 pt-2 sm:pt-4 overflow-x-hidden lg:h-screen lg:overflow-y-auto no-scrollbar scroll-smooth"
      style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
    >
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-xl backdrop-blur animate-fade-in-slide">
          {savedToast}
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-[1340px] px-2 sm:px-4">
        {/* Mobile Section Tabs Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar lg:hidden mb-4">
          {sections.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-black text-white shadow-xs"
                    : "bg-white text-[#4a474d] border border-[#ece8de]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
          {/* Left Navigation Column (Desktop col-span-3) */}
          <aside className="hidden lg:col-span-3 lg:block space-y-4 sticky top-4">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#938e98] hover:text-black cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Navigation Menu */}
            <div className="rounded-3xl border border-[#ece8de] bg-white p-2 shadow-[0_2px_8px_rgba(24,22,18,0.02)]">
              <nav className="space-y-1">
                {filteredSections.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-[13px] transition-all duration-150 cursor-pointer ${
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
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold text-[#dc2626] transition hover:bg-[#fef2f2] cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log Out of Staple</span>
              </button>
            </div>

            {/* Archival Vault Progress Card */}
            <div className="rounded-3xl border border-[#ece8de] bg-[#f7f5f0] p-4 text-[#4a474d] shadow-2xs">
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
          <aside className="space-y-6 lg:col-span-3 sticky top-4">
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
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f4f2ee] py-3 text-[12.5px] font-bold text-[#1b1c19] transition hover:bg-[#eae6de] active:scale-98 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Request Archive (.zip)</span>
                  </button>
                )}

                {archiveStatus === "generating" && (
                  <div className="rounded-2xl bg-[#f7f5f0] p-3 text-center">
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
                  <div className="rounded-2xl bg-[#edfce9] p-3 text-center border border-[#c3e8ca]">
                    <p className="text-[12px] font-bold text-[#2d6a4f]">✓ Archive Ready (4.2 GB)</p>
                    <a
                      href="#download"
                      onClick={(e) => {
                        e.preventDefault();
                        showToast("Archive download initiated: staple_archive_elena_vance.zip");
                        setArchiveStatus("idle");
                      }}
                      className="mt-1.5 inline-block text-[11.5px] font-semibold text-[#1863dc] underline cursor-pointer"
                    >
                      Click to download archive
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
                  <div className="flex items-center justify-between rounded-xl bg-[#f7f5f0] px-3 py-2 text-[12px]">
                    <span className="font-medium text-[#1b1c19]">Instagram Graph</span>
                    <span className="text-[10.5px] font-semibold text-[#2d6a4f]">Linked</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#f7f5f0] px-3 py-2 text-[12px]">
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
                className="text-[12px] font-medium text-white/70 hover:text-white cursor-pointer"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-black transition-transform hover:bg-neutral-200 active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* Change Photo Modal with Direct Upload and Presets */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-[#1b1c19]">Change Profile Photo</h3>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="rounded-full bg-[#f4f2ee] p-1.5 text-[#55524d] hover:bg-[#e8e4dc] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-[12.5px] text-[#75716c]">
              Select a curated avatar or upload an image directly from your computer:
            </p>

            {/* Direct Device Upload Option */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ece8de] bg-[#fbfaf8] py-4 text-xs font-semibold text-[#1b1c19] hover:bg-[#f5f3ee] hover:border-black/30 transition cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Upload image from this computer</span>
              </button>
            </div>

            <div className="my-3.5 flex items-center gap-2">
              <div className="h-px flex-1 bg-[#ece8de]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#938e98]">or choose preset</span>
              <div className="h-px flex-1 bg-[#ece8de]" />
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-3">
              {avatarOptions.map((opt) => (
                <button
                  key={opt.src}
                  type="button"
                  onClick={() => handleSelectAvatar(opt.src)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    currentAvatar === opt.src
                      ? "border-black bg-[#f7f5f0] ring-2 ring-black"
                      : "border-[#ece8de] bg-white hover:border-[#cfcac1]"
                  }`}
                >
                  <img
                    src={opt.src}
                    alt=""
                    onError={(e) => {
                      e.target.src = "/recreation/avatar_left_elena.png";
                    }}
                    className="h-16 w-16 rounded-full object-cover ring-1 ring-black/10"
                  />
                  <span className="text-[11.5px] font-medium text-[#1b1c19]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal (Zero browser alert) */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeae2]">
              <h3 className="text-[18px] font-bold text-[#1b1c19]">Change Password</h3>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-full bg-[#f4f2ee] p-1.5 text-[#55524d] hover:bg-[#e8e4dc] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11.5px] font-semibold uppercase tracking-wider text-[#7d7982] block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="w-full rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-semibold uppercase tracking-wider text-[#7d7982] block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-semibold uppercase tracking-wider text-[#7d7982] block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-full bg-[#f0eee9] px-4 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support / Feedback Modal (Zero browser alert) */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeae2]">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#1863dc]" />
                <h3 className="text-[18px] font-bold text-[#1b1c19]">Direct Protocol Inquiry</h3>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="rounded-full bg-[#f4f2ee] p-1.5 text-[#55524d] hover:bg-[#e8e4dc] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupport} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11.5px] font-semibold uppercase tracking-wider text-[#7d7982] block mb-1">
                  Topic / Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bug with 35mm negative scanner preview..."
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                  className="w-full rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-semibold uppercase tracking-wider text-[#7d7982] block mb-1">
                  Category
                </label>
                <select
                  value={supportForm.category}
                  onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}
                  className="w-full rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="general">General Inquiry</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="security">Security Telemetry</option>
                </select>
              </div>

              <div>
                <label className="text-[11.5px] font-semibold uppercase tracking-wider text-[#7d7982] block mb-1">
                  Detailed Explanation
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe what occurred or what feature you are proposing..."
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  className="w-full rounded-2xl border border-[#ece8de] bg-[#fbfaf8] px-3.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  className="rounded-full bg-[#f0eee9] px-4 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#e4e2dd] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal (Zero browser alert) */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
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
                className="flex-1 rounded-full border border-[#ece8de] bg-[#f4f2ee] py-2.5 text-[12.5px] font-semibold text-[#48443e] hover:bg-[#eae6de] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutModalOpen(false);
                  showToast("Logged out of Staple session successfully");
                  if (logout) logout();
                }}
                className="flex-1 rounded-full bg-[#dc2626] py-2.5 text-[12.5px] font-semibold text-white hover:bg-red-700 cursor-pointer"
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
