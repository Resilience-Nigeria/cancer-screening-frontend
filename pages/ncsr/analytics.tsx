"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Activity,
  ArrowLeft,
  Baby,
  Users,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Filter,
  X,
  Download,
  User,
  Calendar,
  ShieldCheck,
  HeartPulse,
  GitBranch,
  Clock,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";

import PageTitle from "../components/Typography/PageTitle";
import Layout from "../containers/Layout";
import api from "../../lib/api";
import { getUser } from "../../lib/auth";

Chart.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DistributionStats = {
  cervicalScreenings: number;
  breastScreenings: number;
  prostateScreenings: number;
  colorectalScreenings: number;
  liverScreenings: number;
};

type MonthlyTrendData = { month: string; screenings: number; referrals: number };

type AgeGroup = {
  label: string;
  description: string;
  total: number;
  cancerTypes: { [key: string]: number };
  genderBreakdown: { male: number; female: number; other: number };
  stageBreakdown: { [key: string]: number };
};

type CancerAnalyticsData = {
  ageGroups: { [key: string]: AgeGroup };
  cancerTypeStats: { [key: string]: number };
  totalCases: number;
  summary: {
    mostAffectedAgeGroup: { ageGroup: string; label: string; total: number } | null;
    topCancerTypes: { [key: string]: number };
  };
};

type GenderAgeGroup = { label: string; male: number; female: number; other: number };

type OutcomeStatistics = {
  total_outcomes: number;
  positive_screening: number;
  negative_screening: number;
  inconclusive_screening: number;
  in_treatment: number;
  treatment_completed: number;
  treatment_discontinued: number;
  follow_up_required: number;
  complete_remission: number;
  partial_remission: number;
  stable_disease: number;
  progressive_disease: number;
  recurrence: number;
  death: number;
};

type Stage2Distribution = {
  normal: number;
  low_suspicion: number;
  suspicious: number;
  urgent_referral: number;
};

type Facility = { facilityId: string; facilityName: string };

type FacilityPerformanceRow = {
  facilityId: string;
  facilityName: string;
  screeningsCount: number;
  referralsCount: number;
  flaggedCount: number;
};

type FunnelStage = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

type TimingMetrics = {
  registrationToScreeningDays: number;
  registrationToReferralDays: number;
  diagnosisToTreatmentDays: number;
};

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{title}</h3>
      {children}
    </div>
  );
}

function StatBlock({
  icon,
  iconWrapperClass,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconWrapperClass: string;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconWrapperClass}`}>{icon}</div>
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const currentUser = getUser();
  const userRole = currentUser?.user_role?.roleName || currentUser?.role;
  // Backend-computed from the role's configured dataScopeType — not a
  // hardcoded role list, so this stays correct if scope is reconfigured
  // via the Roles admin page without needing a frontend redeploy.
  const hasNationalAccess = currentUser?.hasNationalAccess ?? ["NICRAT_SUPER_ADMIN", "NICRAT_ADMIN", "PARTNER"].includes(userRole);

  const [loading, setLoading] = useState(true);

  // Filters (shared across sections that support them)
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Screening distribution + monthly trend
  const [stats, setStats] = useState<DistributionStats>({
    cervicalScreenings: 0, breastScreenings: 0, prostateScreenings: 0,
    colorectalScreenings: 0, liverScreenings: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendData[]>([]);

  // Cancer by age
  const [ageData, setAgeData] = useState<CancerAnalyticsData | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);

  // Gender-age comparison
  const [genderAgeData, setGenderAgeData] = useState<Record<string, GenderAgeGroup>>({});

  // Treatment/clinical outcome statistics
  const [outcomeStats, setOutcomeStats] = useState<OutcomeStatistics | null>(null);

  // Stage 2 outcome distribution
  const [stage2Dist, setStage2Dist] = useState<Stage2Distribution | null>(null);

  // Stage 4 treatment analytics
  const [treatmentAnalytics, setTreatmentAnalytics] = useState<{
    activePlans: number; closedPlans: number;
    outcomeDistribution: Record<string, number>;
    modalityUsage: Record<string, number>;
  } | null>(null);

  // Facility performance, referral funnel, timing metrics
  const [facilityPerformance, setFacilityPerformance] = useState<FacilityPerformanceRow[]>([]);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [timingMetrics, setTimingMetrics] = useState<TimingMetrics | null>(null);

  const filterParams: any = {};
  if (hasNationalAccess) {
    if (selectedFacility !== "all") filterParams.facilityId = selectedFacility;
    if (dateFrom) filterParams.dateFrom = dateFrom;
    if (dateTo) filterParams.dateTo = dateTo;
  }

  useEffect(() => {
    if (hasNationalAccess) fetchFacilities();
    fetchAll();
  }, []);

  async function fetchFacilities() {
    try {
      const { data } = await api.get("/facilities");
      if (data.status) setFacilities(data.facilities || data.data || []);
    } catch {}
  }

  async function fetchAll() {
    setLoading(true);
    await Promise.all([
      fetchDistributionAndTrend(),
      fetchCancerByAge(),
      fetchGenderAgeComparison(),
      fetchOutcomeStatistics(),
      fetchStage2Outcomes(),
      fetchTreatmentAnalytics(),
      fetchFacilityPerformance(),
      fetchReferralFunnel(),
      fetchTimingMetrics(),
    ]);
    setLoading(false);
  }

  async function fetchDistributionAndTrend() {
    try {
      const [statsRes, trendRes] = await Promise.all([
        api.get("/dashboard/stats", { params: filterParams }),
        api.get("/dashboard/monthly-trends", { params: filterParams }),
      ]);
      const statsData = statsRes.data?.stats || statsRes.data || {};
      setStats({
        cervicalScreenings: statsData.cervicalScreenings ?? statsData.cervical_screenings ?? 0,
        breastScreenings: statsData.breastScreenings ?? statsData.breast_screenings ?? 0,
        prostateScreenings: statsData.prostateScreenings ?? statsData.prostate_screenings ?? 0,
        colorectalScreenings: statsData.colorectalScreenings ?? statsData.colorectal_screenings ?? 0,
        liverScreenings: statsData.liverScreenings ?? statsData.liver_screenings ?? 0,
      });
      const trendData = trendRes.data?.data || trendRes.data?.trend || [];
      setMonthlyTrend(
        trendData.map((item: any) => ({
          month: item.month,
          screenings: item.screenings ?? item.total_screenings ?? 0,
          referrals: item.referrals ?? item.total_referrals ?? 0,
        }))
      );
    } catch (err) {
      console.error("Error fetching distribution/trend:", err);
    }
  }

  async function fetchCancerByAge() {
    try {
      const { data: response } = await api.get("/analytics/cancer-by-age", { params: filterParams });
      if (response.status) setAgeData(response.data);
    } catch (err) {
      console.error("Error fetching cancer-by-age:", err);
    }
  }

  async function fetchGenderAgeComparison() {
    try {
      const { data: response } = await api.get("/analytics/gender-age-comparison");
      if (response.status) setGenderAgeData(response.data || {});
    } catch (err) {
      console.error("Error fetching gender-age comparison:", err);
    }
  }

  async function fetchOutcomeStatistics() {
    try {
      const { data } = await api.get("/outcomes/statistics");
      setOutcomeStats(data);
    } catch (err) {
      console.error("Error fetching outcome statistics:", err);
    }
  }

  async function fetchStage2Outcomes() {
    try {
      const { data: response } = await api.get("/analytics/stage2-outcomes", { params: filterParams });
      if (response.status) setStage2Dist(response.data.distribution);
    } catch (err) {
      console.error("Error fetching Stage 2 outcomes:", err);
    }
  }

  async function fetchTreatmentAnalytics() {
    try {
      const { data: response } = await api.get("/analytics/treatment", { params: filterParams });
      if (response.status) setTreatmentAnalytics(response.data);
    } catch (err) {
      console.error("Error fetching treatment analytics:", err);
    }
  }

  async function fetchFacilityPerformance() {
    try {
      const { data: response } = await api.get("/analytics/facility-performance", { params: filterParams });
      if (response.status) setFacilityPerformance(response.data || []);
    } catch (err) {
      console.error("Error fetching facility performance:", err);
    }
  }

  async function fetchReferralFunnel() {
    try {
      const { data: response } = await api.get("/analytics/referral-funnel", { params: filterParams });
      if (response.status) setFunnelStages(response.data || []);
    } catch (err) {
      console.error("Error fetching referral funnel:", err);
    }
  }

  async function fetchTimingMetrics() {
    try {
      const { data: response } = await api.get("/analytics/timing-metrics", { params: filterParams });
      if (response.status) setTimingMetrics(response.data);
    } catch (err) {
      console.error("Error fetching timing metrics:", err);
    }
  }

  function applyFilters() {
    setFiltersApplied(selectedFacility !== "all" || dateFrom !== "" || dateTo !== "");
    fetchAll();
    setShowFilters(false);
  }

  function clearFilters() {
    setSelectedFacility("all");
    setDateFrom("");
    setDateTo("");
    setFiltersApplied(false);
    fetchAll();
    setShowFilters(false);
  }

  function exportAgeDataCSV() {
    if (!ageData) return;
    let csv = "Age Group,Description,Total Cases,Cancer Type,Count\n";
    Object.values(ageData.ageGroups).forEach((group) => {
      Object.entries(group.cancerTypes).forEach(([cancerType, count]) => {
        csv += `"${group.label}","${group.description}",${group.total},"${cancerType}",${count}\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cancer-by-age-analytics-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Chart data
  const screeningDistributionData = {
    data: {
      datasets: [
        {
          data: [
            stats.cervicalScreenings, stats.breastScreenings, stats.prostateScreenings,
            stats.colorectalScreenings, stats.liverScreenings,
          ],
          backgroundColor: ["#15803d", "#22c55e", "#86efac", "#65a30d", "#0f766e"],
          borderWidth: 0,
        },
      ],
      labels: ["Cervical", "Breast", "Prostate", "Colorectal", "Liver"],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false } } },
  };

  const monthlyTrendData = {
    data: {
      labels: monthlyTrend.length > 0 ? monthlyTrend.map((i) => i.month) : ["No Data"],
      datasets: [
        {
          label: "Screenings",
          backgroundColor: "rgba(21, 128, 61, 0.15)",
          borderColor: "#15803d",
          data: monthlyTrend.length > 0 ? monthlyTrend.map((i) => i.screenings) : [0],
          fill: true, tension: 0.35,
        },
        {
          label: "Referrals",
          backgroundColor: "rgba(217, 119, 6, 0.12)",
          borderColor: "#d97706",
          data: monthlyTrend.length > 0 ? monthlyTrend.map((i) => i.referrals) : [0],
          fill: true, tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true }, x: { grid: { display: false } } },
    },
  };

  const ageGroupChartData = ageData ? {
    labels: Object.values(ageData.ageGroups).map((g) => g.label),
    datasets: [{
      label: "Total Cases",
      data: Object.values(ageData.ageGroups).map((g) => g.total),
      backgroundColor: ["#fbbf24", "#fb923c", "#f87171", "#ec4899", "#a855f7", "#8b5cf6", "#6366f1", "#3b82f6", "#059669"],
      borderWidth: 0,
    }],
  } : null;

  const topCancerTypesData = ageData?.summary.topCancerTypes ? {
    labels: Object.keys(ageData.summary.topCancerTypes),
    datasets: [{
      data: Object.values(ageData.summary.topCancerTypes),
      backgroundColor: ["#15803d", "#22c55e", "#86efac", "#65a30d", "#0f766e"],
      borderWidth: 0,
    }],
  } : null;

  const genderAgeChartData = Object.keys(genderAgeData).length > 0 ? {
    labels: Object.values(genderAgeData).map((g) => g.label),
    datasets: [
      { label: "Male", data: Object.values(genderAgeData).map((g) => g.male), backgroundColor: "#3b82f6" },
      { label: "Female", data: Object.values(genderAgeData).map((g) => g.female), backgroundColor: "#ec4899" },
    ],
  } : null;

  const stage2ChartData = stage2Dist ? {
    labels: ["Normal", "Low Suspicion", "Suspicious", "Urgent Referral"],
    datasets: [{
      data: [stage2Dist.normal, stage2Dist.low_suspicion, stage2Dist.suspicious, stage2Dist.urgent_referral],
      backgroundColor: ["#22c55e", "#f59e0b", "#fb923c", "#ef4444"],
      borderWidth: 0,
    }],
  } : null;

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: "65%",
    plugins: { legend: { position: "bottom" as const } },
  };

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  const groupedBarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link
          href="/ncsr/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="mt-3">
          <PageTitle>Analytics &amp; Trends</PageTitle>
          <p className="text-sm text-gray-500 mt-1">
            Screening activity, cancer case demographics, and outcome tracking across the program.
          </p>
        </div>
      </div>

      {hasNationalAccess && (
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
            >
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filters</span>
              {filtersApplied && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">Active</span>
              )}
            </button>
            <button
              onClick={exportAgeDataCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="font-medium">Export Age Data CSV</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Analytics Data</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Facility</label>
                  <select
                    value={selectedFacility}
                    onChange={(e) => setSelectedFacility(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">All Facilities</option>
                    {facilities.map((f) => (
                      <option key={f.facilityId} value={f.facilityId}>{f.facilityName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">From Date</label>
                  <input
                    type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">To Date</label>
                  <input
                    type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={applyFilters} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold shadow-sm">
                  <Filter className="w-4 h-4" /> Apply Filters
                </button>
                {filtersApplied && (
                  <button onClick={clearFilters} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                    <X className="w-4 h-4" /> Clear Filters
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Facility/date filters apply to screening volumes, cancer-by-age, and Stage 2 outcomes.
                Gender-age comparison and treatment/clinical outcome statistics are program-wide totals.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Screening volume overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Screening Distribution by Module">
          {screeningDistributionData && (
            <div className="h-72">
              <Doughnut data={screeningDistributionData.data} options={screeningDistributionData.options as any} />
            </div>
          )}
        </SectionCard>
        <SectionCard title="Monthly Screening and Referral Trend">
          {monthlyTrend.length > 0 ? (
            <div className="h-72">
              <Line data={monthlyTrendData.data} options={monthlyTrendData.options as any} />
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-center">
              <div>
                <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No trend data available yet</p>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Stage 2 outcome distribution */}
      <div className="mb-8">
        <SectionCard title="Stage 2 (Clinical Screening) Outcome Distribution">
          {stage2ChartData && stage2Dist && Object.values(stage2Dist).some((v) => v > 0) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="h-72">
                <Doughnut data={stage2ChartData} options={doughnutOptions as any} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <span className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Normal</span>
                  <span className="text-sm font-bold text-green-800 dark:text-green-300">{stage2Dist.normal}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Low Suspicion</span>
                  <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{stage2Dist.low_suspicion}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">Suspicious</span>
                  <span className="text-sm font-bold text-orange-800 dark:text-orange-300">{stage2Dist.suspicious}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <span className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Urgent Referral</span>
                  <span className="text-sm font-bold text-red-800 dark:text-red-300">{stage2Dist.urgent_referral}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No Stage 2 outcomes classified yet.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Stage 4 treatment analytics */}
      <div className="mb-8">
        <SectionCard title="Stage 4 (Treatment & Care) Analytics">
          {treatmentAnalytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Treatment Outcomes ({treatmentAnalytics.activePlans} active · {treatmentAnalytics.closedPlans} closed)
                </p>
                {Object.keys(treatmentAnalytics.outcomeDistribution || {}).length === 0 ? (
                  <p className="text-sm text-gray-400">No treatment outcomes recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(treatmentAnalytics.outcomeDistribution).map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Modality Usage</p>
                {Object.keys(treatmentAnalytics.modalityUsage || {}).length === 0 ? (
                  <p className="text-sm text-gray-400">No treatment modalities recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(treatmentAnalytics.modalityUsage).map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <span className="text-sm font-medium text-purple-800 dark:text-purple-300 capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-sm font-bold text-purple-800 dark:text-purple-300">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No treatment plan data available yet.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Facility performance leaderboard */}
      {facilityPerformance.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-600 shadow">
              <Award className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Facility Performance</h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-left">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Facility</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Screenings</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Referrals</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Flagged (Suspicious/Urgent)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {facilityPerformance.map((row, i) => (
                    <tr key={row.facilityId} className={i === 0 ? "bg-teal-50/50 dark:bg-teal-900/10" : ""}>
                      <td className="px-6 py-3 font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        {i === 0 && <Award className="w-4 h-4 text-amber-500" />}
                        {row.facilityName}
                      </td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{row.screeningsCount}</td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{row.referralsCount}</td>
                      <td className="px-6 py-3">
                        {row.flaggedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-orange-700 dark:text-orange-400 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> {row.flaggedCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Referral / patient journey funnel */}
      {funnelStages.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shadow">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Patient Journey Funnel</h2>
          </div>
          <SectionCard title="Registered → Screened → Referred → Confirmed → Treated">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {funnelStages.map((stage, i) => (
                <div key={stage.key} className="relative">
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stage.count}</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{stage.label}</p>
                    {stage.conversionFromPrevious !== null && (
                      <p className="text-xs mt-2 font-semibold text-indigo-600 dark:text-indigo-400">
                        {stage.conversionFromPrevious}% conversion
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Timing metrics */}
      {timingMetrics && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-600 shadow">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Time-to-Milestone Metrics</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Baseline averages — review against NICRAT's protocol targets for what counts as timely vs. delayed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatBlock
              icon={<Clock className="w-6 h-6 text-cyan-600" />}
              iconWrapperClass="bg-cyan-100 dark:bg-cyan-900/30"
              value={`${timingMetrics.registrationToScreeningDays}d`}
              label="Avg. Registration → Screening"
            />
            <StatBlock
              icon={<Clock className="w-6 h-6 text-indigo-600" />}
              iconWrapperClass="bg-indigo-100 dark:bg-indigo-900/30"
              value={`${timingMetrics.registrationToReferralDays}d`}
              label="Avg. Registration → Referral"
            />
            <StatBlock
              icon={<Clock className="w-6 h-6 text-red-600" />}
              iconWrapperClass="bg-red-100 dark:bg-red-900/30"
              value={`${timingMetrics.diagnosisToTreatmentDays}d`}
              label="Avg. Diagnosis → Treatment"
            />
          </div>
        </div>
      )}

      {/* Treatment / clinical outcome statistics */}
      {outcomeStats && outcomeStats.total_outcomes > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Treatment &amp; Clinical Outcomes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatBlock icon={<Activity className="w-6 h-6 text-green-600" />} iconWrapperClass="bg-green-100 dark:bg-green-900/30" value={outcomeStats.positive_screening} label="Positive Screening" />
            <StatBlock icon={<ShieldCheck className="w-6 h-6 text-gray-600" />} iconWrapperClass="bg-gray-100 dark:bg-gray-700" value={outcomeStats.negative_screening} label="Negative Screening" />
            <StatBlock icon={<AlertCircle className="w-6 h-6 text-amber-600" />} iconWrapperClass="bg-amber-100 dark:bg-amber-900/30" value={outcomeStats.inconclusive_screening} label="Inconclusive" />
            <StatBlock icon={<HeartPulse className="w-6 h-6 text-blue-600" />} iconWrapperClass="bg-blue-100 dark:bg-blue-900/30" value={outcomeStats.in_treatment} label="In Treatment" />
            <StatBlock icon={<ShieldCheck className="w-6 h-6 text-green-600" />} iconWrapperClass="bg-green-100 dark:bg-green-900/30" value={outcomeStats.treatment_completed} label="Treatment Completed" />
            <StatBlock icon={<X className="w-6 h-6 text-red-600" />} iconWrapperClass="bg-red-100 dark:bg-red-900/30" value={outcomeStats.treatment_discontinued} label="Treatment Discontinued" />
            <StatBlock icon={<AlertTriangle className="w-6 h-6 text-orange-600" />} iconWrapperClass="bg-orange-100 dark:bg-orange-900/30" value={outcomeStats.follow_up_required} label="Follow-up Required" />
            <StatBlock icon={<ShieldCheck className="w-6 h-6 text-green-600" />} iconWrapperClass="bg-green-100 dark:bg-green-900/30" value={outcomeStats.complete_remission} label="Complete Remission" />
            <StatBlock icon={<Activity className="w-6 h-6 text-lime-600" />} iconWrapperClass="bg-lime-100 dark:bg-lime-900/30" value={outcomeStats.partial_remission} label="Partial Remission" />
            <StatBlock icon={<Activity className="w-6 h-6 text-amber-600" />} iconWrapperClass="bg-amber-100 dark:bg-amber-900/30" value={outcomeStats.stable_disease} label="Stable Disease" />
            <StatBlock icon={<AlertTriangle className="w-6 h-6 text-orange-600" />} iconWrapperClass="bg-orange-100 dark:bg-orange-900/30" value={outcomeStats.progressive_disease} label="Progressive Disease" />
            <StatBlock icon={<AlertTriangle className="w-6 h-6 text-red-600" />} iconWrapperClass="bg-red-100 dark:bg-red-900/30" value={outcomeStats.recurrence} label="Recurrence" />
          </div>
        </div>
      )}

      {/* Cancer by age */}
      {ageData && (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-600 shadow">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cancer Types by Age Classification</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <StatBlock icon={<Activity className="w-6 h-6 text-green-600" />} iconWrapperClass="bg-green-100 dark:bg-green-900/30" value={ageData.totalCases} label="Total Cancer Cases" />
              <StatBlock icon={<Users className="w-6 h-6 text-purple-600" />} iconWrapperClass="bg-purple-100 dark:bg-purple-900/30" value={Object.keys(ageData.ageGroups).length} label="Age Groups Affected" />
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                    <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{ageData.summary.mostAffectedAgeGroup?.label || "N/A"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ageData.summary.mostAffectedAgeGroup?.total || 0} cases</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Most Affected Age Group</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Cancer Cases by Age Classification">
                {ageGroupChartData && <div className="h-80"><Bar data={ageGroupChartData} options={barOptions as any} /></div>}
              </SectionCard>
              <SectionCard title="Top 5 Cancer Types Overall">
                {topCancerTypesData && (
                  <div className="h-80 flex items-center justify-center">
                    <div className="w-full max-w-sm"><Doughnut data={topCancerTypesData} options={doughnutOptions as any} /></div>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>

          {genderAgeChartData && (
            <div className="mb-8">
              <SectionCard title="Gender Comparison Across Age Groups (Positive Cases)">
                <div className="h-80"><Bar data={genderAgeChartData} options={groupedBarOptions as any} /></div>
              </SectionCard>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Detailed Breakdown by Age Group</h2>
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(ageData.ageGroups).map(([key, group]) => (
                <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    onClick={() => setSelectedAgeGroup(selectedAgeGroup === key ? null : key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                          <Baby className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{group.label}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{group.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{group.total}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ageData.totalCases > 0 ? ((group.total / ageData.totalCases) * 100).toFixed(1) : 0}% of total
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedAgeGroup === key && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Cancer Types Distribution
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(group.cancerTypes).map(([type, count]) => (
                              <div key={type} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{type}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({group.total > 0 ? ((count / group.total) * 100).toFixed(1) : 0}%)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" /> Gender Distribution
                          </h4>
                          <div className="space-y-2 mb-6">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Male</span>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {group.genderBreakdown.male} ({group.total > 0 ? ((group.genderBreakdown.male / group.total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Female</span>
                              <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                                {group.genderBreakdown.female} ({group.total > 0 ? ((group.genderBreakdown.female / group.total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                          </div>

                          {Object.keys(group.stageBreakdown).length > 0 && (
                            <>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Cancer Stage Distribution
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(group.stageBreakdown).map(([stage, count]) => (
                                  <div key={stage} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stage {stage}</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {ageData.totalCases === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Cancer Cases Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No positive cancer cases with age data available for analysis.</p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
