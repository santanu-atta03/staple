import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../api/axios";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setHasNewPosts(false);
      return;
    }

    const fetchUnread = () => {
      api
        .get("/notifications/unread-count")
        .then(({ data }) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});
    };

    // Fetch initial unread notification count + periodic fallback sync
    fetchUnread();
    const pollInterval = setInterval(fetchUnread, 10000);

    const token =
      localStorage.getItem("staple_access_token") || localStorage.getItem("accessToken");
    const socketInstance = io("/", {
      auth: { token: token || "guest" },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on("notification:new", ({ unreadCount: nextCount }) => {
      if (typeof nextCount === "number") {
        setUnreadCount(nextCount);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    });

    socketInstance.on("feed:new_post", () => {
      setHasNewPosts(true);
    });

    setSocket(socketInstance);

    return () => {
      clearInterval(pollInterval);
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        unreadCount,
        setUnreadCount,
        hasNewPosts,
        setHasNewPosts,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);