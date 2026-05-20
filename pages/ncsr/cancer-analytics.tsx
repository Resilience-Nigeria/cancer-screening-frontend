"use client";

import React, { useState, useEffect } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Baby,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
  Filter,
  X,
  Download,
  Activity,
  User,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { getUser } from "../../lib/auth";

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AgeGroup {
  label: string;
  description: string;
  total: number;
  cancerTypes: { [key: string]: number };
  genderBreakdown: {
    male: number;
    female: number;
    other: number;
  };
  stageBreakdown: { [key: string]: number };
}

interface CancerAnalyticsData {
  ageGroups: { [key: string]: AgeGroup };
  cancerTypeStats: { [key: string]: number };
  totalCases: number;
  summary: {
    mostAffectedAgeGroup: {
      ageGroup: string;
      label: string;
      total: number;
    } | null;
    topCancerTypes: { [key: string]: number };
  };
}

interface Facility {
  facilityId: string;
  facilityName: string;
}

export default function CancerByAgeAnalytics() {
  const currentUser = getUser();
  const userRole = currentUser?.user_role?.roleName || currentUser?.role;
  const hasNationalAccess = ["SUPER_ADMIN", "NICRAT_STAFF"].includes(userRole);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CancerAnalyticsData | null>(null);
  
  // Filters
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Detailed view
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);

  useEffect(() => {
    if (hasNationalAccess) {
      fetchFacilities();
    }
    fetchAnalytics();
  }, []);

  async function fetchFacilities() {
    try {
      const { data } = await api.get("/facilities");
      if (data.status) {
        setFacilities(data.facilities || []);
      }
    } catch (err) {
      console.error("Error fetching facilities:", err);
    }
  }

  async function fetchAnalytics() {
    setLoading(true);
    try {
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

      const { data: response } = await api.get("/analytics/cancer-by-age", { params });
      
      if (response.status) {
        setData(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      toast.error("Unable to load cancer analytics");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    setFiltersApplied(
      selectedFacility !== "all" || dateFrom !== "" || dateTo !== ""
    );
    fetchAnalytics();
    setShowFilters(false);
  }

  function clearFilters() {
    setSelectedFacility("all");
    setDateFrom("");
    setDateTo("");
    setFiltersApplied(false);
    fetchAnalytics();
    setShowFilters(false);
  }

  function exportData() {
    if (!data) return;
    
    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cancer-by-age-analytics-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function generateCSV(data: CancerAnalyticsData): string {
    let csv = "Age Group,Description,Total Cases,Cancer Type,Count\n";
    
    Object.entries(data.ageGroups).forEach(([key, group]) => {
      Object.entries(group.cancerTypes).forEach(([cancerType, count]) => {
        csv += `"${group.label}","${group.description}",${group.total},"${cancerType}",${count}\n`;
      });
    });
    
    return csv;
  }

  // Prepare chart data
  const ageGroupChartData = data ? {
    labels: Object.values(data.ageGroups).map(g => g.label),
    datasets: [{
      label: "Total Cases",
      data: Object.values(data.ageGroups).map(g => g.total),
      backgroundColor: [
        "#fbbf24", // Yellow for infancy
        "#fb923c", // Orange for early childhood
        "#f87171", // Red for middle/late childhood
        "#ec4899", // Pink for adolescents
        "#a855f7", // Purple for youth
        "#8b5cf6", // Violet for young adults
        "#6366f1", // Indigo for middle age
        "#3b82f6", // Blue for elderly
        "#059669", // Green for senior
      ],
      borderWidth: 0,
    }]
  } : null;

  const ageGroupChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = data?.totalCases || 0;
            const value = context.parsed.y;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${value} cases (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        }
      }
    }
  };

  // Top cancer types chart
  const topCancerTypesData = data?.summary.topCancerTypes ? {
    labels: Object.keys(data.summary.topCancerTypes),
    datasets: [{
      data: Object.values(data.summary.topCancerTypes),
      backgroundColor: [
        "#15803d",
        "#22c55e",
        "#86efac",
        "#65a30d",
        "#0f766e",
      ],
      borderWidth: 0,
    }]
  } : null;

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
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

  if (!data) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-semibold mb-2">
              Unable to Load Analytics
            </p>
            <button
              onClick={fetchAnalytics}
              className="px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-600 shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Cancer Types by Age Classification
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                WHO Standard Age Group Analysis
              </p>
            </div>
          </div>
        </div>

        {/* Filters Section - Only for National Users */}
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
                  <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                    Active
                  </span>
                )}
              </button>

              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="font-medium">Export CSV</span>
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Filter Analytics Data
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

                <div className="flex items-center gap-3">
                  <button
                    onClick={applyFilters}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold shadow-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Apply Filters
                  </button>
                  
                  {filtersApplied && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                      <X className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {data.totalCases}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Cancer Cases
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {Object.keys(data.ageGroups).length}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Age Groups Affected
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {data.summary.mostAffectedAgeGroup?.label || "N/A"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data.summary.mostAffectedAgeGroup?.total || 0} cases
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Most Affected Age Group
            </p>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Age Group Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Cancer Cases by Age Classification
            </h3>
            
            {ageGroupChartData && (
              <div className="h-80">
                <Bar data={ageGroupChartData} options={ageGroupChartOptions} />
              </div>
            )}
          </div>

          {/* Top Cancer Types */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Top 5 Cancer Types Overall
            </h3>
            
            {topCancerTypesData && (
              <div className="h-80 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <Doughnut data={topCancerTypesData} options={doughnutOptions} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Age Groups */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Detailed Breakdown by Age Group
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {Object.entries(data.ageGroups).map(([key, group]) => (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
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
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {group.label}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {group.total}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {((group.total / data.totalCases) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                </div>

                {selectedAgeGroup === key && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Cancer Types */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Cancer Types Distribution
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(group.cancerTypes).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {type}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {count}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({((count / group.total) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Gender & Stage Breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Gender Distribution
                        </h4>
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Male</span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {group.genderBreakdown.male} ({((group.genderBreakdown.male / group.total) * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Female</span>
                            <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                              {group.genderBreakdown.female} ({((group.genderBreakdown.female / group.total) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        {Object.keys(group.stageBreakdown).length > 0 && (
                          <>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Cancer Stage Distribution
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(group.stageBreakdown).map(([stage, count]) => (
                                <div key={stage} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Stage {stage}
                                  </span>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {count}
                                  </span>
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

        {/* Empty State */}
        {data.totalCases === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Cancer Cases Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No positive cancer cases with age data available for analysis.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}