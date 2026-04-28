"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import SidebarContext from "../../../context/SidebarContext";
import routes, { IRoute, routeIsActive } from "../../../../routes/sidebar2";
import SidebarSubmenu from "./SidebarSubmenu";

export default function SidebarContent() {
  const pathname = usePathname();
  const { closeSidebar, saveScroll } = useContext(SidebarContext);

  const safeRoutes = routes.filter((route): route is IRoute => Boolean(route));

  return (
    <ul id="sidebar" className="mt-6">
      {safeRoutes.map((route) => {
        if (route.routes && route.routes.length > 0) {
          return (
            <SidebarSubmenu
              key={route.name}
              route={route}
              linkClicked={closeSidebar}
            />
          );
        }

        if (!route.path) {
          return null;
        }

        const active = routeIsActive(pathname, route);

        return (
          <li className="relative px-6 py-3" key={route.name}>
            {active && (
              <span
                className="absolute inset-y-0 left-0 w-1 bg-purple-600 rounded-tr-lg rounded-br-lg"
                aria-hidden="true"
              />
            )}

            <Link
              href={route.path}
              className={`inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-gray-800 dark:hover:text-gray-200 ${
                active ? "text-gray-800 dark:text-gray-100" : ""
              }`}
              onClick={(e) => {
                const listEl = e.currentTarget.closest(
                  "ul",
                ) as HTMLElement | null;
                saveScroll(listEl);
                closeSidebar();
              }}
            >
              <span className="ml-4">{route.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
