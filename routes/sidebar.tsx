import {
  LayoutDashboard,
  HomeIcon,
  Users,
  HospitalIcon,
  MicroscopeIcon,
  SheetIcon,
  Settings,
  UserCog,
  Building2,
} from "lucide-react";
import { ComponentType } from "react";

interface IRoute {
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  name: string;
  routes?: IRoute[];
  checkActive?: (pathname: string, route: IRoute) => boolean;
  exact?: boolean;
  roles?: string[]; // Add roles field - if undefined, visible to all
}

export function routeIsActive(pathname: string, route: IRoute): boolean {
  if (route.checkActive) {
    return route.checkActive(pathname, route);
  }

  if (!route.path) return false;

  if (route.exact) {
    return pathname === route.path;
  }

  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}

const routes: IRoute[] = [
  {
    path: "/ncsr/dashboard",
    icon: HomeIcon,
    name: "Dashboard",
    exact: true,
    // No roles = visible to everyone
  },
  {
    path: "/ncsr/clients",
    name: "Clients",
    icon: Users,
    // Visible to all authenticated users
  },
  {
    path: "/ncsr/all-visits",
    icon: HospitalIcon,
    name: "Visits",
    // Visible to all authenticated users
  },
  {
    path: "/ncsr/screenings",
    icon: MicroscopeIcon,
    name: "Screenings",
    // Visible to all authenticated users
  },
  {
    path: "/ncsr/outcomes",
    icon: SheetIcon,
    name: "Outcomes",
    // Visible to all authenticated users
  },
  
  // Admin-only routes
  {
    path: "/ncsr/users",
    icon: UserCog,
    name: "User Management",
    roles: ["ADMIN", "SUPER_ADMIN"], // Only admins can see this
  },
  {
    path: "/ncsr/facilities",
    icon: Building2,
    name: "Facilities",
    roles: ["ADMIN", "SUPER_ADMIN"], // Only admins can see this
  },
  {
    path: "/ncsr/settings",
    icon: Settings,
    name: "Settings",
    roles: ["ADMIN", "SUPER_ADMIN"], // Only admins can see this
  },
  
  // Example: Submenu with role-based items
  // {
  //   icon: Settings,
  //   name: "Administration",
  //   routes: [
  //     {
  //       path: "/ncsr/users",
  //       name: "Users",
  //       icon: UserCog,
  //       roles: ["admin", "super_admin"],
  //     },
  //     {
  //       path: "/ncsr/facilities",
  //       name: "Facilities",
  //       icon: Building2,
  //       roles: ["admin", "super_admin"],
  //     },
  //     {
  //       path: "/ncsr/settings",
  //       name: "Settings",
  //       icon: Settings,
  //       roles: ["admin"],
  //     },
  //   ],
  // },
];

export type { IRoute };
export default routes;