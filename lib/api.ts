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
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and we haven't tried to refresh yet
    if (error?.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (data.status && data.access_token) {
          // Save new token
          setToken(data.access_token);

          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to login
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      }
    }

    // For any other 401 or if refresh failed, logout
    if (error?.response?.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;