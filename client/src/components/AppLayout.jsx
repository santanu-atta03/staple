import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  Bell,
  MessageSquare,
  Bookmark,
  User,
  Settings,
  Plus,
  MoreHorizontal,
  Check,
  Search,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import BrandMark from "./BrandMark";
import GlobalPostModal from "./GlobalPostModal";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const userDisplayName = user?.name || user?.username || "Account";
  const userHandle = user?.username || "me";
  const fallbackAvatar = "/default-avatar.svg";
  const userAvatar = user?.avatar || fallbackAvatar;

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    if (logout) {
      await logout();
    }
    navigate("/signin");
  };

  const isFixedLayout =
    location.pathname === "/" ||
    location.pathname === "/explore" ||
    location.pathname === "/notifications" ||
    location.pathname === "/messages" ||
    location.pathname === "/settings" ||
    location.pathname.startsWith("/u/");

  // Ensure window position is cleanly reset to top when switching routes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleOpenCreatePost = () => {
    if (location.pathname === "/") {
      const pill = document.querySelector("[data-post-composer-pill]");
      if (pill) {
        pill.click();
        pill.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const composer = document.querySelector("[data-post-composer]");
      if (composer) {
        composer.focus();
        composer.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    setShowCreateModal(true);
  };

  const navItems = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { to: `/u/${userHandle}`, label: "Profile", icon: User },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div
      className={`min-h-screen w-full bg-[#faf9f5] text-[#1c1c1e] antialiased ${
        isFixedLayout ? "lg:h-screen lg:overflow-hidden" : "overflow-x-hidden"
      }`}
    >
      {/* Mobile Top Header matching mobile reference exactly */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[#ece8de] bg-[#fbf9f4]/95 px-3 sm:px-4 backdrop-blur-md lg:hidden">
        <NavLink to="/" className="flex items-center shrink-0">
          <BrandMark version="v0.9.4" />
        </NavLink>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NavLink
            to="/explore"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-800 hover:bg-[#edeae3] transition"
          >
            <Search className="h-5 w-5 stroke-[2]" />
          </NavLink>
          <NavLink
            to="/notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-neutral-800 hover:bg-[#edeae3] transition"
          >
            <Bell className="h-5 w-5 stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#da5c40] px-1 text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to={`/u/${userHandle}`}
            className="flex items-center shrink-0"
          >
            <img
              src={userAvatar}
              alt={userDisplayName}
              onError={(e) => {
                e.target.src = fallbackAvatar;
              }}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-black/5"
            />
          </NavLink>
        </div>
      </header>

      {/* Main Page Layout Container: Broad and expansive across the page */}
      <div
        className={`mx-auto flex w-full max-w-[1520px] justify-between px-3 sm:px-6 lg:px-8 xl:px-10 ${
          isFixedLayout ? "lg:h-screen lg:overflow-hidden" : "overflow-x-clip"
        }`}
      >
        {/* Left Sticky Navigation Column (Desktop) */}
        <aside
          className={`sticky top-0 hidden ${
            isFixedLayout
              ? "h-screen py-3 overflow-hidden"
              : "h-[calc(100vh-2rem)] top-4"
          } w-[240px] shrink-0 flex-col justify-between pb-2 pr-5 lg:flex select-none`}
        >
          <div className="space-y-4">
            {/* Logo */}
            <div className="px-2 pt-1 pb-1">
              <NavLink to="/" className="inline-block transition-transform active:scale-95">
                <BrandMark />
              </NavLink>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={`group flex items-center justify-between rounded-2xl px-4 py-2.5 text-[14.5px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[#edeae3] font-semibold text-black shadow-2xs"
                        : "text-[#3f3f46] hover:bg-[#f2efe8] hover:text-black"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon
                        className={`h-5 w-5 transition-transform group-hover:scale-105 ${
                          isActive
                            ? "stroke-[2.2] text-black"
                            : "stroke-[1.8] text-[#52525b]"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.to === "/notifications" && unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#da5c40] px-1.5 text-[11px] font-bold text-white shadow-xs">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Create Post Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenCreatePost}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-black py-3 px-5 text-[14px] font-semibold text-white shadow-xs transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Create Post</span>
              </button>
            </div>
          </div>

          {/* User Account Row at bottom of Sidebar */}
          <div className="pt-4 relative" ref={menuRef}>
            {/* Account Popover Menu */}
            {showUserMenu && (
              <div className="absolute bottom-16 left-0 right-0 z-50 rounded-2xl border border-[#ece8de] bg-white p-2 shadow-xl animate-scale-in">
                <div className="px-3 py-2 border-b border-[#ece8de]/60">
                  <p className="text-[13px] font-semibold text-[#18181b] truncate">
                    {userDisplayName}
                  </p>
                  <p className="text-[11.5px] text-[#71717a] truncate">
                    @{userHandle}
                  </p>
                </div>
                <div className="py-1">
                  <NavLink
                    to={`/u/${userHandle}`}
                    onClick={() => setShowUserMenu(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#18181b] hover:bg-[#f4f2ea] transition"
                  >
                    <User className="h-4 w-4 stroke-[2] text-[#71717a]" />
                    <span>View Profile</span>
                  </NavLink>
                  <NavLink
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#18181b] hover:bg-[#f4f2ea] transition"
                  >
                    <Settings className="h-4 w-4 stroke-[2] text-[#71717a]" />
                    <span>Settings</span>
                  </NavLink>
                </div>
                <div className="border-t border-[#ece8de]/60 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#ef4444] hover:bg-[#fef2f2] transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 stroke-[2] text-[#ef4444]" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}

            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-between rounded-2xl p-2 transition hover:bg-[#edeae3] cursor-pointer"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <img
                    src={userAvatar}
                    alt={userDisplayName}
                    onError={(e) => {
                      e.target.src = fallbackAvatar;
                    }}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-[13px] font-semibold text-[#18181b]">
                      {userDisplayName}
                    </span>
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white">
                      <Check className="h-2 w-2 stroke-[3]" />
                    </span>
                  </div>
                  <span className="block truncate text-[11.5px] text-[#71717a]">
                    @{userHandle}
                  </span>
                </div>
              </div>

              <div
                aria-label="User menu"
                className="rounded-lg p-1 text-[#71717a] hover:text-black"
              >
                <MoreHorizontal className="h-4 w-4" />
              </div>
            </div>
          </div>
        </aside>

        {/* Center & Right Column Shell */}
        <main
          className={`min-w-0 max-w-full w-full flex-1 ${
            isFixedLayout
              ? "lg:h-screen lg:overflow-hidden pb-20 lg:pb-0"
              : "pb-20 lg:pb-10"
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation matching mobile reference */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-[#ece8de] bg-[#fbf9f4]/95 py-2 backdrop-blur-md lg:hidden">
        {/* Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `p-2 transition ${isActive ? "text-black" : "text-neutral-500 hover:text-black"}`
          }
        >
          <Home className="h-6 w-6 stroke-[2]" />
        </NavLink>

        {/* Explore */}
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            `p-2 transition ${isActive ? "text-black" : "text-neutral-500 hover:text-black"}`
          }
        >
          <Compass className="h-6 w-6 stroke-[2]" />
        </NavLink>

        {/* Center Create (+) button */}
        <button
          type="button"
          onClick={handleOpenCreatePost}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-md active:scale-95 transition"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* Notifications */}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `relative p-2 transition ${isActive ? "text-black" : "text-neutral-500 hover:text-black"}`
          }
        >
          <Bell className="h-6 w-6 stroke-[2]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#da5c40] px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `p-2 transition ${isActive ? "text-black" : "text-neutral-500 hover:text-black"}`
          }
        >
          <MessageSquare className="h-6 w-6 stroke-[2]" />
        </NavLink>
      </nav>

      {/* Global Post Creation Modal */}
      <GlobalPostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={() => {
          navigate("/");
        }}
      />
    </div>
  );
}
