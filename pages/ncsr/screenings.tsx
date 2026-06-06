import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Pagination,
  Input,
  Badge,
} from "@roketid/windmill-react-ui";
import {
  Search,
  Calendar,
  FileText,
  Eye,
  Loader2,
  Filter,
  Building2,
  User,
  Stethoscope,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type ScreeningResult = {
  screeningType: string;
  screeningResult?: string;
  screeningDate?: string;
  notes?: string;
};

type Visit = {
  visitId: number;
  clientId: number;
  clientName: string;
  clientScreeningId: string;
  screeningDate: string;
  facility?: string;
  screeningCount: number;
  screenings: ScreeningResult[];
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function ScreeningsPage() {
  const router = useRouter();
  const { type } = router.query;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [filterType, setFilterType] = useState<string>("all");

  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const isAllScreenings = !type || type === "all";
  const currentType = (type as string) || "all";
  const screeningTitle = screeningTypeMap[currentType] || "All Screenings";

  async function fetchScreenings() {
    setLoading(true);
    try {
      let endpoint = "/dashboard/screenings";
      if (!isAllScreenings) {
        endpoint = `/dashboard/screenings/${type}`;
      }

      const params: any = { page, search, limit: resultsPerPage };
      if (isAllScreenings && filterType !== "all") {
        params.type = filterType;
      }

      const { data } = await api.get(endpoint, { params });
      const raw = data?.data || [];

      // Normalize both shapes into a Visit with a screenings[] array:
      //  - "all" endpoint returns visits with item.screenings[]
      //  - type-specific endpoint returns a flat screening per row
      const mapped: Visit[] = raw.map((item: any) => {
        const screenings: ScreeningResult[] = Array.isArray(item.screenings)
          ? item.screenings.map((s: any) => ({
              screeningType: s.screeningType ?? s.screening_type,
              screeningResult:
                s.screeningResult ?? s.screening_result ?? s.result,
              screeningDate: s.screeningDate ?? s.screening_date,
              notes: s.notes,
            }))
          : [
              {
                screeningType:
                  item.screeningType ??
                  item.screening_type ??
                  (type as string),
                screeningResult:
                  item.screeningResult ??
                  item.screening_result ??
                  item.result,
                screeningDate:
                  item.screeningDate ??
                  item.screening_date ??
                  item.created_at,
                notes: item.notes,
              },
            ];

        return {
          visitId:
            item.visitId ?? item.visit_id ?? item.screeningId ?? item.id,
          clientId: item.clientId ?? item.client_id,
          clientName:
            item.client?.fullName ??
            item.client?.full_name ??
            item.clientName ??
            "Unknown",
          clientScreeningId:
            item.client?.screeningId ??
            item.client?.screening_id ??
            item.clientCode ??
            "—",
          screeningDate:
            item.screeningDate ??
            item.screening_date ??
            item.visitDate ??
            item.created_at,
          facility: item.facility ?? item.facilityName,
          screeningCount: item.screeningCount ?? screenings.length,
          screenings,
        };
      });

      setVisits(mapped);
      setTotalResults(data?.total || mapped.length);
    } catch (err: any) {
      toast.error("Unable to load screenings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScreenings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, type, filterType]);

  // Close on Escape + lock body scroll while the modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDetails();
    }
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openDetails(visit: Visit) {
    setSelectedVisit(visit);
    setIsModalOpen(true);
  }

  function closeDetails() {
    setIsModalOpen(false);
    setSelectedVisit(null);
  }

  function getResultBadge(result?: string) {
    if (!result) return "neutral";
    const lower = result.toLowerCase();
    if (lower.includes("positive") || lower.includes("abnormal"))
      return "danger";
    if (lower.includes("negative") || lower.includes("normal"))
      return "success";
    return "warning";
  }

  function getScreeningTypeBadge(t?: string) {
    const badges: Record<string, { color: string; label: string }> = {
      cervical: {
        color:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        label: "Cervical",
      },
      breast: {
        color:
          "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
        label: "Breast",
      },
      prostate: {
        color:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        label: "Prostate",
      },
      colorectal: {
        color:
          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        label: "Colorectal",
      },
      liver: {
        color:
          "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
        label: "Liver",
      },
    };
    return (
      badges[t?.toLowerCase() || ""] || {
        color:
          "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
        label: t || "Unknown",
      }
    );
  }

  function TypeChips({ screenings }: { screenings: ScreeningResult[] }) {
    if (!screenings.length) {
      return <span className="text-sm text-gray-500">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {screenings.map((s, i) => {
          const badge = getScreeningTypeBadge(s.screeningType);
          return (
            <span
              key={`${s.screeningType}-${i}`}
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}
            >
              {badge.label}
            </span>
          );
        })}
      </div>
    );
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
                {isAllScreenings
                  ? "All Screening Visits"
                  : `All ${screeningTitle} Records`}
              </h2>

              <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                {isAllScreenings
                  ? "Each visit may include several tests. Open a visit to see every screening and its result."
                  : `View and search through all ${screeningTitle.toLowerCase()} records across your facility.`}
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
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading screenings...
            </p>
          </div>
        ) : visits.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No screenings found
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {search
                ? "Try a different search term."
                : "No screening records available."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {visits.map((visit) => (
                <div key={visit.visitId} className="p-5">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                      {visit.clientName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {visit.clientScreeningId}
                    </p>
                  </div>

                  {isAllScreenings && (
                    <div className="mb-3">
                      <TypeChips screenings={visit.screenings} />
                    </div>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(visit.screeningDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Stethoscope className="w-4 h-4" />
                      <span>
                        {visit.screeningCount}{" "}
                        {visit.screeningCount === 1 ? "test" : "tests"}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                    onClick={() => openDetails(visit)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Details
                    </span>
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Client</th>
                    {isAllScreenings && <th className="px-6 py-4">Tests</th>}
                    <th className="px-6 py-4">Visit Date</th>
                    <th className="px-6 py-4">No. of Tests</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {visits.map((visit) => (
                    <tr
                      key={visit.visitId}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {visit.clientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {visit.clientScreeningId}
                          </p>
                        </div>
                      </td>

                      {isAllScreenings && (
                        <td className="px-6 py-4">
                          <TypeChips screenings={visit.screenings} />
                        </td>
                      )}

                      <td className="px-6 py-4 text-sm">
                        {formatDate(visit.screeningDate)}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {visit.screeningCount}
                      </td>

                      <td className="px-6 py-4">
                        <Button
                          layout="outline"
                          className="rounded-xl"
                          onClick={() => openDetails(visit)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            View Details
                          </span>
                        </Button>
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

      {/* Visit details modal (self-contained — avoids windmill Modal's findDOMNode crash) */}
      {isModalOpen && selectedVisit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDetails}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Visit Details
              </h3>
              <button
                onClick={closeDetails}
                aria-label="Close"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">
                    {selectedVisit.clientName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>{selectedVisit.clientScreeningId}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(selectedVisit.screeningDate)}</span>
                </div>
                {selectedVisit.facility && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{selectedVisit.facility}</span>
                  </div>
                )}
              </div>

              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Screenings in this visit ({selectedVisit.screenings.length})
              </h4>

              {selectedVisit.screenings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No screening records attached to this visit.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedVisit.screenings.map((s, i) => {
                    const typeBadge = getScreeningTypeBadge(s.screeningType);
                    return (
                      <div
                        key={`${s.screeningType}-${i}`}
                        className="rounded-xl border border-gray-100 dark:border-gray-700 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeBadge.color}`}
                          >
                            {typeBadge.label}
                          </span>
                          <Badge
                            type={getResultBadge(s.screeningResult) as any}
                          >
                            {s.screeningResult || "No result"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(s.screeningDate)}</span>
                        </div>

                        {s.notes && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {s.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <Button
                layout="outline"
                onClick={closeDetails}
                className="rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}