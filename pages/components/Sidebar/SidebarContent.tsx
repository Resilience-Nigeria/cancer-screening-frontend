"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useState, useMemo, useEffect } from "react";
import { LogOut, Shield, Database, Building2, Users } from "lucide-react";
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

  // Get role name from user_role relationship (new RBAC) or fallback to old role field
  const userRoleName = user?.user_role?.roleName || user?.role;

  // Filter routes based on user role
  const visibleRoutes = useMemo(() => {
    return routes.filter((route): route is IRoute => {
      if (!route) return false;

      // If route has no roles specified, it's visible to everyone
      if (route.roles && route.roles.length > 0) {
        if (!userRoleName) return false;
        if (!route.roles.includes(userRoleName)) return false;
      }

      // Stage-gated routes (Stage 2/3/4) only show if the user's own
      // facility is configured to support that stage. Users with no
      // assigned facility (national-scoped roles) aren't tied to one
      // facility's capabilities, so they always see these. Sessions
      // cached before this field existed have no stagesSupported at
      // all — fail open (show the item) rather than hiding it until
      // their next login.
      if (route.requiresStage && user?.facility && Array.isArray(user.facility.stagesSupported)) {
        if (!user.facility.stagesSupported.includes(route.requiresStage)) {
          return false;
        }
      }

      return true;
    });
  }, [userRoleName, user]);

  // Get role display name
  function getRoleDisplayName(): string {
    if (!userRoleName) return 'User';
    
    const roleNames: Record<string, string> = {
      'NICRAT_SUPER_ADMIN': 'Super Administrator',
      'NICRAT_ADMIN': 'NICRAT Staff',
      'NAVIGATOR': 'Navigator',
      'HOSPITAL_ADMIN': 'Hospital Administrator',
      'NURSE': 'Nurse',
      'DOCTOR': 'Doctor',
      'PARTNER': 'Partner'
    };
    
    return roleNames[userRoleName] || userRoleName.replace(/_/g, ' ');
  }

  // Get role icon
  function getRoleIcon() {
    if (!userRoleName) return null;
    
    const icons: Record<string, JSX.Element> = {
      'NICRAT_SUPER_ADMIN': <Shield className="w-3.5 h-3.5" />,
      'NICRAT_ADMIN': <Database className="w-3.5 h-3.5" />,
      'NAVIGATOR': <Building2 className="w-3.5 h-3.5" />,
      'HOSPITAL_ADMIN': <Building2 className="w-3.5 h-3.5" />,
      'NURSE': <Users className="w-3.5 h-3.5" />,
      'DOCTOR': <Users className="w-3.5 h-3.5" />,
      'PARTNER': <Users className="w-3.5 h-3.5" />,
    };
    
    return icons[userRoleName];
  }

  // Get role badge color
  function getRoleBadgeColor(): string {
    if (!userRoleName) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    
    const colors: Record<string, string> = {
      'NICRAT_SUPER_ADMIN': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'NICRAT_ADMIN': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'NAVIGATOR': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'HOSPITAL_ADMIN': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      'NURSE': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'DOCTOR': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      'PARTNER': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    
    return colors[userRoleName] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }

  // Backend-computed from the role's configured dataScopeType — falls
  // back to the role-name check only for sessions stored before this
  // field existed (until they next log in).
  function hasNationalAccess(): boolean {
    return user?.hasNationalAccess ?? (userRoleName === 'NICRAT_SUPER_ADMIN' || userRoleName === 'NICRAT_ADMIN' || userRoleName === 'PARTNER');
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
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

        {/* Enhanced User Info with Role Badge */}
        {isMounted && user && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            {/* Facility Name or Organization Name
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
              {hasNationalAccess() ? "NCSR - National Cancer Screening Register" : (user.facility?.facilityName || "NCSR")}
            </p>
          
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
              {user.firstName} {user.lastName}
            </p> */}
            
            {/* Role Badge with Icon */}
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor()}`}>
                {getRoleIcon()}
                {getRoleDisplayName()}
              </span>
            </div>

            {/* National Access Indicator */}
            {hasNationalAccess() && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold`}>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                🌍 National Access
              </p>
              </span>
            )}
          </div>
        )}

        {/* Navigation */}
        <ul id="sidebar" className="mt-6">
          {visibleRoutes.map((route) => {
            // Handle submenu routes
            if (route.routes && route.routes.length > 0) {
              // Filter submenu routes by role as well
              const visibleSubRoutes = route.routes.filter((subRoute) => {
                if (!subRoute.roles || subRoute.roles.length === 0) return true;
                if (!userRoleName) return false;
                return subRoute.roles.includes(userRoleName);
              });

              // Don't show parent if no child routes are visible
              if (visibleSubRoutes.length === 0) return null;

              return (
                <SidebarSubmenu
                  key={route.name}
                  route={{ ...route, routes: visibleSubRoutes }}
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