"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useState, useMemo, useEffect } from "react";
import { LogOut } from "lucide-react";
import SidebarContext from "../../../context/SidebarContext";
import routes, { IRoute, routeIsActive } from "../../../routes/sidebar";
import SidebarSubmenu from "./SidebarSubmenu";
import Image from "next/image";
import { logout } from "../../../lib/logout";
import { getUser } from "../../../lib/auth";

interface SidebarContentProps {
  linkClicked?: () => void;
}

export default function SidebarContent({ linkClicked }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSidebar, saveScroll } = useContext(SidebarContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load user data after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
    const userData = getUser();
    setUser(userData);
  }, []);

  const userRole = user?.role;

  // Filter routes based on user role
  const visibleRoutes = useMemo(() => {
    return routes.filter((route): route is IRoute => {
      if (!route) return false;

      // If route has no roles specified, it's visible to everyone
      if (!route.roles || route.roles.length === 0) {
        return true;
      }

      // If user has no role, only show routes without role restrictions
      if (!userRole) {
        return false;
      }

      // Check if user's role is in the allowed roles
      return route.roles.includes(userRole);
    });
  }, [userRole]);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    // Call the reusable logout utility
    // This handles backend logout, clearing auth data, and redirect
    await logout();
  }

  function handleLinkClick(listEl: HTMLElement | null) {
    saveScroll(listEl);

    if (linkClicked) {
      linkClicked();
    } else {
      closeSidebar();
    }
  }

  return (
    <div className="flex h-full flex-col justify-between py-4 text-gray-500 dark:text-gray-400">
      <div className="flex-1 overflow-y-auto">
        {/* Logo */}
        <Link
          href="/ncsr/dashboard"
          className="ml-6 block text-lg font-bold text-gray-800 dark:text-gray-200"
          onClick={(e) => {
            const listEl = e.currentTarget.closest("ul") as HTMLElement | null;
            handleLinkClick(listEl);
          }}
        >
          <Image
            src="/assets/img/NCSR.svg"
            alt="NCSR Logo"
            width={350}
            height={150}
            className="object-contain"
            priority
          />
        </Link>

        {/* User Info - Only render after mount to prevent hydration errors */}
        {isMounted && user && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
              {user.facility?.facilityName || "NCSR"}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
              {user.role?.replace(/_/g, ' ') || 'User'}
            </p>
          </div>
        )}

        {/* Navigation */}
        <ul id="sidebar" className="mt-6">
          {visibleRoutes.map((route) => {
            // Handle submenu routes
            if (route.routes && route.routes.length > 0) {
              return (
                <SidebarSubmenu
                  key={route.name}
                  route={route}
                  linkClicked={linkClicked || closeSidebar}
                />
              );
            }

            // Skip routes without paths
            if (!route.path) return null;

            const active = routeIsActive(pathname, route);
            const Icon = route.icon;

            return (
              <li className="relative px-6 py-3" key={route.name}>
                {/* Active indicator */}
                {active && (
                  <span
                    className="absolute inset-y-0 left-0 w-1 rounded-br-lg rounded-tr-lg bg-purple-600"
                    aria-hidden="true"
                  />
                )}

                <Link
                  href={route.path}
                  className={`flex w-full items-center gap-3 text-sm font-semibold transition-colors duration-150 hover:text-green-700 dark:hover:text-green-400 ${
                    active ? "text-gray-900 dark:text-white" : ""
                  }`}
                  onClick={(e) => {
                    const listEl = e.currentTarget.closest(
                      "ul",
                    ) as HTMLElement | null;
                    handleLinkClick(listEl);
                  }}
                >
                  {Icon && <Icon className="h-5 w-5 text-green-700" />}
                  <span>{route.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Logout Button */}
      <div className="px-6 pb-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="mr-3 h-4 w-4" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}