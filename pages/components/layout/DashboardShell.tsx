"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarContext, {
  SidebarProvider,
} from "../../../context/SidebarContext";
import Sidebar from "../Sidebar";
import Header from "../Header";
import Main from "./Main";
import { getToken, getUser, setUser, clearAuth } from "../../../lib/auth";
import api from "../../../lib/api";

interface DashboardShellInnerProps {
  children: React.ReactNode;
}

function DashboardShellInner({ children }: DashboardShellInnerProps) {
  const { isSidebarOpen } = useContext(SidebarContext);
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    validateAuth();
  }, []);

  async function validateAuth() {
    const token = getToken();

    // No token, redirect to login
    if (!token) {
      router.push("/");
      return;
    }

    // Has token but no user data in localStorage
    // This happens after browser refresh or cleared cache
    if (!getUser()) {
      try {
        // Fetch user data from backend
        const { data } = await api.get("/auth/me");
        
        if (data.status && data.user) {
          // Store user data for instant access
          setUser(data.user);
          setIsValidating(false);
        } else {
          // Invalid response, clear auth and redirect
          clearAuth();
          router.push("/");
        }
      } catch (error) {
        // Token is invalid or expired
        console.error("Auth validation failed:", error);
        clearAuth();
        router.push("/");
      }
    } else {
      // User data already exists in localStorage
      setIsValidating(false);
    }
  }

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${
        isSidebarOpen ? "overflow-hidden" : ""
      }`}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 w-full">
        <Header />
        <Main>{children}</Main>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </SidebarProvider>
  );
}