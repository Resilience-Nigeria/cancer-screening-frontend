import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Input,
  Button,
  Badge,
  Pagination,
  Select,
} from "@roketid/windmill-react-ui";
import {
  Search,
  CalendarDays,
  ClipboardList,
  UserRound,
  Eye,
  FileText,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Visit = {
  visitId: number;
  visitDate: string;
  visitType: string;
  notes?: string | null;
  client?: {
    clientId: number;
    fullName: string;
    phoneNumber?: string | null;
  };
  cervicalScreening?: any;
  breastScreening?: any;
  colorectalScreening?: any;
  liverScreening?: any;
  prostateScreening?: any;
  stage3Referral?: { referralId: number; status: string } | null;
  stage3Evaluation?: { evaluationId: number; status: string; decisionPathway: string | null } | null;
};

type VisitsResponse = {
  data?: any[];
  visits?: any[];
  total?: number;
};

function formatVisitType(value?: string | null) {
  if (!value) return "—";
  if (value === "follow_up" || value === "followUp") return "Follow Up";
  if (value === "initial") return "Initial";
  return value;
}

function getVisitTypeBadge(value?: string | null) {
  if (value === "initial") return "success";
  if (value === "follow_up" || value === "followUp") return "warning";
  return "primary";
}

function countCompletedModules(visit: Visit) {
  return [
    visit.cervicalScreening,
    visit.breastScreening,
    visit.colorectalScreening,
    visit.liverScreening,
    visit.prostateScreening,
  ].filter(Boolean).length;
}

export default function VisitsIndexPage() {
  const router = useRouter();
  const { filter } = router.query;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [visitType, setVisitType] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  const resultsPerPage = 10;

  // Determine page title and description based on filter
  const getPageInfo = () => {
    if (filter === "this_month") {
      return {
        title: "Screenings This Month",
        description: "All screening visits conducted this month",
        gradient: "from-emerald-900 via-emerald-800 to-emerald-700",
      };
    } else if (filter === "pending_followups") {
      return {
        title: "Pending Follow-ups",
        description: "Follow-up visits that require attention",
        gradient: "from-amber-900 via-amber-800 to-amber-700",
      };
    }
    return {
      title: "All Visits",
      description: "View all visits across registered clients in your facility",
      gradient: "from-green-900 via-green-800 to-green-700",
    };
  };

  const pageInfo = getPageInfo();

  async function fetchVisits() {
    setLoading(true);

    try {
      const params: any = {
        page,
        search,
        visitType: visitType || undefined,
      };

      // Add filter parameter
      if (filter) {
        params.filter = filter;
      }

      const { data } = await api.get<VisitsResponse>("/visits", {
        params,
      });

      const rawVisits = data?.data || data?.visits || [];

      const mappedVisits: Visit[] = rawVisits.map((visit: any) => ({
        visitId: visit.visitId ?? visit.id,
        visitDate: visit.visitDate ?? visit.visit_date ?? "",
        visitType: visit.visitType ?? visit.visit_type ?? "",
        notes: visit.notes ?? "",
        client: visit.client
          ? {
              clientId: visit.client.clientId ?? visit.client.id,
              fullName: visit.client.fullName ?? visit.client.full_name ?? "",
              phoneNumber:
                visit.client.phoneNumber ?? visit.client.phone_number ?? "",
            }
          : undefined,
        cervicalScreening:
          visit.cervicalScreening ?? visit.cervical_screening ?? null,
        breastScreening:
          visit.breastScreening ?? visit.breast_screening ?? null,
        colorectalScreening:
          visit.colorectalScreening ?? visit.colorectal_screening ?? null,
        liverScreening: visit.liverScreening ?? visit.liver_screening ?? null,
        prostateScreening:
          visit.prostateScreening ?? visit.prostate_screening ?? null,
        stage3Referral: visit.stage3Referral ?? null,
        stage3Evaluation: visit.stage3Evaluation ?? null,
      }));

      setVisits(mappedVisits);
      setTotalResults(data?.total || mappedVisits.length || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load visits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVisits();
  }, [page, search, visitType, filter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setVisitType("");
    // Remove filter from URL
    router.push("/ncsr/visits", undefined, { shallow: true });
  }

  function clearFilter() {
    router.push("/ncsr/visits", undefined, { shallow: true });
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>{pageInfo.title}</PageTitle>

        <div className={`mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700  shadow-xl`}>
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                National Cancer Screening Register
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                {pageInfo.title}
              </h2>

              <p className="mt-3 text-sm sm:text-base text-white/90 leading-6">
                {pageInfo.description}
              </p>

              {filter && (
                <div className="mt-4">
                  <Button
                    layout="outline"
                    className="rounded-2xl border-white/40 text-white hover:bg-white/10"
                    onClick={clearFilter}
                  >
                    <span className="inline-flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Clear Filter
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr,220px,auto,auto]">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Input
                className="pl-11 h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                placeholder="Search by client name, phone, or notes"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </form>

          <div className="relative">
            <Select
              className="h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm pl-10"
              value={visitType}
              onChange={(e) => {
                setPage(1);
                setVisitType(e.target.value);
              }}
            >
              <option value="">All Visit Types</option>
              <option value="initial">Initial</option>
              <option value="follow_up">Follow Up</option>
            </Select>
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Filter className="w-4 h-4" />
            </div>
          </div>

          <Button
            className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            onClick={handleSearchSubmit as any}
          >
            Search
          </Button>

          <Button
            layout="outline"
            className="rounded-2xl h-12"
            onClick={resetFilters}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Visit Register
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {loading
            ? "Loading visits..."
            : `${totalResults} visit${totalResults === 1 ? "" : "s"} found`}
        </p>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 animate-pulse"
            >
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          ))
        ) : visits.length > 0 ? (
          visits.map((visit) => (
            <div
              key={visit.visitId}
              className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    Visit #{visit.visitId}
                  </h3>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    Client Id: {visit?.client?.clientId}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {visit.client?.fullName || "Unknown client"}
                  </p>
                </div>

                <Badge type={getVisitTypeBadge(visit.visitType) as any}>
                  {formatVisitType(visit.visitType)}
                </Badge>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{new Date(visit.visitDate).toLocaleDateString()}</span>
                </div>

                <div className="flex items-start gap-2">
                  <UserRound className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{visit.client?.phoneNumber || "No phone number"}</span>
                </div>

                <div className="flex items-start gap-2">
                  <ClipboardList className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {countCompletedModules(visit)} module
                    {countCompletedModules(visit) === 1 ? "" : "s"} completed
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{visit.notes || "No notes added"}</span>
                </div>

                {(visit.stage3Referral || visit.stage3Evaluation) && (
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700">
                      {visit.stage3Evaluation
                        ? `Stage 3: ${(visit.stage3Evaluation.decisionPathway || visit.stage3Evaluation.status).replace(/_/g, " ")}`
                        : `Stage 3: ${visit.stage3Referral?.status}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <Link href={`/ncsr/visit-details?visitId=${visit.visitId}`}>
                  <Button className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800">
                    <span className="inline-flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Open Visit
                    </span>
                  </Button>
                </Link>
                {visit.stage3Evaluation && (
                  <Link href={`/ncsr/diagnostic-evaluation?clientId=${visit.client?.clientId}`}>
                    <span className="block text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline cursor-pointer">
                      View Stage 3 Evaluation
                    </span>
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
            <ClipboardList className="w-10 h-10 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No visits found
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {filter ? "No visits match the current filter." : "Try a different search or filter."}
            </p>
          </div>
        )}

        {!loading && totalResults > resultsPerPage ? (
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={setPage}
              label="Visits navigation"
            />
          </div>
        ) : null}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-normal">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4">Visit</th>
                <th className="px-6 py-4">Client ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Visit Type</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Modules</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : visits.length > 0 ? (
                visits.map((visit) => (
                  <tr
                    key={visit.visitId}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          Visit #{visit.visitId}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {visit?.client?.clientId}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {visit.client?.fullName || "Unknown client"}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {visit.client?.phoneNumber || "No phone number"}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge type={getVisitTypeBadge(visit.visitType) as any}>
                        {formatVisitType(visit.visitType)}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {new Date(visit.visitDate).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {countCompletedModules(visit)} completed
                    </td>

                    <td className="px-6 py-4 text-sm max-w-[260px]">
                      <span className="line-clamp-2">
                        {visit.notes || "No notes added"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <Link href={`/ncsr/visit-details?visitId=${visit.visitId}`}>
                        <Button layout="outline" className="rounded-xl">
                          <span className="inline-flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Open
                          </span>
                        </Button>
                      </Link>
                      {visit.stage3Evaluation && (
                        <Link href={`/ncsr/diagnostic-evaluation?clientId=${visit.client?.clientId}`}>
                          <span className="block mt-2 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline cursor-pointer">
                            Stage 3 Evaluation
                          </span>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <ClipboardList className="w-10 h-10 mx-auto text-gray-400" />
                    <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                      No visits found
                    </h4>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {filter ? "No visits match the current filter." : "Try a different search or filter."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalResults > resultsPerPage ? (
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={setPage}
              label="Visits table navigation"
            />
          </div>
        ) : null}
      </div>
    </Layout>
  );
}