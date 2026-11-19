import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import {
  fetchNotifications,
  markAllNotificationsRead,
} from "./notification.api";

export default function NotificationsPage() {
  const { setUnreadCount } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchNotifications(1)
      .then((list) => {
        if (!active) return;
        setNotifications(list);
        markAllNotificationsRead()
          .then(() => setUnreadCount(0))
          .catch(() => {});
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [setUnreadCount]);

  const renderIcon = (type) => {
    if (type === "LIKE")
      return <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />;
    if (type === "COMMENT")
      return <MessageCircle className="h-4 w-4 text-sky-400" />;
    return <UserPlus className="h-4 w-4 text-emerald-400" />;
  };

  const renderMessage = (type) => {
    if (type === "LIKE") return "liked your post";
    if (type === "COMMENT") return "replied to your post";
    return "started following you";
  };

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-neutral-800/70 bg-neutral-950/85 px-4 py-3.5 backdrop-blur sm:px-6">
        <h1 className="text-base font-semibold text-white">Notifications</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-14">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-neutral-500">
          No notifications yet.
        </div>
      ) : (
        <div>
          {notifications.map((item) => {
            const actor = item.actorId || {};
            const targetLink =
              item.type === "FOLLOW"
                ? `/u/${actor.username}`
                : `/post/${item.entityId}`;

            return (
              <Link
                key={item._id}
                to={targetLink}
                className={`flex items-center gap-3.5 border-b border-neutral-800/60 px-4 py-3.5 transition hover:bg-neutral-900/40 sm:px-6 ${
                  !item.isRead ? "bg-neutral-900/20" : ""
                }`}
              >
                <div className="shrink-0">{renderIcon(item.type)}</div>

                <img
                  src={
                    actor.avatar ||
                    `https://api.dicebear.com/9.x/initials/svg?seed=${actor.username}`
                  }
                  alt={actor.username}
                  className="h-9 w-9 shrink-0 rounded-full object-cover bg-neutral-800"
                />

                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate text-neutral-200">
                    <span className="font-semibold text-white">
                      {actor.name || actor.username}
                    </span>{" "}
                    <span className="text-neutral-400">
                      {renderMessage(item.type)}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}