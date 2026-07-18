import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Doughnut, Line } from "react-chartjs-2";
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
import { Activity, ArrowLeft } from "lucide-react";

import PageTitle from "../components/Typography/PageTitle";
import Layout from "../containers/Layout";
import api from "../../lib/api";

type MonthlyTrendData = {
  month: string;
  screenings: number;
  referrals: number;
};

type DistributionStats = {
  cervicalScreenings: number;
  breastScreenings: number;
  prostateScreenings: number;
  colorectalScreenings: number;
  liverScreenings: number;
};

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

function AnalyticsPage() {
  const [stats, setStats] = useState<DistributionStats>({
    cervicalScreenings: 0,
    breastScreenings: 0,
    prostateScreenings: 0,
    colorectalScreenings: 0,
    liverScreenings: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [statsRes, trendRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/monthly-trends"),
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
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          backgroundColor: ["#15803d", "#22c55e", "#86efac", "#65a30d", "#0f766e"],
          borderWidth: 0,
        },
      ],
      labels: ["Cervical", "Breast", "Prostate", "Colorectal", "Liver"],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: { legend: { display: false } },
    },
  };

  const monthlyTrendData = {
    data: {
      labels: monthlyTrend.length > 0 ? monthlyTrend.map((item) => item.month) : ["No Data"],
      datasets: [
        {
          label: "Screenings",
          backgroundColor: "rgba(21, 128, 61, 0.15)",
          borderColor: "#15803d",
          data: monthlyTrend.length > 0 ? monthlyTrend.map((item) => item.screenings) : [0],
          fill: true,
          tension: 0.35,
        },
        {
          label: "Referrals",
          backgroundColor: "rgba(217, 119, 6, 0.12)",
          borderColor: "#d97706",
          data: monthlyTrend.length > 0 ? monthlyTrend.map((item) => item.referrals) : [0],
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
        x: { grid: { display: false } },
      },
    },
  };

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <Link
          href="/ncsr/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="mt-3">
          <PageTitle>Analytics &amp; Trends</PageTitle>
        </div>
      </div>

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
                    <Line data={monthlyTrendData.data} options={monthlyTrendData.options as any} />
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
                    {loading ? "Loading trend data…" : "No trend data available yet"}
                  </p>
                  {!loading && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Data will appear as screenings are recorded
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AnalyticsPage;
