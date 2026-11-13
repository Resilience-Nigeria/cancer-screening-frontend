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
  FlaskConical,
  ClipboardList,
  UserCheck,
  Send,
  Trash2,
  ScrollText,
  Flower2,
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
  { path: "/ncsr/dashboard", icon: HomeIcon, name: "Dashboard", exact: true },
  { path: "/ncsr/clients", name: "Clients", icon: Users },
  { path: "/ncsr/all-visits", icon: HospitalIcon, name: "Visits" },
  // { path: "/ncsr/screenings", icon: MicroscopeIcon, name: "Screenings" },
    { path: "/ncsr/screened-clients", icon: UserCheck, name: "Screened Clients" },

  { path: "/ncsr/outcomes", icon: SheetIcon, name: "Outcomes" },
  { path: "/ncsr/referred", icon: LinkIcon, name: "Linked Clients" },
  { path: "/ncsr/referred-clients", icon: Send, name: "Referred Clients" },
  {
    path: "/ncsr/self-assessments",
    icon: MicroscopeIcon,
    name: "Stage 1: Self-Assessment Records",
  },
  {
    path: "/ncsr/clinical-screening",
    icon: MicroscopeIcon,
    name: "Stage 2: Clinical Screening",
    requiresStage: "stage2",
  },

    {
    // Sample collection + result entry for all five cancer types (breast, cervical, prostate, liver, colorectal).
    // Not stage-gated: samples are often collected at a feeder and read at a lab/hub.
    // Use Settings > Menu Visibility to limit it by role.
    path: "/ncsr/screening-tests-page",
    icon: FlaskConical,
    name: "Samples & Test Results",
  },

 {
    // Read-only list of every recorded result, with filters and CSV export.
    path: "/ncsr/test-results-page",
    icon: ClipboardList,
    name: "All Test Results",
  },
  // {
  //   // HPV sample collection + result entry (Collect sample / Enter results tabs).
  //   // Not stage-gated: samples are often collected at a feeder and read at a lab/hub.
  //   // Use Settings > Menu Visibility to limit it by role.
  //   path: "/ncsr/hpv-sample-page",
  //   icon: FlaskConical,
  //   name: "HPV Samples & Results",
  // },
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
  { path: "/ncsr/treatments", icon: Activity, name: "Treatment Tracking" },
  { path: "/ncsr/follow-up-schedules", icon: LinkIcon, name: "Follow-up Schedules" },

  {
    // Bloom mobile app: dashboard linking to Bookings, Cases and Health Workers.
    // Stays highlighted on those pages too (/ncsr/bloom-bookings, /ncsr/bloom-cases, /ncsr/bloom-navigators).
    path: "/ncsr/bloom",
    icon: Flower2,
    name: "Bloom",
    checkActive: (pathname) => pathname === "/ncsr/bloom" || pathname.startsWith("/ncsr/bloom-") || pathname.startsWith("/ncsr/bloom/"),
  },

  // Admin-only routes — visibility comes from menu_visibility_rules
  // (Settings > Menu Visibility), not hardcoded here.
  { path: "/ncsr/analytics", icon: ChartBar, name: "Analytics" },
  { path: "/ncsr/navigator-clients", icon: Users, name: "My Clients" },
  { path: "/ncsr/indigency-support", icon: HeartHandshake, name: "Indigency Support" },
  { path: "/ncsr/users", icon: UserCog, name: "User Management" },
  { path: "/ncsr/facilities", icon: Building2, name: "Facilities" },
  { path: "/ncsr/facility-map", icon: MapPinned, name: "Facility Map" },
  { path: "/ncsr/roles", icon: Settings, name: "Role Data Scope" },
  { path: "/ncsr/settings", icon: Settings, name: "Settings" },
  { path: "/ncsr/activity-logs", icon: ScrollText, name: "Activity Log" },
  { path: "/ncsr/deleted-records", icon: Trash2, name: "Deleted Records" },
];

export type { IRoute };
export default routes;