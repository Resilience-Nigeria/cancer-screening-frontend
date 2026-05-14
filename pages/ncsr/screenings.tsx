import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Button,
  Badge,
  Pagination,
  Input,
} from "@roketid/windmill-react-ui";
import {
  Search,
  User,
  Calendar,
  FileText,
  Eye,
  Loader2,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Screening = {
  screeningId: number;
  visitId: number;
  clientId: number;
  clientName: string;
  clientScreeningId: string;
  screeningDate: string;
  screeningType?: string;
  result?: string;
  notes?: string;
};

export default function ScreeningsPage() {
  const router = useRouter();
  const { type } = router.query;

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [filterType, setFilterType] = useState<string>("all");

  const resultsPerPage = 10;

  const screeningTypeMap: Record<string, string> = {
    cervical: "Cervical Screening",
    breast: "Breast Screening",
    prostate: "Prostate Screening",
    colorectal: "Colorectal Screening",
    liver: "Liver Screening",
    all: "All Screenings",
  };

  const screeningTypes = [
    { value: "all", label: "All Types" },
    { value: "cervical", label: "Cervical" },
    { value: "breast", label: "Breast" },
    { value: "prostate", label: "Prostate" },
    { value: "colorectal", label: "Colorectal" },
    { value: "liver", label: "Liver" },
  ];

  // Determine if we're showing all screenings or a specific type
  const isAllScreenings = !type || type === "all";
  const currentType = (type as string) || "all";
  const screeningTitle = screeningTypeMap[currentType] || "All Screenings";

  async function fetchScreenings() {
    setLoading(true);
    try {
      let endpoint = "/dashboard/screenings";
      
      // If a specific type is selected (not "all"), use the type-specific endpoint
      if (!isAllScreenings) {
        endpoint = `/dashboard/screenings/${type}`;
      }

      const params: any = { 
        page, 
        search, 
        limit: resultsPerPage 
      };

      // Add type filter for "all screenings" view if a filter is selected
      if (isAllScreenings && filterType !== "all") {
        params.type = filterType;
      }

      const { data } = await api.get(endpoint, { params });

      const rawScreenings = data?.data || [];
      const mappedScreenings: Screening[] = rawScreenings.map((item: any) => ({
        screeningId: item.screeningId ?? item.screening_id ?? item.id,
        visitId: item.visitId ?? item.visit_id,
        clientId: item.clientId ?? item.client_id,
        clientName: item.client?.fullName ?? item.client?.full_name ?? "Unknown",
        clientScreeningId: item.client?.screeningId ?? item.client?.screening_id ?? "—",
        screeningDate: item.screeningDate ?? item.screening_date ?? item.created_at,
        screeningType: item.screeningType ?? item.screening_type ?? type,
        result: item.result ?? item.viaResult ?? item.cbeResult,
        notes: item.notes ?? item.remarks,
      }));

      setScreenings(mappedScreenings);
      setTotalResults(data?.total || mappedScreenings.length);
    } catch (err: any) {
      toast.error("Unable to load screenings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScreenings();
  }, [page, search, type, filterType]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function getResultBadge(result?: string) {
    if (!result) return "neutral";
    const lower = result.toLowerCase();
    if (lower.includes("positive") || lower.includes("abnormal")) return "danger";
    if (lower.includes("negative") || lower.includes("normal")) return "success";
    return "warning";
  }

  function getScreeningTypeBadge(type?: string) {
    const badges: Record<string, { color: string; label: string }> = {
      cervical: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Cervical" },
      breast: { color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", label: "Breast" },
      prostate: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Prostate" },
      colorectal: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "Colorectal" },
      liver: { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", label: "Liver" },
    };

    const badge = badges[type?.toLowerCase() || ""] || { 
      color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400", 
      label: type || "Unknown" 
    };

    return badge;
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>{screeningTitle}</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                National Cancer Screening Register
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                {isAllScreenings ? "All Screening Records" : `All ${screeningTitle} Records`}
              </h2>

              <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                {isAllScreenings 
                  ? "View and search through all screening records across your facility."
                  : `View and search through all ${screeningTitle.toLowerCase()} records across your facility.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                className="pl-11 h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                placeholder="Search by client name or screening ID"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
            <Button
              className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              type="submit"
            >
              Search
            </Button>
          </div>

          {/* Filter by type - only show when viewing all screenings */}
          {isAllScreenings && (
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by type:
              </label>
              <div className="flex flex-wrap gap-2">
                {screeningTypes.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => {
                      setFilterType(st.value);
                      setPage(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filterType === st.value
                        ? "bg-green-700 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading screenings...</p>
          </div>
        ) : screenings.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No screenings found
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {search ? "Try a different search term." : "No screening records available."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {screenings.map((screening) => (
                <div key={screening.screeningId} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                        {screening.clientName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {screening.clientScreeningId}
                      </p>
                    </div>
                    {screening.result && (
                      <Badge type={getResultBadge(screening.result) as any}>
                        {screening.result}
                      </Badge>
                    )}
                  </div>

                  {/* Show screening type badge for "all screenings" view */}
                  {isAllScreenings && screening.screeningType && (
                    <div className="mb-3">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getScreeningTypeBadge(screening.screeningType).color}`}>
                        {getScreeningTypeBadge(screening.screeningType).label}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(screening.screeningDate).toLocaleDateString()}</span>
                    </div>
                    {screening.notes && (
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                        <FileText className="w-4 h-4 mt-0.5" />
                        <span className="line-clamp-2">{screening.notes}</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/ncsr/client-details?clientId=${screening.clientId}`}>
                    <Button className="w-full rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800">
                      <span className="inline-flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Client
                      </span>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Client</th>
                    {isAllScreenings && <th className="px-6 py-4">Type</th>}
                    <th className="px-6 py-4">Screening Date</th>
                    <th className="px-6 py-4">Result</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {screenings.map((screening) => (
                    <tr
                      key={screening.screeningId}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {screening.clientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {screening.screeningId}
                          </p>
                        </div>
                      </td>

                      {isAllScreenings && (
                        <td className="px-6 py-4">
                          {screening.screeningType ? (
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getScreeningTypeBadge(screening.screeningType).color}`}>
                              {getScreeningTypeBadge(screening.screeningType).label}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                      )}

                      <td className="px-6 py-4 text-sm">
                        {new Date(screening.screeningDate).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4">
                        {screening.result ? (
                          <Badge type={getResultBadge(screening.result) as any}>
                            {screening.result}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm max-w-xs">
                        <span className="line-clamp-2">
                          {screening.notes || "—"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Link href={`/ncsr/client-details?clientId=${screening.clientId}`}>
                          <Button layout="outline" className="rounded-xl">
                            <span className="inline-flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalResults > resultsPerPage && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                <Pagination
                  totalResults={totalResults}
                  resultsPerPage={resultsPerPage}
                  onChange={setPage}
                  label="Screenings navigation"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}