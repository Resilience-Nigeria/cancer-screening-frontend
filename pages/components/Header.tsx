"use client";

import Link from "next/link";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Building2,
  Sun,
  User,
} from "lucide-react";
import SidebarContext from "../../context/SidebarContext";
import {
  Avatar,
  Badge,
  Input,
  WindmillContext,
} from "@roketid/windmill-react-ui";

function Header() {
  const { mode, toggleMode } = useContext(WindmillContext);
  const { toggleSidebar } = useContext(SidebarContext);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [facilityName, setFacilityName] = useState("Loading...");

  const notificationsRef = useRef<HTMLLIElement | null>(null);
  const profileRef = useRef<HTMLLIElement | null>(null);

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem("csr_user");
      if (userData) {
        const user = JSON.parse(userData);
        
        // Set user full name
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        setUserName(fullName || user.email || "User");
        
        // Set facility name
        if (user.facility?.facilityName) {
          setFacilityName(user.facility.facilityName);
        } else if (user.facilityName) {
          setFacilityName(user.facilityName);
        } else {
          setFacilityName("No Facility Assigned");
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setIsNotificationsOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function toggleNotifications() {
    setIsNotificationsOpen((prev) => !prev);
    setIsProfileOpen(false);
  }

  function toggleProfile() {
    setIsProfileOpen((prev) => !prev);
    setIsNotificationsOpen(false);
  }

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("csr_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken");

      // Optional backend logout call
      if (token) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          console.error("Backend logout failed:", error);
        }
      }

      // Clear storage
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("csr_token");
      localStorage.removeItem("user");
      localStorage.removeItem("csr_user");
      localStorage.removeItem("authUser");

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("authUser");

      // Hard redirect works better for logout flows
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Check console for details.");
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
      <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600 lg:hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Facility Name Display - Replaces Search Bar */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
            {/* <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div> */}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Logged In Facility:
              </p>
              <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                {facilityName}
              </p>
            </div>
          </div>
        </div>

        <ul className="flex items-center gap-2 sm:gap-3">
          <li>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={toggleMode}
              aria-label="Toggle color mode"
            >
              {mode === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </li>

          <li className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={toggleNotifications}
              aria-label="Open notifications"
              aria-haspopup="menu"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
            </button>
          </li>

          <li className="relative" ref={profileRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-2 py-1.5 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              onClick={toggleProfile}
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
            >
              <Avatar
                className="h-9 w-9 rounded-full"
                src="/assets/img/avatar-15.png"
                alt="User avatar"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage profile
                </p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Profile and preferences
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="#"
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="mr-3 h-4 w-4" />
                    <span>Profile</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                  </button>
                </div>
              </div>
            )}
          </li>
        </ul>
      </div>
    </header>
  );
}

export default Header;