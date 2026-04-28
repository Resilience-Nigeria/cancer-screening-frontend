import React, { useState, useEffect } from "react";
import { Doughnut, Line } from "react-chartjs-2";

import ChartCard from "example/components/Chart/ChartCard";
import ChartLegend from "example/components/Chart/ChartLegend";
import PageTitle from "example/components/Typography/PageTitle";
import Layout from "example/containers/Layout";

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
} from "lucide-react";

type ScreeningActivity = {
  clientName: string;
  screeningId: string;
  screeningType: string;
  status: "Completed" | "Pending" | "Referred" | "Follow-up";
  facility: string;
  date: string;
};

type StatCardProps = {
  title: string;
  value: string;
  note?: string;
  icon: React.ReactNode;
  iconWrapperClass: string;
};

function StatCard({
  title,
  value,
  note,
  icon,
  iconWrapperClass,
}: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5">
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
    </div>
  );
}

function ModuleCard({
  title,
  value,
  note,
  noteColor = "text-green-600",
  icon,
}: {
  title: string;
  value: string;
  note: string;
  noteColor?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
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
  Chart.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  );

  const activities: ScreeningActivity[] = [
    {
      clientName: "Grace Okafor",
      screeningId: "NCSR-2026-0001",
      screeningType: "Cervical Screening",
      status: "Completed",
      facility: "National Hospital Abuja",
      date: "2026-03-08",
    },
    {
      clientName: "Musa Ibrahim",
      screeningId: "NCSR-2026-0002",
      screeningType: "Prostate Screening",
      status: "Referred",
      facility: "Lagos State University Teaching Hospital",
      date: "2026-03-08",
    },
    {
      clientName: "Esther Adeyemi",
      screeningId: "NCSR-2026-0003",
      screeningType: "Breast Screening",
      status: "Follow-up",
      facility: "UCH Ibadan",
      date: "2026-03-07",
    },
    {
      clientName: "Ngozi Nnaji",
      screeningId: "NCSR-2026-0004",
      screeningType: "Colorectal Screening",
      status: "Pending",
      facility: "UNTH Enugu",
      date: "2026-03-07",
    },
    {
      clientName: "Bala Sani",
      screeningId: "NCSR-2026-0005",
      screeningType: "Liver Screening",
      status: "Completed",
      facility: "Aminu Kano Teaching Hospital",
      date: "2026-03-06",
    },
    {
      clientName: "Ifeoma John",
      screeningId: "NCSR-2026-0006",
      screeningType: "Cervical Screening",
      status: "Referred",
      facility: "Federal Medical Centre Owerri",
      date: "2026-03-06",
    },
    {
      clientName: "Amina Bello",
      screeningId: "NCSR-2026-0007",
      screeningType: "Breast Screening",
      status: "Completed",
      facility: "General Hospital Ilorin",
      date: "2026-03-05",
    },
    {
      clientName: "Samuel Eze",
      screeningId: "NCSR-2026-0008",
      screeningType: "Prostate Screening",
      status: "Pending",
      facility: "National Hospital Abuja",
      date: "2026-03-05",
    },
    {
      clientName: "Patience Udo",
      screeningId: "NCSR-2026-0009",
      screeningType: "Liver Screening",
      status: "Follow-up",
      facility: "University of Uyo Teaching Hospital",
      date: "2026-03-04",
    },
    {
      clientName: "Ruth James",
      screeningId: "NCSR-2026-0010",
      screeningType: "Cervical Screening",
      status: "Completed",
      facility: "LUTH Lagos",
      date: "2026-03-04",
    },
    {
      clientName: "David Peter",
      screeningId: "NCSR-2026-0011",
      screeningType: "Colorectal Screening",
      status: "Referred",
      facility: "FMC Lokoja",
      date: "2026-03-03",
    },
    {
      clientName: "Janet Bassey",
      screeningId: "NCSR-2026-0012",
      screeningType: "Breast Screening",
      status: "Completed",
      facility: "University of Calabar Teaching Hospital",
      date: "2026-03-03",
    },
  ];

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ScreeningActivity[]>([]);

  const resultsPerPage = 6;
  const totalResults = activities.length;

  function onPageChange(p: number) {
    setPage(p);
  }

  useEffect(() => {
    setData(
      activities.slice((page - 1) * resultsPerPage, page * resultsPerPage),
    );
  }, [page]);

  const screeningDistributionData = {
    data: {
      datasets: [
        {
          data: [38, 24, 14, 12, 12],
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

  const monthlyTrendData = {
    data: {
      labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
      datasets: [
        {
          label: "Screenings",
          backgroundColor: "rgba(21, 128, 61, 0.15)",
          borderColor: "#15803d",
          data: [420, 510, 630, 590, 740, 810, 905],
          fill: true,
          tension: 0.35,
        },
        {
          label: "Referrals",
          backgroundColor: "rgba(217, 119, 6, 0.12)",
          borderColor: "#d97706",
          data: [35, 44, 51, 48, 56, 62, 71],
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
          value="12,486"
          note="Across participating facilities"
          icon={
            <Users className="w-5 h-5 text-green-700 dark:text-green-100" />
          }
          iconWrapperClass="bg-green-100 dark:bg-green-700"
        />

        <StatCard
          title="Screenings This Month"
          value="905"
          note="All modules combined"
          icon={
            <Stethoscope className="w-5 h-5 text-emerald-700 dark:text-emerald-100" />
          }
          iconWrapperClass="bg-emerald-100 dark:bg-emerald-700"
        />

        <StatCard
          title="Pending Follow-ups"
          value="214"
          note="Requires active review"
          icon={
            <ClipboardList className="w-5 h-5 text-amber-700 dark:text-amber-100" />
          }
          iconWrapperClass="bg-amber-100 dark:bg-amber-600"
        />

        <StatCard
          title="Referral Alerts"
          value="71"
          note="Urgent cases to track"
          icon={
            <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-100" />
          }
          iconWrapperClass="bg-red-100 dark:bg-red-600"
        />
      </div>

      <div className="grid gap-4 sm:gap-5 mb-6 sm:mb-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          title="Cervical Screening"
          value="4,721"
          note="+8.6% from last month"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
        />
        <ModuleCard
          title="Breast Screening"
          value="2,986"
          note="+6.1% from last month"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
        />
        <ModuleCard
          title="Prostate Screening"
          value="1,844"
          note="+5.3% from last month"
          icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
        />
        <ModuleCard
          title="Positive Findings"
          value="438"
          note="Requires active tracking"
          noteColor="text-red-500"
          icon={<Activity className="w-4 h-4 text-red-500" />}
        />
      </div>

      <div className="mb-6 sm:mb-8">
        <PageTitle>Recent Screening Activity</PageTitle>

        <div className="mt-4">
          {/* Mobile / Tablet cards */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {data.map((item, i) => (
              <ActivityCard key={i} item={item} getBadgeType={getBadgeType} />
            ))}
          </div>

          {/* Desktop table */}
          {/* <div className="hidden lg:block rounded-2xl overflow-hidden shadow-sm"> */}
          <div className="rounded-2xl overflow-hidden shadow-sm">
            {/* Mobile View (Card Layout) - Visible on small screens */}
            <div className="block lg:hidden space-y-4">
              {data.map((item, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  {/* Header with Client Name and ID */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.clientName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        ID: {item.screeningId}
                      </p>
                    </div>
                    <Badge
                      type={getBadgeType(item.status) as any}
                      className="flex-shrink-0"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Type
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.screeningType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Facility
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.facility}
                      </p>
                    </div>
                  </div>

                  {/* Footer with Date */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>

                    {/* Optional: View Details Button */}
                    <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet View (Horizontal Scroll) - Visible on medium screens */}
            <div className="hidden md:block lg:hidden overflow-x-auto -mx-4 sm:-mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        Client
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        Screening ID
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        Facility
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {data.map((item, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.clientName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400">
                          {item.screeningId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {item.screeningType}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge type={getBadgeType(item.status) as any}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {item.facility}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Desktop View (Full Table) - Visible on large screens */}
            <div className="hidden lg:block">
              <TableContainer>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>Client</TableCell>
                      <TableCell>Screening ID</TableCell>
                      <TableCell>Screening Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Facility</TableCell>
                      <TableCell>Date</TableCell>
                    </tr>
                  </TableHeader>

                  <TableBody>
                    {data.map((item, i) => (
                      <TableRow key={i}>
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

            {/* Pagination - Show on all screens */}
            <div className="mt-6">
              <Pagination
                totalResults={totalResults}
                resultsPerPage={resultsPerPage}
                label="Table navigation"
                onChange={onPageChange}
              />
            </div>
          </div>
          {/* Mobile / tablet pagination */}
          <div className="mt-4 lg:hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              label="Activity navigation"
              onChange={onPageChange}
            />
          </div>
        </div>
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
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
