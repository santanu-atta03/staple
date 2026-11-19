import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user || data);
      } catch {
        localStorage.removeItem("accessToken");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    const token = data.accessToken || data.data?.accessToken;
    const loggedInUser = data.user || data.data?.user;

    if (token) {
      localStorage.setItem("accessToken", token);
    }
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload) => {
    await api.post("/auth/register", payload);
    // registerUser returns { id, username, email } without tokens, so auto-login immediately
    return login({ email: payload.email, password: payload.password });
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
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

export const useAuth = () => useContext(AuthContext);