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
  FlaskConical,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";

import PageTitle from "../components/Typography/PageTitle";
import Layout from "../containers/Layout";
import api from "../../lib/api";
import { getUser } from "../../lib/auth";
import { findTest, cancerName } from "../../lib/screeningTests";
import OutcomeClientsModal from "../../components/OutcomeClientsModal";

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

type FindingRow = {
  cancerType: string;
  screened: number;
  suspicious: number;
  non_suspicious: number;
  inconclusive: number;
  awaiting: number;
  no_result: number;
};

type LabTestRow = {
  testType: string;
  cancerType: string;
  total: number;
  awaiting: number;
  overdue: number;
  suspicious: number;
  non_suspicious: number;
  inconclusive: number;
  avgTurnaroundDays: number | null;
};

type LabAnalytics = {
  byCancerType: FindingRow[];
  tests: LabTestRow[];
  totals: { samples: number; released: number; awaiting: number; overdue: number; avgTurnaroundDays: number | null };
};

const FINDING_KEYS: { key: keyof FindingRow; label: string; color: string }[] = [
  { key: "suspicious", label: "Suspicious", color: "#ef4444" },
  { key: "non_suspicious", label: "Non-suspicious", color: "#22c55e" },
  { key: "inconclusive", label: "Inconclusive", color: "#f59e0b" },
  { key: "awaiting", label: "Awaiting lab result", color: "#3b82f6" },
  { key: "no_result", label: "No result recorded", color: "#9ca3af" },
];

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
  unknownAge?: number;
  basis?: AgeBasis;
  summary: {
    mostAffectedAgeGroup: { ageGroup: string; label: string; total: number } | null;
    topCancerTypes: { [key: string]: number };
  };
};

type GenderAgeGroup = { label: string; male: number; female: number; other: number };

type OutcomeStatistics = {
  total_outcomes: number;
  cancer_confirmed?: number;
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
  inconclusive?: number;
  awaiting?: number;
  not_recorded?: number;
};

type Stage2Summary = {
  distribution: Stage2Distribution;
  total: number;
  suspiciousTotal: number;
  suspiciousNoOutcome: number;
  suspiciousReferred: number;
  suspiciousNotReferred: number;
};

const STAGE2_ROWS: { key: keyof Stage2Distribution; label: string; color: string; box: string; link?: Record<string, string> }[] = [
  { key: "urgent_referral", label: "Urgent referral", color: "#ef4444", box: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300" },
  { key: "suspicious", label: "Suspicious", color: "#fb923c", box: "bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300", link: { result: "suspicious" } },
  { key: "low_suspicion", label: "Low suspicion", color: "#f59e0b", box: "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" },
  { key: "normal", label: "Normal / non-suspicious", color: "#22c55e", box: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300", link: { result: "non_suspicious" } },
  { key: "inconclusive", label: "Inconclusive (lab)", color: "#a855f7", box: "bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" },
  { key: "awaiting", label: "Awaiting lab result", color: "#3b82f6", box: "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", link: { lab: "pending" } },
  { key: "not_recorded", label: "No result recorded", color: "#9ca3af", box: "bg-gray-50 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300" },
];

type Facility = { facilityId: string; facilityName: string };

type FacilityPerformanceRow = {
  facilityId: string;
  facilityName: string;
  screened: number;
  suspicious: number;
  suspiciousRate: number;
  referred: number;
  awaiting: number;
  overdue: number;
};

type FunnelStage = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

type TimingMetric = { key: string; label: string; avg: number | null; median: number | null; count: number; skipped: number };
type TimingMetrics = {
  registrationToScreeningDays: number;
  registrationToReferralDays: number;
  diagnosisToTreatmentDays: number;
  metrics?: TimingMetric[];
};

type AgeBasis = "suspicious" | "confirmed";

type OutcomeTile = { status: string; field: string; label: string; description: string; icon: React.ReactNode; wrap: string };
const OUTCOME_TILES: OutcomeTile[] = [
  { status: "confirmed", field: "cancer_confirmed", label: "Cancer Confirmed", description: "Case outcome records cancer as confirmed (diagnosis made).", icon: <AlertCircle className="w-6 h-6 text-red-600" />, wrap: "bg-red-100 dark:bg-red-900/30" },
  { status: "in_treatment", field: "in_treatment", label: "In Treatment", description: "Treatment commenced and not completed or discontinued.", icon: <HeartPulse className="w-6 h-6 text-blue-600" />, wrap: "bg-blue-100 dark:bg-blue-900/30" },
  { status: "completed", field: "treatment_completed", label: "Treatment Completed", description: "Treatment status is completed.", icon: <ShieldCheck className="w-6 h-6 text-green-600" />, wrap: "bg-green-100 dark:bg-green-900/30" },
  { status: "discontinued", field: "treatment_discontinued", label: "Treatment Discontinued", description: "Treatment status is discontinued.", icon: <X className="w-6 h-6 text-red-600" />, wrap: "bg-red-100 dark:bg-red-900/30" },
  { status: "follow_up", field: "follow_up_required", label: "Follow-up Required", description: "Negative screening on the case outcome, and follow-up not yet established.", icon: <AlertTriangle className="w-6 h-6 text-orange-600" />, wrap: "bg-orange-100 dark:bg-orange-900/30" },
  { status: "complete_remission", field: "complete_remission", label: "Complete Remission", description: "Clinical outcome: complete remission.", icon: <ShieldCheck className="w-6 h-6 text-green-600" />, wrap: "bg-green-100 dark:bg-green-900/30" },
  { status: "partial_remission", field: "partial_remission", label: "Partial Remission", description: "Clinical outcome: partial remission.", icon: <Activity className="w-6 h-6 text-lime-600" />, wrap: "bg-lime-100 dark:bg-lime-900/30" },
  { status: "stable_disease", field: "stable_disease", label: "Stable Disease", description: "Clinical outcome: stable disease.", icon: <Activity className="w-6 h-6 text-amber-600" />, wrap: "bg-amber-100 dark:bg-amber-900/30" },
  { status: "progressive_disease", field: "progressive_disease", label: "Progressive Disease", description: "Clinical outcome: progressive disease.", icon: <AlertTriangle className="w-6 h-6 text-orange-600" />, wrap: "bg-orange-100 dark:bg-orange-900/30" },
  { status: "recurrence", field: "recurrence", label: "Recurrence", description: "Clinical outcome: recurrence.", icon: <AlertTriangle className="w-6 h-6 text-red-600" />, wrap: "bg-red-100 dark:bg-red-900/30" },
  { status: "death", field: "death", label: "Death", description: "Clinical outcome: death.", icon: <X className="w-6 h-6 text-gray-700" />, wrap: "bg-gray-100 dark:bg-gray-700" },
];

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm min-w-0">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">{title}</h3>
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 ${iconWrapperClass}`}>{icon}</div>
        <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
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
  const [ageBasis, setAgeBasis] = useState<AgeBasis>("suspicious");
  const [outcomeList, setOutcomeList] = useState<OutcomeTile | null>(null);
  const [ageLoading, setAgeLoading] = useState(false);
  const caseWord = ageBasis === "confirmed" ? "confirmed cancer cases" : "clients with a suspicious finding";

  // Gender-age comparison
  const [genderAgeData, setGenderAgeData] = useState<Record<string, GenderAgeGroup>>({});

  // Treatment/clinical outcome statistics
  const [outcomeStats, setOutcomeStats] = useState<OutcomeStatistics | null>(null);

  // Stage 2 outcome distribution
  const [stage2, setStage2] = useState<Stage2Summary | null>(null);
  const stage2Dist = stage2?.distribution ?? null;

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

  // Findings per cancer type + lab turnaround (same rules as Screened Clients / All Test Results)
  const [labAnalytics, setLabAnalytics] = useState<LabAnalytics | null>(null);

  type Filters = { facilityId?: string; dateFrom?: string; dateTo?: string };
  const buildParams = (facility: string, from: string, to: string): Filters => {
    const p: Filters = {};
    if (!hasNationalAccess) return p;
    if (facility !== "all") p.facilityId = facility;
    if (from) p.dateFrom = from;
    if (to) p.dateTo = to;
    return p;
  };
  // The filters the data on screen was loaded with (used for deep links).
  const [appliedParams, setAppliedParams] = useState<Filters>({});

  useEffect(() => {
    if (hasNationalAccess) fetchFacilities();
    fetchAll({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFacilities() {
    try {
      const { data } = await api.get("/facilities");
      if (data.status) setFacilities(data.facilities || data.data || []);
    } catch {}
  }

  // Params are passed in explicitly so "Clear filters" doesn't reload with the old (stale) values.
  async function fetchAll(filterParams: Filters) {
    setLoading(true);
    setAppliedParams(filterParams);
    await Promise.all([
      fetchDistributionAndTrend(filterParams),
      fetchAgeSections(filterParams, ageBasis),
      fetchOutcomeStatistics(filterParams),
      fetchStage2Outcomes(filterParams),
      fetchTreatmentAnalytics(filterParams),
      fetchFacilityPerformance(filterParams),
      fetchReferralFunnel(filterParams),
      fetchTimingMetrics(filterParams),
      fetchLabAnalytics(filterParams),
    ]);
    setLoading(false);
  }

  async function fetchLabAnalytics(filterParams: Filters) {
    try {
      const { data: response } = await api.get("/analytics/lab-findings", { params: filterParams });
      if (response.status) setLabAnalytics(response.data);
    } catch (err) {
      console.error("Error fetching lab analytics:", err);
      setLabAnalytics(null);
    }
  }

  async function fetchDistributionAndTrend(filterParams: Filters) {
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

  /** Cancer-by-age and gender comparison use the same cases (suspicious findings or confirmed cancer). */
  async function fetchAgeSections(filterParams: Filters, basis: AgeBasis) {
    const params = { ...filterParams, basis };
    try {
      const [age, gender] = await Promise.all([
        api.get("/analytics/cancer-by-age", { params }),
        api.get("/analytics/gender-age-comparison", { params }),
      ]);
      setAgeData(age.data?.status ? age.data.data : null);
      setGenderAgeData(gender.data?.status ? gender.data.data || {} : {});
    } catch (err) {
      console.error("Error fetching age analytics:", err);
      setAgeData(null);
      setGenderAgeData({});
    }
  }

  async function changeAgeBasis(basis: AgeBasis) {
    if (basis === ageBasis) return;
    setAgeBasis(basis);
    setAgeLoading(true);
    await fetchAgeSections(appliedParams, basis);
    setAgeLoading(false);
  }

  async function fetchOutcomeStatistics(filterParams: Filters) {
    try {
      const { data } = await api.get("/outcomes/statistics", { params: filterParams.facilityId ? { facilityId: filterParams.facilityId } : {} });
      setOutcomeStats(data);
    } catch (err) {
      console.error("Error fetching outcome statistics:", err);
      setOutcomeStats(null);
    }
  }

  async function fetchStage2Outcomes(filterParams: Filters) {
    try {
      // Client-level, same rules as Screened Clients: form results, visit outcomes and lab results together.
      const { data: response } = await api.get("/analytics/stage2-summary", { params: filterParams });
      setStage2(response.status ? response.data : null);
    } catch (err) {
      console.error("Error fetching Stage 2 outcomes:", err);
      setStage2(null);
    }
  }

  async function fetchTreatmentAnalytics(filterParams: Filters) {
    try {
      const { data: response } = await api.get("/analytics/treatment", { params: filterParams });
      if (response.status) setTreatmentAnalytics(response.data);
    } catch (err) {
      console.error("Error fetching treatment analytics:", err);
    }
  }

  async function fetchFacilityPerformance(filterParams: Filters) {
    try {
      const { data: response } = await api.get("/analytics/facility-summary", { params: filterParams });
      setFacilityPerformance(response.status ? response.data || [] : []);
    } catch (err) {
      setFacilityPerformance([]);
      console.error("Error fetching facility performance:", err);
    }
  }

  async function fetchReferralFunnel(filterParams: Filters) {
    try {
      const { data: response } = await api.get("/analytics/journey-funnel", { params: filterParams });
      setFunnelStages(response.status ? response.data || [] : []);
    } catch (err) {
      setFunnelStages([]);
      console.error("Error fetching referral funnel:", err);
    }
  }

  async function fetchTimingMetrics(filterParams: Filters) {
    try {
      const { data: response } = await api.get("/analytics/timing-metrics", { params: filterParams });
      if (response.status) setTimingMetrics(response.data);
    } catch (err) {
      console.error("Error fetching timing metrics:", err);
    }
  }

  function applyFilters() {
    setFiltersApplied(selectedFacility !== "all" || dateFrom !== "" || dateTo !== "");
    fetchAll(buildParams(selectedFacility, dateFrom, dateTo));
    setShowFilters(false);
  }

  function clearFilters() {
    setSelectedFacility("all");
    setDateFrom("");
    setDateTo("");
    setFiltersApplied(false);
    fetchAll({});
    setShowFilters(false);
  }

  /** Link into Screened Clients with the analytics filters carried over. */
  const screenedHref = (q: Record<string, string>) =>
    `/ncsr/screened-clients?${new URLSearchParams({ ...(appliedParams as Record<string, string>), ...q }).toString()}`;

  const totalScreenedByType =
    stats.cervicalScreenings + stats.breastScreenings + stats.prostateScreenings + stats.colorectalScreenings + stats.liverScreenings;

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
          label: "Clients screened",
          backgroundColor: "rgba(21, 128, 61, 0.15)",
          borderColor: "#15803d",
          data: monthlyTrend.length > 0 ? monthlyTrend.map((i) => i.screenings) : [0],
          fill: true, tension: 0.35,
        },
        {
          label: "Clients referred",
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

  const stage2Visible = STAGE2_ROWS.filter((r) => (stage2Dist?.[r.key] ?? 0) > 0);
  const stage2ChartData = stage2Dist && stage2Visible.length ? {
    labels: stage2Visible.map((r) => r.label),
    datasets: [{
      data: stage2Visible.map((r) => stage2Dist[r.key] ?? 0),
      backgroundColor: stage2Visible.map((r) => r.color),
      borderWidth: 0,
    }],
  } : null;

  const findingRows = (labAnalytics?.byCancerType ?? []).filter((r) => r.screened > 0);
  const findingsChartData = findingRows.length
    ? {
        labels: findingRows.map((r) => cancerName(r.cancerType)),
        datasets: FINDING_KEYS.map((f) => ({
          label: f.label,
          data: findingRows.map((r) => Number(r[f.key]) || 0),
          backgroundColor: f.color,
          borderWidth: 0,
        })),
      }
    : null;

  const stackedBarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12 } } },
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
  };

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
          <div className="flex flex-wrap items-center gap-3">
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
            <div className="mt-4 p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
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
              <div className="flex flex-wrap items-center gap-3">
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
                Facility and date filters apply to every section. Case Outcomes follow the facility filter only.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Screening volume overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Clients Screened by Cancer Type">
          {totalScreenedByType > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56 sm:h-64">
                <Doughnut data={screeningDistributionData.data} options={screeningDistributionData.options as any} />
              </div>
              <div className="space-y-2">
                {screeningDistributionData.data.labels.map((label, i) => {
                  const value = screeningDistributionData.data.datasets[0].data[i];
                  const type = label.toLowerCase();
                  return (
                    <Link key={label} href={screenedHref({ cancerType: type })} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <span className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: screeningDistributionData.data.datasets[0].backgroundColor[i] }} />
                        {label}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</span>
                    </Link>
                  );
                })}
                <p className="text-xs text-gray-400 pt-1">
                  Clients with a screening record or a lab test of that type. A client screened for two cancers counts in both.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-sm text-gray-500">No clients screened yet.</div>
          )}
        </SectionCard>
        <SectionCard title="Clients Screened and Referred per Month">
          {monthlyTrend.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-4 -mt-2 mb-3 text-xs text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-700" /> Screened (form or lab test)</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-600" /> Referred (referral recorded or marked on the form)</span>
              </div>
              <div className="h-64 sm:h-72">
                <Line data={monthlyTrendData.data} options={monthlyTrendData.options as any} />
              </div>
            </>
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

      {/* Findings per cancer type (form + lab, client-level) */}
      <div className="mb-8">
        <SectionCard title="Screening Findings by Cancer Type">
          {findingsChartData ? (
            <>
              <div className="h-72 sm:h-80 mb-5">
                <Bar data={findingsChartData} options={stackedBarOptions as any} />
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-gray-50 dark:bg-gray-900/40 text-left">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Cancer type</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-right">Screened</th>
                      {FINDING_KEYS.map((f) => (
                        <th key={f.key} className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 text-right">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {findingRows.map((r) => (
                      <tr key={r.cancerType}>
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">
                          <Link href={screenedHref({ cancerType: r.cancerType })} className="hover:underline">{cancerName(r.cancerType)}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{r.screened}</td>
                        <td className="px-4 py-2.5 text-right">
                          {r.suspicious > 0 ? (
                            <Link href={screenedHref({ cancerType: r.cancerType, result: "suspicious" })} className="font-semibold text-red-600 hover:underline">
                              {r.suspicious} <span className="text-xs font-normal text-gray-400">({Math.round((r.suspicious / r.screened) * 100)}%)</span>
                            </Link>
                          ) : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-700">{r.non_suspicious}</td>
                        <td className="px-4 py-2.5 text-right text-amber-600">{r.inconclusive}</td>
                        <td className="px-4 py-2.5 text-right text-blue-600">{r.awaiting}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{r.no_result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                One finding per client per cancer type, the most serious wins. Positive and abnormal results count as suspicious;
                negative and normal as non-suspicious. Lab results are included.
              </p>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-gray-500">No screening findings yet.</div>
          )}
        </SectionCard>
      </div>

      {/* Lab tests & turnaround */}
      {labAnalytics && labAnalytics.totals.samples > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Lab Tests &amp; Turnaround</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
            <StatBlock icon={<FlaskConical className="w-6 h-6 text-blue-600" />} iconWrapperClass="bg-blue-100 dark:bg-blue-900/30" value={labAnalytics.totals.samples.toLocaleString()} label="Samples / tests taken" />
            <StatBlock icon={<ShieldCheck className="w-6 h-6 text-green-600" />} iconWrapperClass="bg-green-100 dark:bg-green-900/30" value={labAnalytics.totals.released.toLocaleString()} label="Results released" />
            <Link href="/ncsr/screening-tests-page?tab=results" className="block">
              <StatBlock
                icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
                iconWrapperClass="bg-red-100 dark:bg-red-900/30"
                value={labAnalytics.totals.overdue.toLocaleString()}
                label={`Overdue (> 7 days) of ${labAnalytics.totals.awaiting.toLocaleString()} awaiting`}
              />
            </Link>
            <StatBlock
              icon={<Timer className="w-6 h-6 text-cyan-600" />}
              iconWrapperClass="bg-cyan-100 dark:bg-cyan-900/30"
              value={labAnalytics.totals.avgTurnaroundDays !== null ? `${labAnalytics.totals.avgTurnaroundDays}d` : "—"}
              label="Avg. sample → result"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-left">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Test</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Taken</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Suspicious</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Non-susp.</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Inconcl.</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Awaiting</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Overdue</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Avg. days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {labAnalytics.tests.map((t) => (
                    <tr key={t.testType}>
                      <td className="px-4 sm:px-6 py-2.5">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{findTest(t.testType)?.label ?? t.testType}</p>
                        <p className="text-xs text-gray-400">{cancerName(t.cancerType)}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{t.total}</td>
                      <td className={`px-4 py-2.5 text-right ${t.suspicious ? "text-red-600 font-semibold" : "text-gray-400"}`}>{t.suspicious}</td>
                      <td className="px-4 py-2.5 text-right text-green-700">{t.non_suspicious}</td>
                      <td className="px-4 py-2.5 text-right text-amber-600">{t.inconclusive}</td>
                      <td className="px-4 py-2.5 text-right text-blue-600">{t.awaiting}</td>
                      <td className={`px-4 py-2.5 text-right ${t.overdue ? "text-red-600 font-semibold" : "text-gray-400"}`}>{t.overdue}</td>
                      <td className="px-4 py-2.5 text-right">{t.avgTurnaroundDays ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 outcome distribution */}
      <div className="mb-8">
        <SectionCard title="Stage 2 (Clinical Screening) Results by Client">
          {stage2 && stage2Dist && stage2ChartData ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="h-64 sm:h-72">
                  <Doughnut data={stage2ChartData} options={doughnutOptions as any} />
                </div>
                <div className="space-y-2">
                  {STAGE2_ROWS.map((r) => {
                    const value = stage2Dist[r.key] ?? 0;
                    const pct = stage2.total ? Math.round((value / stage2.total) * 100) : 0;
                    const body = (
                      <div className={`flex items-center justify-between gap-2 p-3 rounded-xl ${r.box} ${r.link && value ? "hover:opacity-80" : ""}`}>
                        <span className="text-sm font-medium inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                          {r.label}
                        </span>
                        <span className="text-sm font-bold whitespace-nowrap">
                          {value.toLocaleString()} <span className="text-xs font-normal opacity-70">({pct}%)</span>
                        </span>
                      </div>
                    );
                    return r.link && value ? <Link key={r.key} href={screenedHref(r.link)} className="block">{body}</Link> : <div key={r.key}>{body}</div>;
                  })}
                  <p className="text-xs text-gray-400 pt-1">
                    {stage2.total.toLocaleString()} clients screened, each counted once by their most serious result
                    (screening forms, the visit outcome and lab results together).
                  </p>
                </div>
              </div>

              {stage2.suspiciousTotal > 0 && (stage2.suspiciousNoOutcome > 0 || stage2.suspiciousNotReferred > 0) && (
                <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800 p-4 text-sm text-orange-900 dark:text-orange-200 space-y-1">
                  <p className="font-semibold inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Suspicious clients needing attention</p>
                  {stage2.suspiciousNotReferred > 0 && (
                    <p>
                      <b>{stage2.suspiciousNotReferred.toLocaleString()}</b> of {stage2.suspiciousTotal.toLocaleString()} suspicious clients have not been referred yet.{" "}
                      <Link href={screenedHref({ result: "suspicious" })} className="underline font-semibold">View suspicious clients</Link>
                    </p>
                  )}
                  {stage2.suspiciousNoOutcome > 0 && (
                    <p>
                      <b>{stage2.suspiciousNoOutcome.toLocaleString()}</b> have a suspicious result but the visit's overall outcome was not
                      recorded as Suspicious or Urgent, so no referral was created automatically. Open the visit and complete the outcome step.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No clients screened yet.</p>
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

      {/* Socio-economic status / indigency support */}
      <div className="mb-8">
        <SectionCard title="Socio-Economic Status & Indigency Support">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Breakdown of client socio-economic class (NICRAT model) to help identify clients who may need
            financial or support assistance, and whether lower socio-economic class correlates with higher
            cancer risk in this population.
          </p>
          <Link href="/ncsr/indigency-support">
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold cursor-pointer">
              View Full Breakdown & Client List
            </span>
          </Link>
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
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-left">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Facility</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Clients screened</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Suspicious</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Referred</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Awaiting lab</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Overdue (&gt; 7d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {facilityPerformance.map((row, i) => (
                    <tr key={row.facilityId} className={i === 0 ? "bg-teal-50/50 dark:bg-teal-900/10" : ""}>
                      <td className="px-4 sm:px-6 py-3 font-medium text-gray-800 dark:text-gray-100">
                        <Link href={screenedHref({ facilityId: String(row.facilityId) })} className="inline-flex items-center gap-2 hover:underline">
                          {i === 0 && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                          {row.facilityName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">{row.screened}</td>
                      <td className="px-4 py-3 text-right">
                        {row.suspicious > 0 ? (
                          <Link href={screenedHref({ facilityId: String(row.facilityId), result: "suspicious" })} className="text-orange-700 dark:text-orange-400 font-semibold hover:underline">
                            {row.suspicious} <span className="text-xs font-normal text-gray-400">({row.suspiciousRate}%)</span>
                          </Link>
                        ) : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.referred}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{row.awaiting}</td>
                      <td className={`px-4 py-3 text-right ${row.overdue ? "text-red-600 font-semibold" : "text-gray-400"}`}>{row.overdue}</td>
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
          <SectionCard title="Registered → Screened → Suspicious → Referred → Stage 3 → Treatment">
            <p className="-mt-3 mb-4 text-xs text-gray-400">
              Follows the clients registered{appliedParams.dateFrom || appliedParams.dateTo ? " in the selected dates" : ""} through each step.
              Each step only counts clients from the step before.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {funnelStages.map((stage, i) => (
                <div key={stage.key} className="relative">
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stage.count}</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{stage.label}</p>
                    {stage.conversionFromPrevious !== null && (
                      <p className="text-xs mt-2 font-semibold text-indigo-600 dark:text-indigo-400">
                        {stage.conversionFromPrevious}% of previous
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
            Per client, first event only (follow-up visits don't count). Dates entered out of order are left out.
            Review against NICRAT's protocol targets for what counts as timely vs. delayed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {(timingMetrics.metrics ?? [
              { key: "a", label: "Registration → screening", avg: timingMetrics.registrationToScreeningDays, median: null, count: 0, skipped: 0 },
              { key: "b", label: "Registration → referral", avg: timingMetrics.registrationToReferralDays, median: null, count: 0, skipped: 0 },
              { key: "c", label: "Diagnosis → treatment", avg: timingMetrics.diagnosisToTreatmentDays, median: null, count: 0, skipped: 0 },
            ]).map((m, i) => (
              <div key={m.key} className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${["bg-cyan-100 text-cyan-600", "bg-indigo-100 text-indigo-600", "bg-blue-100 text-blue-600", "bg-red-100 text-red-600"][i % 4]}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{m.avg !== null ? `${m.avg}d` : "—"}</span>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg. {m.label}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {m.median !== null && <>Median {m.median}d · </>}
                  {m.count.toLocaleString()} {m.count === 1 ? "record" : "records"}
                  {m.skipped > 0 && <> · {m.skipped} left out (dates out of order)</>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treatment / clinical outcome statistics */}
      {outcomeStats && (outcomeStats.total_outcomes > 0 || (stage2?.suspiciousTotal ?? 0) > 0) && (
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">Case Outcomes (Treatment &amp; Follow-up)</h2>
          <p className="text-xs text-gray-400 mb-4">
            From the Case Outcomes records ({outcomeStats.total_outcomes.toLocaleString()} clients). Screening results are counted in the Stage 2 section above.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Suspicious = a screening finding, not a diagnosis. Opens Screened Clients. */}
            <Link href={screenedHref({ result: "suspicious" })} className="block text-left rounded-2xl ring-offset-2 hover:ring-2 hover:ring-orange-300 transition">
              <StatBlock
                icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
                iconWrapperClass="bg-orange-100 dark:bg-orange-900/30"
                value={stage2?.suspiciousTotal ?? 0}
                label="Suspicious (screening, not yet confirmed)"
              />
            </Link>
            {OUTCOME_TILES.map((t) => (
              <button
                key={t.status}
                type="button"
                onClick={() => setOutcomeList(t)}
                className="block w-full text-left rounded-2xl ring-offset-2 hover:ring-2 hover:ring-green-300 transition"
                title="See the clients"
              >
                <StatBlock icon={t.icon} iconWrapperClass={t.wrap} value={(outcomeStats as any)[t.field] ?? 0} label={t.label} />
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            <b>Suspicious</b> is a screening finding that still needs diagnosis. <b>Cancer Confirmed</b> is only counted when the
            Case Outcome records cancer as confirmed. Click a card to see the clients.
          </p>
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
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Cancer Types by Age Classification</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="inline-flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1">
                {([["suspicious", "Suspicious findings"], ["confirmed", "Confirmed cancer"]] as [AgeBasis, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => changeAgeBasis(k)}
                    className={`px-4 h-9 rounded-xl text-sm font-semibold transition ${ageBasis === k ? "bg-white dark:bg-gray-700 text-purple-700 shadow-sm" : "text-gray-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {ageLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
              <p className="text-xs text-gray-400 basis-full">
                {ageBasis === "confirmed"
                  ? "Clients whose case outcome records cancer as confirmed. Age at diagnosis."
                  : "Clients with a suspicious finding on a screening form, the visit outcome or a lab result (same as Screened Clients). Age at first screening."}
                {(ageData.unknownAge ?? 0) > 0 && ` ${ageData.unknownAge} without a date of birth are counted in the total but not in an age group.`}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6">
              <StatBlock icon={<Activity className="w-6 h-6 text-green-600" />} iconWrapperClass="bg-green-100 dark:bg-green-900/30" value={ageData.totalCases} label={ageBasis === "confirmed" ? "Confirmed Cancer Cases" : "Clients with Suspicious Findings"} />
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
              <SectionCard title={`Gender Comparison Across Age Groups (${ageBasis === "confirmed" ? "Confirmed Cancer" : "Suspicious Findings"})`}>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nothing to show yet</h3>
              <p className="text-gray-600 dark:text-gray-400">No {caseWord} for these filters.</p>
            </div>
          )}
        </>
      )}
      <OutcomeClientsModal
        open={!!outcomeList}
        status={outcomeList?.status ?? ""}
        title={outcomeList?.label ?? ""}
        description={outcomeList?.description}
        facilityId={appliedParams.facilityId}
        onClose={() => setOutcomeList(null)}
      />
    </Layout>
  );
}
