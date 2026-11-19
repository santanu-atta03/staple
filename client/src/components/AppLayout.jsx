import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Bell, User, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import BrandMark from "./BrandMark";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", label: "Feed", icon: Home },
    {
      to: "/notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadCount,
    },
    {
      to: `/u/${user?.username}`,
      label: "Profile",
      icon: User,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex max-w-5xl">
        {/* Desktop Left Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-neutral-800/70 px-5 py-6 md:flex">
          <div className="space-y-8">
            <NavLink to="/" className="block px-2">
              <BrandMark size={30} />
            </NavLink>

            <nav className="space-y-1.5">
              {navItems.map(({ to, label, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-400 hover:bg-neutral-900/50 hover:text-neutral-200"
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {label}
                  </span>
                  {badge > 0 && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-neutral-950">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="space-y-3 border-t border-neutral-800/70 pt-4">
            <div className="flex items-center gap-3 px-2">
              <img
                src={
                  user?.avatar ||
                  `https://api.dicebear.com/9.x/initials/svg?seed=${user?.username}`
                }
                alt={user?.username}
                className="h-9 w-9 rounded-full object-cover bg-neutral-800"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user?.name || user?.username}
                </p>
                <p className="truncate text-xs text-neutral-400">
                  @{user?.username}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-neutral-400 transition hover:bg-rose-500/10 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Center Feed Column */}
        <main className="min-h-screen flex-1 border-r border-neutral-800/70 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-neutral-800 bg-neutral-950/90 py-2.5 backdrop-blur md:hidden">
        {navItems.map(({ to, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `relative p-2 transition ${
                isActive ? "text-white" : "text-neutral-500"
              }`
            }
          >
            <Icon className="h-6 w-6" />
            {badge > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-white" />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}