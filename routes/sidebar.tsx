import {
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
  MailCheck,
  BellRing,
  Smartphone,
  Boxes,
  Stethoscope,
  ShieldCheck,
  UserRound,
  CalendarClock,
  Route as RouteIcon,
  Contact,
} from "lucide-react";
import { ComponentType } from "react";

interface IRoute {
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  name: string;
  /** A group: shown as a collapsible heading with these pages under it. */
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
  if (route.routes?.length) {
    return route.routes.some((r) => routeIsActive(pathname, r));
  }

  if (route.checkActive) {
    return route.checkActive(pathname, route);
  }

  if (!route.path) return false;

  if (route.exact) {
    return pathname === route.path;
  }

  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}

/**
 * The sidebar, grouped. Each page keeps its own path, so Settings > Menu Visibility
 * rules (keyed by path) work exactly as before — a group disappears when the user
 * can see none of its pages, and shows as a plain link when they can see only one.
 */
const routes: IRoute[] = [
  { path: "/ncsr/dashboard", icon: HomeIcon, name: "Dashboard", exact: true },
  { path: "/ncsr/analytics", icon: ChartBar, name: "Analytics" },

  {
    name: "Clients",
    icon: Users,
    routes: [
      { path: "/ncsr/clients", name: "All Clients", icon: Users },
      { path: "/ncsr/navigator-clients", icon: UserRound, name: "My Clients" },
      { path: "/ncsr/all-visits", icon: HospitalIcon, name: "Visits" },
      { path: "/ncsr/screened-clients", icon: UserCheck, name: "Screened Clients" },
      { path: "/ncsr/referred", icon: LinkIcon, name: "Linked Clients" },
      { path: "/ncsr/referred-clients", icon: Send, name: "Referred Clients" },
    ],
  },

  {
    name: "Screening Pathway",
    icon: RouteIcon,
    routes: [
      { path: "/ncsr/self-assessments", icon: Contact, name: "Stage 1: Self-Assessment" },
      { path: "/ncsr/clinical-screening", icon: MicroscopeIcon, name: "Stage 2: Clinical Screening", requiresStage: "stage2" },
      // Sample collection + result entry for all five cancer types. Not stage-gated:
      // samples are often collected at a feeder and read at a lab/hub.
      { path: "/ncsr/screening-tests-page", icon: FlaskConical, name: "Samples & Test Results" },
      // Read-only list of every recorded result, with filters and CSV export.
      { path: "/ncsr/test-results-page", icon: ClipboardList, name: "All Test Results" },
      { path: "/ncsr/diagnostic-evaluation", icon: Stethoscope, name: "Stage 3: Diagnostic Evaluation", requiresStage: "stage3" },
      { path: "/ncsr/treatment-plan", icon: HospitalIcon, name: "Stage 4: Treatment & Care", requiresStage: "stage4" },
    ],
  },

  {
    name: "Care & Follow-up",
    icon: Activity,
    routes: [
      { path: "/ncsr/treatments", icon: Activity, name: "Treatment Tracking" },
      { path: "/ncsr/follow-up-schedules", icon: CalendarClock, name: "Follow-up Schedules" },
      { path: "/ncsr/outcomes", icon: SheetIcon, name: "Outcomes" },
      { path: "/ncsr/indigency-support", icon: HeartHandshake, name: "Indigency Support" },
    ],
  },

  {
    name: "Facilities & Stock",
    icon: Building2,
    routes: [
      { path: "/ncsr/facilities", icon: Building2, name: "Facilities" },
      { path: "/ncsr/facility-map", icon: MapPinned, name: "Facility Map" },
      { path: "/ncsr/stock-page", icon: Boxes, name: "Stock Management" },
    ],
  },

  {
    name: "Mobile Apps",
    icon: Smartphone,
    routes: [
      {
        // Bloom mobile app: dashboard linking to Bookings, Cases and Health Workers.
        // Stays highlighted on those pages too (/ncsr/bloom-bookings, /ncsr/bloom-cases, /ncsr/bloom-navigators).
        path: "/ncsr/bloom",
        icon: Flower2,
        name: "Bloom",
        checkActive: (pathname) => pathname === "/ncsr/bloom" || pathname.startsWith("/ncsr/bloom-") || pathname.startsWith("/ncsr/bloom/"),
      },
      { path: "/ncsr/mobile-app-page", icon: Smartphone, name: "NCSR Mobile App" },
      { path: "/ncsr/staff-notifications-page", icon: BellRing, name: "Staff Notifications" },
    ],
  },

  // Admin pages — who sees them comes from Settings > Menu Visibility, not from here.
  {
    name: "Administration",
    icon: ShieldCheck,
    routes: [
      { path: "/ncsr/users", icon: UserCog, name: "User Management" },
      { path: "/ncsr/roles", icon: ShieldCheck, name: "Role Data Scope" },
      { path: "/ncsr/report-settings", icon: MailCheck, name: "Report Settings" },
      { path: "/ncsr/activity-logs", icon: ScrollText, name: "Activity Log" },
      { path: "/ncsr/deleted-records", icon: Trash2, name: "Deleted Records" },
      { path: "/ncsr/settings", icon: Settings, name: "Settings" },
    ],
  },
];

/**
 * Every page as a flat list (groups expanded). Use this anywhere that needs the list of
 * pages rather than the sidebar layout — e.g. the Settings > Menu Visibility screen.
 */
export const flatRoutes: IRoute[] = routes.flatMap((r) => (r.routes?.length ? r.routes.map((c) => ({ ...c, group: r.name } as IRoute & { group: string })) : [r]));

export type { IRoute };
export default routes;
