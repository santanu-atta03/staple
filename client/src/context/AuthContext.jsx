import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const DEFAULT_USER = {
  _id: "user_elena_vance",
  name: "Elena Vance",
  username: "elenavance",
  avatar: "/recreation/avatar_left_elena_hires.png",
  fallbackAvatar: "/recreation/avatar_left_elena.png",
  isVerified: true,
  bio: "Visual designer & analog photography lover. Exploring Kyoto.",
  followingCount: 342,
  followersCount: 1420,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (isMounted) setUser(data.user || data || DEFAULT_USER);
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        if (isMounted) setUser(DEFAULT_USER);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    const token = data.accessToken || data.data?.accessToken;
    const loggedInUser = data.user || data.data?.user;

    if (token) {
      localStorage.setItem("accessToken", token);
    }
    setUser(loggedInUser || DEFAULT_USER);
    return loggedInUser;
  };

  const register = async (payload) => {
    await api.post("/auth/register", payload);
    return login({ email: payload.email, password: payload.password });
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("accessToken");
      setUser(DEFAULT_USER);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
