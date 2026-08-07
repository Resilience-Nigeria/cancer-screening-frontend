import axios from "axios";
import { clearAuth, getToken, setToken } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important: Allow cookies for refresh tokens
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor - handle auth errors and refresh
// Response interceptor - handle auth errors and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only refresh tokens for authenticated requests,
    // NOT for login requests.
    const shouldRefresh =
      error?.response?.status === 401 &&
      getToken() &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login");

    if (shouldRefresh) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (data.status && data.access_token) {
          setToken(data.access_token);

          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        clearAuth();

        if (typeof window !== "undefined") {
          window.location.href = "/";
        }

        return Promise.reject(refreshError);
      }
    }

    // If it's another authenticated request that returned 401,
    // log the user out.
    if (
      error?.response?.status === 401 &&
      getToken() &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      clearAuth();

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }

    // Let the login page handle login errors normally.
    return Promise.reject(error);
  }
);

export default api;