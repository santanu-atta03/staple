import { createContext, useContext, useEffect, useState } from "react";
import api, { invalidateUserRequests, setAccessToken } from "../api/axios";

const AuthContext = createContext(null);
let sessionRestorePromise = null;

const clearBrowserUserData = async () => {
  invalidateUserRequests();
  setAccessToken(null);

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    console.error("Could not clear browser storage", error);
  }

  if ("caches" in window) {
    try {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    } catch (error) {
      console.error("Could not clear cached application data", error);
    }
  }

  if (window.indexedDB?.databases) {
    try {
      const databases = await window.indexedDB.databases();
      await Promise.all(
        databases
          .filter((database) => database.name)
          .map(
            (database) =>
              new Promise((resolve, reject) => {
                const request = window.indexedDB.deleteDatabase(database.name);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
                request.onblocked = () => reject(new Error(`Could not clear IndexedDB database ${database.name}`));
              })
          )
      );
    } catch (error) {
      console.error("Could not clear IndexedDB", error);
    }
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("staple_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = () => {
      if (sessionRestorePromise) return sessionRestorePromise;

      sessionRestorePromise = (async () => {
        // 1. If we already have stored access token, try validating with /auth/me
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("staple_access_token") : null;
        if (storedToken) {
          setAccessToken(storedToken);
          try {
            const { data } = await api.get("/auth/me");
            if (data?.user) {
              localStorage.setItem("staple_user", JSON.stringify(data.user));
              return data.user;
            }
          } catch (meError) {
            // If server error or offline, keep cached user so page refresh doesn't log them out
            if (meError.response && meError.response.status !== 401) {
              const cached = localStorage.getItem("staple_user");
              if (cached) return JSON.parse(cached);
            }
          }
        }

        // 2. Try refresh endpoint
        try {
          const response = await api.post("/auth/refresh");
          if (response.status === 204) {
            const cached = localStorage.getItem("staple_user");
            return cached ? JSON.parse(cached) : null;
          }

          const token = response.data?.accessToken || response.data?.data?.accessToken;
          if (!token) throw new Error("Session refresh did not return an access token");
          setAccessToken(token);

          const { data } = await api.get("/auth/me");
          if (!data?.user) throw new Error("Session did not return an account");
          localStorage.setItem("staple_user", JSON.stringify(data.user));
          return data.user;
        } catch (refreshErr) {
          if (refreshErr.response?.status === 401 || refreshErr.response?.status === 403) {
            await clearBrowserUserData();
            return null;
          }
          // Server offline or proxy error: keep cached user so refresh doesn't boot user
          const cached = localStorage.getItem("staple_user");
          if (cached) return JSON.parse(cached);
          return null;
        }
      })().finally(() => {
        sessionRestorePromise = null;
      });

      return sessionRestorePromise;
    };

    restoreSession()
      .then((restoredUser) => {
        if (active) setUser(restoredUser);
      })
      .catch((error) => {
        console.error("Could not restore the signed-in session:", error);
        if (active) {
          const cached = localStorage.getItem("staple_user");
          if (!cached) setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const commitAuthentication = async (result, message) => {
    const token = result.accessToken || result.data?.accessToken;
    const authenticatedUser = result.user || result.data?.user;
    if (!token || !authenticatedUser?.id) {
      throw new Error(message);
    }

    setAccessToken(token);
    try {
      localStorage.setItem("staple_user", JSON.stringify(authenticatedUser));
      localStorage.setItem("staple_access_token", token);
    } catch (e) {
      console.warn("Could not persist auth to localStorage", e);
    }
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    return commitAuthentication(data, "Invalid response from server");
  };

  const googleLogin = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    return commitAuthentication(data, "Google authentication failed");
  };

  const appleLogin = async (identityToken, fullName = "") => {
    const { data } = await api.post("/auth/apple", { identityToken, fullName });
    return commitAuthentication(data, "Apple authentication failed");
  };

  const initiateRegistration = async (payload) => {
    const { data } = await api.post("/auth/register-initiate", payload);
    return data;
  };

  const resendRegistrationCode = async (email) => {
    const { data } = await api.post("/auth/resend-otp", { email });
    return data;
  };

  const verifyRegistration = async (email, otp) => {
    const { data } = await api.post("/auth/verify-otp", { email, otp });
    return commitAuthentication(data, "Account verification failed");
  };

  const checkUsername = async (username) => {
    const { data } = await api.get(
      `/auth/check-username?username=${encodeURIComponent(username)}`
    );
    return data.available;
  };

  const getAuthProviders = async () => {
    const { data } = await api.get("/auth/providers");
    return data.providers;
  };

  const forgotPassword = async (identity) => {
    const { data } = await api.post("/auth/forgot-password", { identity });
    return data;
  };

  const resendPasswordResetCode = async (identity) => {
    const { data } = await api.post("/auth/resend-reset-otp", { identity });
    return data;
  };

  const resetPassword = async (identity, otp, newPassword) => {
    const { data } = await api.post("/auth/reset-password", {
      identity,
      otp,
      newPassword,
    });
    return data;
  };

  const logout = async () => {
    let logoutError;
    try {
      await api.post("/auth/logout");
    } catch (error) {
      logoutError = error;
    } finally {
      await clearBrowserUserData();
      setUser(null);
    }
    if (logoutError) throw logoutError;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        googleLogin,
        appleLogin,
        initiateRegistration,
        resendRegistrationCode,
        verifyRegistration,
        checkUsername,
        getAuthProviders,
        forgotPassword,
        resendPasswordResetCode,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
