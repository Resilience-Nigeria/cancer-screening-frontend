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
  Activity,
  MapPinned,
  HeartHandshake,
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
  // Only shown if the user's own facility supports this stage (checked
  // against facility.stagesSupported). Users with no assigned facility
  // (national-scoped roles) always see these, since they aren't tied
  // to one facility's configured capabilities.
  requiresStage?: 'stage2' | 'stage3' | 'stage4';
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
    path: "/ncsr/self-assessments",
    icon: MicroscopeIcon,
    name: "Stage 1: Self-Assessment Records",
    // Visible to all authenticated users — Bloom self-assessment is a
    // public, universal tool, not gated by facility stage capability.
  },
  {
    path: "/ncsr/clinical-screening",
    icon: MicroscopeIcon,
    name: "Stage 2: Clinical Screening",
    requiresStage: "stage2",
  },
  {
    path: "/ncsr/diagnostic-evaluation",
    icon: MicroscopeIcon,
    name: "Stage 3: Diagnostic Evaluation",
    requiresStage: "stage3",
  },
  {
    path: "/ncsr/treatment-plan",
    icon: HospitalIcon,
    name: "Stage 4: Treatment & Care",
    requiresStage: "stage4",
  },
  {
    path: "/ncsr/treatments",
    icon: Activity,
    name: "Treatment Tracking",
    // Visible to all authenticated users
  },
  {
    path: "/ncsr/follow-up-schedules",
    icon: LinkIcon,
    name: "Follow-up Schedules",
    // Visible to all authenticated users
  },
  
  // Admin-only routes — visibility now comes from menu_visibility_rules
  // (Settings > Menu Visibility), not hardcoded here.
  {
    path: "/ncsr/analytics",
    icon: ChartBar,
    name: "Analytics",
  },
  {
    path: "/ncsr/indigency-support",
    icon: HeartHandshake,
    name: "Indigency Support",
  },
  {
    path: "/ncsr/users",
    icon: UserCog,
    name: "User Management",
  },
  {
    path: "/ncsr/facilities",
    icon: Building2,
    name: "Facilities",
  },
  {
    path: "/ncsr/facility-map",
    icon: MapPinned,
    name: "Facility Map",
  },
  {
    path: "/ncsr/roles",
    icon: Settings,
    name: "Role Data Scope",
  },
  {
    path: "/ncsr/settings",
    icon: Settings,
    name: "Settings",
  },
];

export type { IRoute };
export default routes;