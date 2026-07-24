import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";

import PageTitle from "../components/Typography/PageTitle";
import Layout from "../containers/Layout";
import api from "../../lib/api";
import { getUser } from "../../lib/auth";

import {
  TableBody,
  TableContainer,
  Table,
  TableHeader,
  TableCell,
  TableRow,
  TableFooter,
  Badge,
  Pagination,
  Button,
} from "@roketid/windmill-react-ui";

import {
  Activity,
  Users,
  ClipboardList,
  AlertTriangle,
  Stethoscope,
  ArrowUpRight,
  Building2,
  CalendarDays,
  FileText,
  Loader2,
  Filter,
  X,
  Globe,
  Plus,
  StethoscopeIcon,
  ClipboardCheck,
  Microscope,
  UserPlus,
  HeartHandshake,
} from "lucide-react";

type ScreeningActivity = {
  visitId: number;
  clientName: string;
  screeningId: string;
  screeningType: string;
  status: "Completed" | "Pending" | "Referred" | "Follow-up";
  facility: string;
  date: string;
};

type DashboardStats = {
  totalClients: number;
  screeningsThisMonth: number;
  pendingFollowUps: number;
  referralAlerts: number;
  cervicalScreenings: number;
  breastScreenings: number;
  prostateScreenings: number;
  colorectalScreenings: number;
  liverScreenings: number;
  positiveFindings: number;
  totalReferred: number;
  activeTreatmentPlans: number;
};

type Facility = {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
};

type StatCardProps = {
  title: string;
  value: string;
  note?: string;
  icon: React.ReactNode;
  iconWrapperClass: string;
  onClick?: () => void;
  clickable?: boolean;
};

function StatCard({
  title,
  value,
  note,
  icon,
  iconWrapperClass,
  onClick,
  clickable = false,
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 transition-all ${
        clickable
          ? "cursor-pointer hover:shadow-lg hover:border-green-300 dark:hover:border-green-600 hover:-translate-y-1"
          : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-5">
            {title}
          </p>
          <h3 className="mt-2 text-xl sm:text-2xl font-bold text-gray-800 dark:text-white break-words">
            {value}
          </h3>
          {note ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-5">
              {note}
            </p>
          ) : null}
        </div>

        <div
          className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${iconWrapperClass}`}
        >
          {icon}
        </div>
      </div>
      {clickable && (
        <div className="mt-3 flex items-center text-xs font-medium text-green-600 dark:text-green-400">
          <span>View details</span>
          <ArrowUpRight className="w-3 h-3 ml-1" />
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  title,
  value,
  note,
  noteColor = "text-green-600",
  icon,
  onClick,
}: {
  title: string;
  value: string;
  note: string;
  noteColor?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all ${
        onClick
          ? "cursor-pointer hover:shadow-lg hover:border-green-300 dark:hover:border-green-600 hover:-translate-y-1"
          : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-5">
          {title}
        </p>
        <div className="shrink-0">{icon}</div>
      </div>
      <h3 className="mt-3 text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
        {value}
      </h3>
      <p className={`mt-1 text-xs ${noteColor}`}>{note}</p>
      {onClick && (
        <div className="mt-2 flex items-center text-xs font-medium text-green-600 dark:text-green-400">
          <span>View screenings</span>
          <ArrowUpRight className="w-3 h-3 ml-1" />
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  item,
  getBadgeType,
}: {
  item: ScreeningActivity;
  getBadgeType: (status: ScreeningActivity["status"]) => string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            {item.clientName}
          </h3>
          <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-400">
            {item.screeningId}
          </p>
        </div>
        <Badge type={getBadgeType(item.status) as any}>{item.status}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{item.screeningType}</span>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Building2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{item.facility}</span>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{new Date(item.date).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const router = useRouter();
  const currentUser = getUser();
  
  // Check if user has national access (NICRAT_SUPER_ADMIN or NICRAT_ADMIN)
  const userRole = currentUser?.user_role?.roleName || currentUser?.role;
  // Backend-computed from the role's configured dataScopeType — not a
  // hardcoded role list, so this stays correct if scope is reconfigured
  // via the Roles admin page without needing a frontend redeploy.
  const hasNationalAccess = currentUser?.hasNationalAccess ?? ['NICRAT_SUPER_ADMIN', 'NICRAT_ADMIN', 'PARTNER'].includes(userRole);

  // Dashboard layout mode — Feeder-level facility_only users get pure
  // action cards instead of stats (front-line, walk-in clinics mostly
  // need to DO things, not analyze data). Anyone with broader scope
  // (state/hub_hierarchy/subhub_hierarchy) or national access keeps the
  // stats dashboard unchanged. facility_only users at a Hub/SubHub get
  // both stats and action cards.
  const facilityLevel = currentUser?.facility?.facilityLevel;
  const dataScopeType = currentUser?.dataScopeType;
  const isFeederOnlyUser = !hasNationalAccess && dataScopeType === 'facility_only' && facilityLevel === 'feeder';
  const showActionCards = !hasNationalAccess;

  // Stage 2/3/4 buttons and cards only show if the user's own facility
  // supports that stage. National-scoped users (no assigned facility)
  // and cached sessions predating stagesSupported always see them.
  function facilitySupportsStage(stage: string): boolean {
    const facilityStages = currentUser?.facility?.stagesSupported;
    if (!currentUser?.facility || !Array.isArray(facilityStages)) return true;
    return facilityStages.includes(stage);
  }
  const showStatsCards = !isFeederOnlyUser;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    screeningsThisMonth: 0,
    pendingFollowUps: 0,
    referralAlerts: 0,
    cervicalScreenings: 0,
    breastScreenings: 0,
    prostateScreenings: 0,
    colorectalScreenings: 0,
    liverScreenings: 0,
    positiveFindings: 0,
    totalReferred: 0,
    activeTreatmentPlans: 0,
  });
  const [activities, setActivities] = useState<ScreeningActivity[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Filter states (only for national users)
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filtersApplied, setFiltersApplied] = useState(false);

  const resultsPerPage = 6;

  // Fetch facilities for national users
  async function fetchFacilities() {
    if (!hasNationalAccess) return;
    
    try {
      const { data } = await api.get("/facilities");
      if (data.status) {
        setFacilities(data.facilities || data.data || []);
      }
    } catch (err) {
      console.error("Error fetching facilities:", err);
    }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Build query params with filters
      const params: any = {};
      
      if (hasNationalAccess) {
        if (selectedFacility !== "all") {
          params.facilityId = selectedFacility;
        }
        if (dateFrom) {
          params.dateFrom = dateFrom;
        }
        if (dateTo) {
          params.dateTo = dateTo;
        }
      }

      const statsResponse = await api.get("/dashboard/stats", { params });
      const statsData = statsResponse.data?.stats || statsResponse.data;

      setStats({
        totalClients: statsData.totalClients ?? statsData.total_clients ?? 0,
        screeningsThisMonth:
          statsData.screeningsThisMonth ?? statsData.screenings_this_month ?? 0,
        pendingFollowUps:
          statsData.pendingFollowUps ?? statsData.pending_follow_ups ?? 0,
        referralAlerts:
          statsData.referralAlerts ?? statsData.referral_alerts ?? 0,
        cervicalScreenings:
          statsData.cervicalScreenings ?? statsData.cervical_screenings ?? 0,
        breastScreenings:
          statsData.breastScreenings ?? statsData.breast_screenings ?? 0,
        prostateScreenings:
          statsData.prostateScreenings ?? statsData.prostate_screenings ?? 0,
        colorectalScreenings:
          statsData.colorectalScreenings ??
          statsData.colorectal_screenings ??
          0,
        liverScreenings:
          statsData.liverScreenings ?? statsData.liver_screenings ?? 0,
        positiveFindings:
          statsData.positiveFindings ?? statsData.positive_findings ?? 0,
          totalReferred:
  statsData.totalReferred ?? statsData.total_referred ?? 0,
        activeTreatmentPlans:
          statsData.activeTreatmentPlans ?? statsData.active_treatment_plans ?? 0,
      });
    } catch (err: any) {
      console.error("Error fetching stats:", err);
      toast.error("Unable to load dashboard statistics");
    }
  }

  async function fetchRecentActivity() {
    try {
      const params: any = { page, limit: resultsPerPage };
      
      if (hasNationalAccess) {
        if (selectedFacility !== "all") {
          params.facilityId = selectedFacility;
        }
        if (dateFrom) {
          params.dateFrom = dateFrom;
        }
        if (dateTo) {
          params.dateTo = dateTo;
        }
      }

      const activitiesResponse = await api.get("/dashboard/recent-activity", { params });

      const rawActivities =
        activitiesResponse.data?.data ||
        activitiesResponse.data?.activities ||
        [];
      const total =
        activitiesResponse.data?.total || rawActivities.length || 0;

      const mappedActivities: ScreeningActivity[] = rawActivities.map(
        (item: any) => ({
          visitId: item.visitId ?? item.visit_id ?? item.id,
          clientName:
            item.clientName ??
            item.client_name ??
            item.client?.fullName ??
            item.client?.full_name ??
            "Unknown",
          screeningId:
            item.screeningId ??
            item.screening_id ??
            item.clientId ??
            item.client?.client_id ??
            "—",
          screeningType: item.screeningType ?? item.screening_type ?? "General Screening",
          status: item.status ?? "Pending",
          facility:
            item.facility?.facilityName ??
            item.facility?.facility_name ??
            item.facilityName ??
            item.facility_name ??
            item.facility ??
            "—",
          date: item.visitDate ?? item.visit_date ?? item.date ?? new Date().toISOString(),
        })
      );

      setActivities(mappedActivities);
      setTotalResults(total);
    } catch (err: any) {
      console.error("Error fetching activities:", err);
      toast.error("Unable to load recent activities");
    } finally {
      setLoading(false);
    }
  }

  // Clear filters
  function clearFilters() {
    setSelectedFacility("all");
    setDateFrom("");
    setDateTo("");
    setFiltersApplied(false);
    setPage(1);
  }

  // Auto-apply filters when they change
  useEffect(() => {
    if (!hasNationalAccess) return;
    
    // Update filters applied status
    const hasActiveFilters = 
      selectedFacility !== "all" || dateFrom !== "" || dateTo !== "";
    setFiltersApplied(hasActiveFilters);
    
    // Reset to first page when filters change
    setPage(1);
    
    // Fetch data with new filters
    fetchDashboardData();
    fetchRecentActivity();
  }, [selectedFacility, dateFrom, dateTo]);

  useEffect(() => {
    if (hasNationalAccess) {
      fetchFacilities();
    }
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchRecentActivity();
  }, [page]);

  function onPageChange(p: number) {
    setPage(p);
  }

  // Navigation handlers for clickable cards
  function handleAllClientsClick() {
    router.push("/ncsr/clients");
  }

  function handleScreeningsThisMonthClick() {
    router.push("/ncsr/visits?filter=this_month");
  }

  function handlePendingFollowUpsClick() {
    router.push("/ncsr/visits?filter=pending_followups");
  }

  function handleReferralAlertsClick() {
    router.push("/ncsr/referrals");
  }

  function handleCervicalScreeningsClick() {
    router.push("/ncsr/screenings?type=cervical");
  }

  function handleBreastScreeningsClick() {
    router.push("/ncsr/screenings?type=breast");
  }

  function handleProstateScreeningsClick() {
    router.push("/ncsr/screenings?type=prostate");
  }

  function handleColorectalScreeningsClick() {
    router.push("/ncsr/screenings?type=colorectal");
  }

  function handleLiverScreeningsClick() {
    router.push("/ncsr/screenings?type=liver");
  }

  function handlePositiveFindingsClick() {
    router.push("/ncsr/positive-findings");
  }

  function getBadgeType(status: ScreeningActivity["status"]) {
    switch (status) {
      case "Completed":
        return "success";
      case "Pending":
        return "warning";
      case "Referred":
        return "danger";
      case "Follow-up":
        return "primary";
      default:
        return "neutral";
    }
  }


  function handleTotalReferredClick() {
  router.push("/ncsr/referred");
}

  if (loading && activities.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Loading dashboard...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <PageTitle>National Cancer Screening Register Dashboard</PageTitle>

        <div className="mt-4 rounded-2xl bg-gradient-to-r from-green-800 via-green-700 to-green-600 text-white shadow-lg p-4 sm:p-6 md:p-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <p className="inline-flex items-center px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase rounded-full bg-white/15">
                {hasNationalAccess && (
                  <Globe className="w-3 h-3 mr-1.5" />
                )}
                {hasNationalAccess ? "National program overview" : "Facility overview"}
              </p>
              
              {filtersApplied && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white/20 rounded-full">
                  Filtered
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold leading-tight">
              Monitor screening activity, referrals, and follow-up outcomes
              {hasNationalAccess ? " across facilities" : ""}
            </h2>

            <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
              Track client registration, screening module performance, referral
              completion, and recent activity from{" "}
              {hasNationalAccess ? "one central operational dashboard" : "your facility dashboard"}.
            </p>
          </div>
        </div>

        {/* Filters Section - Only for National Users */}
        {hasNationalAccess && (
          <div className="mt-4">
           <div className="flex items-center gap-3">
  <button
    onClick={() => setShowFilters(!showFilters)}
    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
  >
    <Filter className="w-4 h-4" />
    <span className="font-medium">Filters</span>
    {filtersApplied && (
      <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
        Active
      </span>
    )}
  </button>

  {/* <Button
    className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
    // onClick={openModal}
  >
    <span className="inline-flex items-center gap-2">
      <Plus className="w-4 h-4" />
      Add Client
    </span>
  </Button> */}

  <Link
                          href={`/ncsr/screening-wizard`}
                        >
                          <Button layout="outline" className="text-white rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800">
                            <span className="inline-flex items-center gap-2">
                              <StethoscopeIcon className="w-4 h-4" />
                              New Screening
                            </span>
                          </Button>
                        </Link>

  {facilitySupportsStage("stage2") && (
  <Link
                          href={`/ncsr/clinical-screening`}
                        >
                          <Button layout="outline" className="text-green-700 dark:text-green-400 rounded-2xl h-12 border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                            <span className="inline-flex items-center gap-2">
                              <ClipboardCheck className="w-4 h-4" />
                              Stage 2: Clinical Screening
                            </span>
                          </Button>
                        </Link>
  )}

  {facilitySupportsStage("stage3") && (
  <Link
                          href={`/ncsr/diagnostic-evaluation`}
                        >
                          <Button layout="outline" className="text-teal-700 dark:text-teal-400 rounded-2xl h-12 border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20">
                            <span className="inline-flex items-center gap-2">
                              <Microscope className="w-4 h-4" />
                              Stage 3: Diagnostic Evaluation
                            </span>
                          </Button>
                        </Link>
  )}

</div>

            {showFilters && (
              <div className="mt-4 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Filter Dashboard Data
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Facility Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Facility
                    </label>
                    <select
                      value={selectedFacility}
                      onChange={(e) => setSelectedFacility(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="all">All Facilities</option>
                      {facilities.map((facility) => (
                        <option key={facility.facilityId} value={facility.facilityId}>
                          {facility.facilityName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date From */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Clear Filters Button and Help Text */}
                {filtersApplied ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                      <X className="w-4 h-4" />
                      Clear All Filters
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Filters are applied automatically
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Select filters above - they will be applied automatically
                  </p>
                )}
              </div>
            )}
          </div>
        )}

     
      </div>

      {/* Quick action cards — shown for any non-national-scoped user;
          for Feeder-only facility_only users these REPLACE the stats
          grid below rather than sitting alongside it. */}
      {showActionCards && (
        <div className="mb-6 sm:mb-8">
          {isFeederOnlyUser && <PageTitle>Quick Actions</PageTitle>}
          <div className="grid gap-4 sm:gap-5 mt-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {facilitySupportsStage("stage2") && (
            <Link href="/ncsr/clinical-screening?new=1">
              <div className="cursor-pointer rounded-2xl bg-green-700 hover:bg-green-800 transition-colors p-6 text-white shadow-sm h-full">
                <UserPlus className="w-6 h-6 mb-3" />
                <p className="font-semibold">Register & Screen New Client</p>
                <p className="text-xs text-green-100 mt-1">Start Stage 2 biodata + screening</p>
              </div>
            </Link>
            )}
            {facilitySupportsStage("stage2") && (
            <Link href="/ncsr/clinical-screening">
              <div className="cursor-pointer rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors p-6 shadow-sm h-full">
                <ClipboardCheck className="w-6 h-6 mb-3 text-green-700" />
                <p className="font-semibold text-gray-800 dark:text-white">Stage 2: Clinical Screening</p>
                <p className="text-xs text-gray-500 mt-1">Find an existing client to screen</p>
              </div>
            </Link>
            )}
            {facilitySupportsStage("stage3") && (
            <Link href="/ncsr/diagnostic-evaluation">
              <div className="cursor-pointer rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors p-6 shadow-sm h-full">
                <Microscope className="w-6 h-6 mb-3 text-teal-700" />
                <p className="font-semibold text-gray-800 dark:text-white">Stage 3: Diagnostic Evaluation</p>
                <p className="text-xs text-gray-500 mt-1">For facilities configured for Stage 3</p>
              </div>
            </Link>
            )}
            {facilitySupportsStage("stage4") && (
            <Link href="/ncsr/treatment-plan">
              <div className="cursor-pointer rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors p-6 shadow-sm h-full">
                <HeartHandshake className="w-6 h-6 mb-3 text-purple-700" />
                <p className="font-semibold text-gray-800 dark:text-white">Stage 4: Treatment & Care</p>
                <p className="text-xs text-gray-500 mt-1">For facilities configured for Stage 4</p>
              </div>
            </Link>
            )}
            <Link href="/ncsr/referred">
              <div className="cursor-pointer rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors p-6 shadow-sm h-full">
                <ArrowUpRight className="w-6 h-6 mb-3 text-blue-700" />
                <p className="font-semibold text-gray-800 dark:text-white">Linked Clients</p>
                <p className="text-xs text-gray-500 mt-1">Clients referred to your facility</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {showStatsCards && (
        <>
      {/* Rest of the dashboard remains the same - Stats cards, Module cards, Charts, etc. */}
      <div className="grid gap-4 sm:gap-5 mb-6 sm:mb-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Total Registered Clients"
          value={stats.totalClients.toLocaleString()}
          note="Click to view all clients"
          icon={
            <Users className="w-5 h-5 text-green-700 dark:text-green-100" />
          }
          iconWrapperClass="bg-green-100 dark:bg-green-700"
          onClick={handleAllClientsClick}
          clickable
        />

        <StatCard
          title="Screenings This Month"
          value={stats.screeningsThisMonth.toLocaleString()}
          note="Click to view this month's visits"
          icon={
            <Stethoscope className="w-5 h-5 text-emerald-700 dark:text-emerald-100" />
          }
          iconWrapperClass="bg-emerald-100 dark:bg-emerald-700"
          onClick={handleScreeningsThisMonthClick}
          clickable
        />

        <StatCard
          title="Pending Follow-ups"
          value={stats.pendingFollowUps.toLocaleString()}
          note="Click to view pending cases"
          icon={
            <ClipboardList className="w-5 h-5 text-amber-700 dark:text-amber-100" />
          }
          iconWrapperClass="bg-amber-100 dark:bg-amber-600"
          onClick={handlePendingFollowUpsClick}
          clickable
        />

        <StatCard
          title="Referral Alerts"
          value={stats.referralAlerts.toLocaleString()}
          note="Click to view urgent cases"
          icon={
            <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-100" />
          }
          iconWrapperClass="bg-red-100 dark:bg-red-600"
          onClick={handleReferralAlertsClick}
          clickable
        />

        <StatCard
  title="Total Clients Referred"
  value={stats.totalReferred.toLocaleString()}
  note="Click to view all referrals"
  icon={
    <ArrowUpRight className="w-5 h-5 text-blue-700 dark:text-blue-100" />
  }
  iconWrapperClass="bg-blue-100 dark:bg-blue-700"
  onClick={handleTotalReferredClick}
  clickable
/>

        <StatCard
          title="Active Treatment Plans"
          value={stats.activeTreatmentPlans.toLocaleString()}
          note="Click to view treatment tracking"
          icon={
            <HeartHandshake className="w-5 h-5 text-purple-700 dark:text-purple-100" />
          }
          iconWrapperClass="bg-purple-100 dark:bg-purple-700"
          onClick={() => router.push("/ncsr/treatments")}
          clickable
        />
      </div>

      {/* Module Cards Grid */}
      <div className="grid gap-4 sm:gap-5 mb-6 sm:mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ModuleCard
          title="Cervical Screening"
          value={stats.cervicalScreenings.toLocaleString()}
          note="View all cervical screenings"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
          onClick={handleCervicalScreeningsClick}
        />
        <ModuleCard
          title="Breast Screening"
          value={stats.breastScreenings.toLocaleString()}
          note="View all breast screenings"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
          onClick={handleBreastScreeningsClick}
        />
        <ModuleCard
          title="Prostate Screening"
          value={stats.prostateScreenings.toLocaleString()}
          note="View all prostate screenings"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
          onClick={handleProstateScreeningsClick}
        />
        <ModuleCard
          title="Colorectal Screening"
          value={stats.colorectalScreenings.toLocaleString()}
          note="View all colorectal screenings"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
          onClick={handleColorectalScreeningsClick}
        />
        <ModuleCard
          title="Liver Screening"
          value={stats.liverScreenings.toLocaleString()}
          note="View all liver screenings"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
          onClick={handleLiverScreeningsClick}
        />
        <ModuleCard
          title="Positive Findings"
          value={stats.positiveFindings.toLocaleString()}
          note="View confirmed cases"
          noteColor="text-red-500"
          icon={<Activity className="w-4 h-4 text-red-500" />}
          onClick={handlePositiveFindingsClick}
        />
      </div>
        </>
      )}

      {/* Recent Activity section - same as before */}
      <div className="mb-6 sm:mb-8">
        <PageTitle>Recent Screening Activity</PageTitle>

        {loading ? (
          <div className="mt-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Loading activities...
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No recent activity
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Activities will appear here once visits are recorded.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {activities
                .slice((page - 1) * resultsPerPage, page * resultsPerPage)
                .map((item, i) => (
                  <ActivityCard
                    key={item.visitId || i}
                    item={item}
                    getBadgeType={getBadgeType}
                  />
                ))}
            </div>

            {/* Desktop table */}
            <div className="rounded-2xl overflow-hidden shadow-sm">
              <div className="hidden lg:block">
                <TableContainer>
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell>Client</TableCell>
                        <TableCell>Client ID</TableCell>
                        <TableCell>Screening Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Facility</TableCell>
                        <TableCell>Date</TableCell>
                      </tr>
                    </TableHeader>

                    <TableBody>
                      {activities
                        .slice(
                          (page - 1) * resultsPerPage,
                          page * resultsPerPage
                        )
                        .map((item, i) => (
                          <TableRow key={item.visitId || i}>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-semibold break-words">
                                  {item.clientName}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 break-words">
                                {item.screeningId}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="text-sm break-words">
                                {item.screeningType}
                              </span>
                            </TableCell>

                            <TableCell>
                              <Badge type={getBadgeType(item.status) as any}>
                                {item.status}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <span className="text-sm break-words">
                                {item.facility}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="text-sm whitespace-nowrap">
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>

              {totalResults > resultsPerPage && (
                <div className="mt-6">
                  <Pagination
                    totalResults={totalResults}
                    resultsPerPage={resultsPerPage}
                    label="Table navigation"
                    onChange={onPageChange}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dense analytics moved to a dedicated page to keep this view focused
          on high-priority actions (patient lists, recent activity). */}
      <Link href="/ncsr/analytics">
        <div className="mb-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:shadow-lg hover:border-green-300 dark:hover:border-green-600 transition-all">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                Analytics &amp; Trends
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Screening distribution by module and monthly trend charts
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
        </div>
      </Link>
    </Layout>
  );
}

export default Dashboard;