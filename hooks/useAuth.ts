// hooks/useAuth.ts
// Custom hook for authentication with optional revalidation

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, setUser as saveUser, isAuthenticated, clearAuth } from "@/lib/auth";
import api from "@/lib/api";
import type { User } from "@/types/auth";

interface UseAuthOptions {
  revalidate?: boolean; // Fetch fresh data from backend
  redirectIfNotAuth?: boolean; // Redirect to login if not authenticated
}

export function useAuth(options: UseAuthOptions = {}) {
  const { revalidate = false, redirectIfNotAuth = false } = options;
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(getUser());
  const [loading, setLoading] = useState(revalidate);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      if (redirectIfNotAuth) {
        router.push("/");
      }
      setLoading(false);
      return;
    }

    // If revalidate is true, fetch fresh data from backend
    if (revalidate) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [revalidate, redirectIfNotAuth]);

  async function fetchUserData() {
    try {
      setLoading(true);
      const { data } = await api.get("/auth/me");
      
      if (data.status && data.user) {
        // Update both state and localStorage
        setUser(data.user);
        saveUser(data.user);
        setError(null);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Failed to fetch user data:", err);
      setError(err.message || "Failed to load user data");
      
      // If token is invalid, clear auth and redirect
      if (err.response?.status === 401) {
        clearAuth();
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    await fetchUserData();
  }

  return {
    user,
    loading,
    error,
    isAuthenticated: isAuthenticated(),
    refresh,
  };
}

// Example usage:

// 1. Simple usage (uses localStorage, instant)
export function SimpleComponent() {
  const { user } = useAuth();
  return <div>Hello, {user?.firstName}!</div>;
}

// 2. With revalidation (fetches from backend on mount)
export function SettingsPage() {
  const { user, loading } = useAuth({ revalidate: true });
  
  if (loading) return <div>Loading...</div>;
  
  return <div>Settings for {user?.firstName}</div>;
}

// 3. Protected page (redirects if not authenticated)
export function AdminPage() {
  const { user, loading } = useAuth({ 
    revalidate: true, 
    redirectIfNotAuth: true 
  });
  
  if (loading) return <div>Loading...</div>;
  
  return <div>Admin Panel</div>;
}

// 4. Manual refresh
export function ProfilePage() {
  const { user, refresh, loading } = useAuth({ revalidate: true });
  
  async function handleSave() {
    // Save profile changes
    await api.put("/profile", data);
    
    // Refresh user data
    await refresh();
  }
  
  return (
    <div>
      <h1>{user?.firstName}</h1>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}