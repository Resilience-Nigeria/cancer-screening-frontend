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
  ChartBar,
} from "lucide-react";
import { ComponentType } from "react";

interface IRoute {
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  name: string;
  routes?: IRoute[];
  checkActive?: (pathname: string, route: IRoute) => boolean;
  exact?: boolean;
  roles?: Array<'SUPER_ADMIN' | 'NICRAT_STAFF' | 'HOSPITAL_ADMIN' | 'DATA_CLERK'>;
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
    path: "/ncsr/cancer-analytics",
    icon: ChartBar,
    name: "Analytics",
    roles: ["SUPER_ADMIN"], // Only super admin manages facilities
  },
  {
    path: "/ncsr/users",
    icon: UserCog,
    name: "User Management",
    roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"], // Can create users
  },
  {
    path: "/ncsr/facilities",
    icon: Building2,
    name: "Facilities",
    roles: ["SUPER_ADMIN"], // Only super admin manages facilities
  },
  {
    path: "/ncsr/settings",
    icon: Settings,
    name: "Settings",
    roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"], // Admins can change settings
  },
];

export type { IRoute };
export default routes;