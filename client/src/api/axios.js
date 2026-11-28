import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

let accessToken =
  typeof window !== "undefined"
    ? localStorage.getItem("staple_access_token") || null
    : null;
let authGeneration = 0;
const pendingRequests = new Set();
let isRefreshing = false;
let failedQueue = [];

export const setAccessToken = (token) => {
  accessToken = token || null;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("staple_access_token", token);
    } else {
      localStorage.removeItem("staple_access_token");
    }
  }
};

export const invalidateUserRequests = () => {
  authGeneration += 1;
  for (const controller of pendingRequests) controller.abort();
  pendingRequests.clear();
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  if (!config.signal || config.signal.aborted) {
    const controller = new AbortController();
    config.signal = controller.signal;
    config.__requestController = controller;
    pendingRequests.add(controller);
  }
  config.__authGeneration = authGeneration;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  else delete config.headers.Authorization;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const controller = response.config.__requestController;
    if (controller) pendingRequests.delete(controller);
    if (response.config.__authGeneration !== authGeneration) {
      return Promise.reject(new axios.CanceledError("The active account changed"));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const controller = originalRequest?.__requestController;
    if (controller) pendingRequests.delete(controller);
    if (!originalRequest || axios.isCancel(error)) return Promise.reject(error);
    if (originalRequest.__authGeneration !== authGeneration) {
      return Promise.reject(new axios.CanceledError("The active account changed"));
    }

    const isAuthRequest = /\/auth\/(login|register-initiate|verify-otp|resend-otp|google|apple|refresh|logout)/.test(
      originalRequest.url || ""
    );
    if (
      error.response?.status !== 401 ||
      !accessToken ||
      originalRequest._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.signal = undefined;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;
    const requestGeneration = authGeneration;

    try {
      const { data } = await axios.post(
        "/api/v1/auth/refresh",
        {},
        { withCredentials: true }
      );
      if (requestGeneration !== authGeneration) {
        throw new axios.CanceledError("The active account changed");
      }
      const newAccessToken = data.accessToken || data.data?.accessToken;
      if (!newAccessToken) throw new Error("No access token returned from refresh");
      accessToken = newAccessToken;
      if (typeof window !== "undefined") {
        localStorage.setItem("staple_access_token", newAccessToken);
      }
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      originalRequest.signal = undefined;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      const status = refreshError?.response?.status;
      const noTokenReturned = refreshError?.message === "No access token returned from refresh";
      if (status === 401 || status === 403 || noTokenReturned) {
        if (requestGeneration === authGeneration) {
          accessToken = null;
          if (typeof window !== "undefined") {
            localStorage.removeItem("staple_access_token");
            localStorage.removeItem("staple_user");
            window.dispatchEvent(new Event("staple:session_expired"));
          }
        }
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
