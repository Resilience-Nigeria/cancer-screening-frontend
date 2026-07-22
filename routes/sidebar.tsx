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
  LinkIcon,
} from "lucide-react";
import { ComponentType } from "react";

interface IRoute {
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  name: string;
  routes?: IRoute[];
  checkActive?: (pathname: string, route: IRoute) => boolean;
  exact?: boolean;
  roles?: Array<'NICRAT_SUPER_ADMIN' | 'NICRAT_ADMIN' | 'NAVIGATOR' | 'HOSPITAL_ADMIN' | 'NURSE' | 'DOCTOR' | 'PARTNER'>;
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

  {
    path: "/ncsr/referred",
    icon: LinkIcon,
    name: "Linked Clients",
    // Visible to all authenticated users
  },
  {
    path: "/ncsr/clinical-screening",
    icon: MicroscopeIcon,
    name: "Stage 2: Clinical Screening",
    // Visible to all authenticated users
  },
  {
    path: "/ncsr/diagnostic-evaluation",
    icon: MicroscopeIcon,
    name: "Stage 3: Diagnostic Evaluation",
    // Visible to all authenticated users — the page itself tells staff
    // if their facility isn't configured for Stage 3.
  },
  
  // Admin-only routes
  {
    path: "/ncsr/analytics",
    icon: ChartBar,
    name: "Analytics",
    roles: ["NICRAT_SUPER_ADMIN", "NICRAT_ADMIN", "PARTNER"],
  },
  {
    path: "/ncsr/users",
    icon: UserCog,
    name: "User Management",
    roles: ["NICRAT_SUPER_ADMIN", "NAVIGATOR", "HOSPITAL_ADMIN"], // Can create users
  },
  {
    path: "/ncsr/facilities",
    icon: Building2,
    name: "Facilities",
    roles: ["NICRAT_SUPER_ADMIN"], // Only super admin manages facilities
  },
  {
    path: "/ncsr/roles",
    icon: Settings,
    name: "Role Data Scope",
    roles: ["NICRAT_SUPER_ADMIN"], // Only super admin configures role scope
  },
  {
    path: "/ncsr/settings",
    icon: Settings,
    name: "Settings",
    roles: ["NICRAT_SUPER_ADMIN", "NAVIGATOR", "HOSPITAL_ADMIN"], // Admins can change settings
  },
];

export type { IRoute };
export default routes;