"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useState } from "react";
import { LogOut } from "lucide-react";
import SidebarContext from "../../../context/SidebarContext";
import routes, { IRoute, routeIsActive } from "../../../routes/sidebar";
import SidebarSubmenu from "./SidebarSubmenu";
import Image from "next/image";

interface SidebarContentProps {
  linkClicked?: () => void;
}

export default function SidebarContent({ linkClicked }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSidebar, saveScroll } = useContext(SidebarContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const safeRoutes = routes.filter((route): route is IRoute => Boolean(route));

  // Helper function to delete all cookies
  function deleteAllCookies() {
    const cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

      // Delete cookie for current domain
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      
      // Delete cookie for all possible paths
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      
      // Delete cookie for root domain (handles subdomains)
      const domain = window.location.hostname.split('.').slice(-2).join('.');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}`;
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      // Get token from multiple sources
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken");

      // Call backend logout endpoint
      if (token) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include", // Important for cookie handling
          });
        } catch (error) {
          console.error("Backend logout failed:", error);
          // Continue with client-side cleanup even if backend fails
        }
      }

      // Clear localStorage
      const localStorageKeys = [
        "token",
        "accessToken",
        "refreshToken",
        "user",
        "authUser",
        "userData",
      ];
      localStorageKeys.forEach((key) => localStorage.removeItem(key));

      // Clear sessionStorage
      const sessionStorageKeys = [
        "token",
        "accessToken",
        "refreshToken",
        "user",
        "authUser",
        "userData",
      ];
      sessionStorageKeys.forEach((key) => sessionStorage.removeItem(key));

      // Delete all cookies
      deleteAllCookies();

      // Optional: Clear all storage if needed
      // localStorage.clear();
      // sessionStorage.clear();

      // Redirect to login page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Please try again.");
      setIsLoggingOut(false);
    }
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
          href="/issam"
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

        {/* Navigation */}
        <ul id="sidebar" className="mt-6">
          {safeRoutes.map((route) => {
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