"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import SidebarContext from "../../../context/SidebarContext";
import type { IRoute } from "../../../routes/sidebar";
import { routeIsActive } from "../../../routes/sidebar";
import { getUser } from "../../../lib/auth";

interface ISidebarSubmenuProps {
  route: IRoute;
  linkClicked: () => void;
}

export default function SidebarSubmenu({
  route,
  linkClicked,
}: ISidebarSubmenuProps) {
  const pathname = usePathname();
  const { saveScroll } = useContext(SidebarContext);

  // Get current user
  const user = getUser();
  const userRole = user?.role;

  // Filter sub-routes based on user role
  const visibleSubRoutes = useMemo(() => {
    const subRoutes = route?.routes ?? [];
    
    return subRoutes.filter((subRoute) => {
      // If sub-route has no roles specified, it's visible to everyone
      if (!subRoute.roles || subRoute.roles.length === 0) {
        return true;
      }

      // If user has no role, only show routes without role restrictions
      if (!userRole) {
        return false;
      }

      // Check if user's role is in the allowed roles
      return subRoute.roles.includes(userRole);
    });
  }, [route?.routes, userRole]);

  // Don't render if no visible sub-routes
  if (visibleSubRoutes.length === 0) return null;

  const hasActiveSubroute = useMemo(() => {
    return visibleSubRoutes.some((subRoute) => routeIsActive(pathname, subRoute));
  }, [pathname, visibleSubRoutes]);

  const [isDropdownMenuOpen, setIsDropdownMenuOpen] =
    useState(hasActiveSubroute);

  useEffect(() => {
    if (hasActiveSubroute) {
      setIsDropdownMenuOpen(true);
    }
  }, [hasActiveSubroute]);

  const ParentIcon = route.icon;

  return (
    <li className="relative px-4 py-2">
      <button
        type="button"
        className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-green-700 dark:hover:text-green-400 transition"
        onClick={() => setIsDropdownMenuOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isDropdownMenuOpen}
      >
        <span className="flex items-center gap-3">
          {ParentIcon && <ParentIcon className="w-5 h-5 text-green-700" />}
          <span>{route.name}</span>
        </span>

        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isDropdownMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isDropdownMenuOpen && (
        <ul className="mt-2 ml-6 space-y-1 text-sm">
          {visibleSubRoutes
            .filter(
              (
                subRoute,
              ): subRoute is IRoute & {
                path: string;
                name: string;
              } =>
                typeof subRoute?.path === "string" &&
                typeof subRoute?.name === "string",
            )
            .map((subRoute) => {
              const active = routeIsActive(pathname, subRoute);
              const SubIcon = subRoute.icon;

              return (
                <li key={subRoute.name}>
                  <Link
                    href={subRoute.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                      active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={(e) => {
                      const listEl = e.currentTarget.closest(
                        "ul",
                      ) as HTMLElement | null;
                      saveScroll(listEl);
                      linkClicked();
                    }}
                  >
                    {SubIcon && <SubIcon className="w-4 h-4" />}
                    <span>{subRoute.name}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </li>
  );
}