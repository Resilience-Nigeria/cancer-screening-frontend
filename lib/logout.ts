// lib/logout.ts

import api from "./api";
import { clearAuth } from "./auth";

/**
 * Handle user logout
 * - Calls backend to invalidate JWT and delete refresh token
 * - Clears local auth data (token and user)
 * - Redirects to login page
 */
export async function logout(): Promise<void> {
  try {
    // Call backend logout endpoint
    // This invalidates the JWT token and deletes the refresh token from database
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Backend logout failed:", error);
    // Continue with client-side cleanup even if backend fails
  } finally {
    // Clear all auth data from localStorage
    // This removes: csr_token and csr_user
    clearAuth();

    // Redirect to login page
    // Using window.location ensures a full page reload
    // which clears any cached state
    window.location.href = "/";
  }
}