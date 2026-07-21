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
  Shield,
  Database,
  Users as UsersIcon,
  Settings,
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
  const [userEmail, setUserEmail] = useState("");
  const [facilityName, setFacilityName] = useState("Loading...");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleDisplayName, setRoleDisplayName] = useState("User");
  const [hasNationalAccess, setHasNationalAccess] = useState(false);

  const notificationsRef = useRef<HTMLLIElement | null>(null);
  const profileRef = useRef<HTMLLIElement | null>(null);

  // Get role display name
  function getRoleDisplayName(roleName: string): string {
    const roleNames: Record<string, string> = {
      'NICRAT_SUPER_ADMIN': 'Super Administrator',
      'NICRAT_ADMIN': 'NICRAT Staff',
      'NAVIGATOR': 'Hospital Administrator',
      'NURSE': 'Data Clerk',
    };
    return roleNames[roleName] || roleName.replace(/_/g, ' ');
  }

  // Get role icon
  function getRoleIcon(roleName: string) {
    const icons: Record<string, JSX.Element> = {
      'NICRAT_SUPER_ADMIN': <Shield className="h-4 w-4" />,
      'NICRAT_ADMIN': <Database className="h-4 w-4" />,
      'NAVIGATOR': <Building2 className="h-4 w-4" />,
      'NURSE': <UsersIcon className="h-4 w-4" />,
      'PARTNER': <UsersIcon className="h-4 w-4" />,
    };
    return icons[roleName] || <UsersIcon className="h-4 w-4" />;
  }

  // Get role badge color
  function getRoleBadgeColor(roleName: string): string {
    const colors: Record<string, string> = {
      'NICRAT_SUPER_ADMIN': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'NICRAT_ADMIN': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'NAVIGATOR': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'NURSE': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'PARTNER': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem("csr_user");
      if (userData) {
        const user = JSON.parse(userData);
        
        // Set user full name
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        setUserName(fullName || user.email || "User");
        setUserEmail(user.email || "");
        
        // Get role from user_role relationship or fallback to role field
        const roleName = user.user_role?.roleName || user.role;
        setUserRole(roleName);
        setRoleDisplayName(getRoleDisplayName(roleName));
        
        // Backend-computed from the role's configured dataScopeType —
        // falls back to the role-name check only for sessions stored
        // before this field existed (until they next log in).
        const nationalAccess = user.hasNationalAccess ?? (roleName === 'NICRAT_SUPER_ADMIN' || roleName === 'NICRAT_ADMIN' || roleName === 'PARTNER');
        setHasNationalAccess(nationalAccess);
        
        // Set facility name only for facility-level users
        if (!nationalAccess) {
          if (user.facility?.facilityName) {
            setFacilityName(user.facility.facilityName);
          } else if (user.facilityName) {
            setFacilityName(user.facilityName);
          } else {
            setFacilityName("No Facility Assigned");
          }
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
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left Section - Mobile Menu + Facility/Org Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 lg:hidden dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Facility/Organization Info Card */}
          {!hasNationalAccess ? (
            // Facility-Level Users
            <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Current Facility
                </p>
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {facilityName}
                </p>
              </div>
            </div>
          ) : (
            // National-Level Users
            <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm">
                {userRole === 'NICRAT_SUPER_ADMIN' ? (
                  <Shield className="h-5 w-5 text-white" />
                ) : (
                  <Database className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <span>🌍</span>
                  <span>National Access</span>
                </p>
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  NCSR - All Facilities
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Theme Toggle, Notifications, Profile */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            onClick={toggleMode}
            aria-label="Toggle color mode"
          >
            {mode === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              onClick={toggleNotifications}
              aria-label="Open notifications"
              aria-haspopup="menu"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You have 3 unread messages
                  </p>
                </div>
                <div className="p-2 max-h-96 overflow-y-auto">
                  <p className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No new notifications
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg bg-gray-50 pl-2 pr-3 py-1.5 text-left transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:hover:bg-gray-600"
              onClick={toggleProfile}
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold text-sm shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {roleDisplayName}
                </p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                {/* Profile Header */}
                <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-lg shadow-md">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                  
                  {/* Role Badge */}
                  {userRole && (
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${getRoleBadgeColor(userRole)}`}>
                        {getRoleIcon(userRole)}
                        {roleDisplayName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <Link
                    href="/ncsr/profile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>View Profile</span>
                  </Link>

                  <Link
                    href="/ncsr/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>

                  <div className="my-2 border-t border-gray-100 dark:border-gray-700" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;