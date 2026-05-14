import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Doughnut, Line } from "react-chartjs-2";
import Link from "next/link";
import toast from "react-hot-toast";

import ChartCard from "../components/Chart/ChartCard";
import ChartLegend from "../components/Chart/ChartLegend";
import PageTitle from "../components/Typography/PageTitle";
import Layout from "../containers/Layout";
import api from "../../lib/api";

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
} from "@roketid/windmill-react-ui";

import {
  Chart,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

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
};

type MonthlyTrendData = {
  month: string;
  screenings: number;
  referrals: number;
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

  Chart.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

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
  });
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendData[]>([]);
  const [activities, setActivities] = useState<ScreeningActivity[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const resultsPerPage = 6;

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const statsResponse = await api.get("/dashboard/stats");
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
      });
    } catch (err: any) {
      console.error("Error fetching stats:", err);
      toast.error("Unable to load dashboard statistics");
    }
  }

  async function fetchMonthlyTrend() {
    try {
      const trendResponse = await api.get("/dashboard/monthly-trends");
      const trendData = trendResponse.data?.data || trendResponse.data?.trend || [];

      const mappedTrend: MonthlyTrendData[] = trendData.map((item: any) => ({
        month: item.month,
        screenings: item.screenings ?? item.total_screenings ?? 0,
        referrals: item.referrals ?? item.total_referrals ?? 0,
      }));

      setMonthlyTrend(mappedTrend);
    } catch (err: any) {
      console.error("Error fetching monthly trend:", err);
      // Don't show error toast for this - it's not critical
    }
  }

  async function fetchRecentActivity() {
    try {
      const activitiesResponse = await api.get("/dashboard/recent-activity", {
        params: { page, limit: resultsPerPage },
      });

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
            item.client?.clientId ??
            item.client?.client_id ??
            "—",
          screeningType: item.screeningType ?? item.screening_type ?? "General Screening",
          status: item.status ?? "Pending",
          facility:
            item.facility?.facilityName ??
            item.facility?.facility_name ??
            item.facilityName ??
            item.facility_name ??
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

  useEffect(() => {
    fetchDashboardData();
    fetchMonthlyTrend();
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

  const screeningDistributionData = {
    data: {
      datasets: [
        {
          data: [
            stats.cervicalScreenings,
            stats.breastScreenings,
            stats.prostateScreenings,
            stats.colorectalScreenings,
            stats.liverScreenings,
          ],
          backgroundColor: [
            "#15803d",
            "#22c55e",
            "#86efac",
            "#65a30d",
            "#0f766e",
          ],
          borderWidth: 0,
        },
      ],
      labels: ["Cervical", "Breast", "Prostate", "Colorectal", "Liver"],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  };

  // Use dynamic data from backend or fallback to empty arrays
  const monthlyTrendData = {
    data: {
      labels: monthlyTrend.length > 0 
        ? monthlyTrend.map(item => item.month)
        : ["No Data"],
      datasets: [
        {
          label: "Screenings",
          backgroundColor: "rgba(21, 128, 61, 0.15)",
          borderColor: "#15803d",
          data: monthlyTrend.length > 0
            ? monthlyTrend.map(item => item.screenings)
            : [0],
          fill: true,
          tension: 0.35,
        },
        {
          label: "Referrals",
          backgroundColor: "rgba(217, 119, 6, 0.12)",
          borderColor: "#d97706",
          data: monthlyTrend.length > 0
            ? monthlyTrend.map(item => item.referrals)
            : [0],
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0,0,0,0.05)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  };

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
            <p className="inline-flex items-center px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase rounded-full bg-white/15 mb-3">
              National program overview
            </p>

            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold leading-tight">
              Monitor screening activity, referrals, and follow-up outcomes
              across facilities
            </h2>

            <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
              Track client registration, screening module performance, referral
              completion, and recent activity from one central operational
              dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 mb-6 sm:mb-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>

      {/* Updated Module Cards Grid - Now shows all 5 screening types plus positive findings */}
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

      {/* Recent Activity section */}
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

      <PageTitle>Analytics & Trends</PageTitle>

      <div className="grid grid-cols-1 gap-6 mb-8 xl:grid-cols-2">
        <div className="min-w-0">
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
              Screening Distribution by Module
            </h2>

            <div className="mt-4 min-w-0 w-full overflow-hidden">
              <div className="relative w-full h-[260px] sm:h-[320px] lg:h-[360px] xl:h-[320px]">
                <Doughnut
                  data={screeningDistributionData.data}
                  options={screeningDistributionData.options as any}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {[
                ["Cervical", "bg-green-700"],
                ["Breast", "bg-green-500"],
                ["Prostate", "bg-green-300"],
                ["Colorectal", "bg-lime-600"],
                ["Liver", "bg-teal-700"],
              ].map(([label, color]) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200"
                >
                  <span className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
              Monthly Screening and Referral Trend
            </h2>

            {monthlyTrend.length > 0 ? (
              <>
                <div className="mt-4 min-w-0 w-full overflow-hidden">
                  <div className="relative w-full h-[260px] sm:h-[320px] lg:h-[360px] xl:h-[320px]">
                    <Line
                      data={monthlyTrendData.data}
                      options={monthlyTrendData.options as any}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {[
                    ["Screenings", "bg-green-700"],
                    ["Referrals", "bg-amber-500"],
                  ].map(([label, color]) => (
                    <div
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200"
                    >
                      <span className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="whitespace-nowrap">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 flex items-center justify-center h-[260px] sm:h-[320px] lg:h-[360px] xl:h-[320px]">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    No trend data available yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Data will appear as screenings are recorded
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;