"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import SidebarContext from "../../../context/SidebarContext";
import type { IRoute } from "../../../../routes/sidebar2";
import { routeIsActive } from "../../../../routes/sidebar2";

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

  if (!route?.routes?.length) {
    return null;
  }

  const hasActiveSubroute = useMemo(() => {
    return route.routes.some((subRoute) => routeIsActive(pathname, subRoute));
  }, [pathname, route.routes]);

  const [isDropdownMenuOpen, setIsDropdownMenuOpen] =
    useState(hasActiveSubroute);

  useEffect(() => {
    if (hasActiveSubroute) {
      setIsDropdownMenuOpen(true);
    }
  }, [hasActiveSubroute]);

  return (
    <li className="relative px-6 py-3">
      <button
        type="button"
        className="inline-flex items-center justify-between w-full text-sm font-semibold transition-colors duration-150 hover:text-gray-800 dark:hover:text-gray-200"
        onClick={() => setIsDropdownMenuOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isDropdownMenuOpen}
      >
        <span className="inline-flex items-center">
          <span className="w-5 h-5 mr-4" />
          <span>{route.name}</span>
        </span>

        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isDropdownMenuOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isDropdownMenuOpen && (
        <ul
          className="p-2 mt-2 space-y-2 overflow-hidden text-sm font-medium text-gray-500 rounded-md shadow-inner bg-gray-50 dark:text-gray-400 dark:bg-gray-900"
          aria-label="submenu"
        >
          {route.routes
            .filter((subRoute): subRoute is IRoute =>
              Boolean(subRoute?.path && subRoute?.name),
            )
            .map((subRoute) => {
              const active = routeIsActive(pathname, subRoute);

              return (
                <li
                  key={subRoute.name}
                  className="px-2 py-1 transition-colors duration-150 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <Link
                    href={subRoute.path!}
                    className={`block w-full ${
                      active
                        ? "text-purple-600 dark:text-purple-300 font-semibold"
                        : ""
                    }`}
                    onClick={(e) => {
                      const listEl = e.currentTarget.closest(
                        "ul",
                      ) as HTMLElement | null;
                      saveScroll(listEl);
                      linkClicked();
                    }}
                  >
                    {subRoute.name}
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </li>
  );
}
