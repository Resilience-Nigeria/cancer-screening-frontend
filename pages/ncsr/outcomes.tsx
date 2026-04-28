import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Pagination,
  Input,
} from "@roketid/windmill-react-ui";
import {
  Search,
  Activity,
  User,
  Calendar,
  Building2,
  Eye,
  Loader2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Outcome = {
  outcomeId: number;
  clientId: number;
  clientName: string;
  screeningId: string;
  
  // Screening
  screeningResult?: string;
  screeningDate?: string;
  
  // Diagnosis
  cancerType?: string;
  cancerStage?: string;
  diagnosisDate?: string;
  
  // Treatment
  treatmentCommenced?: string;
  treatmentStatus?: string;
  treatmentFacility?: string;
  
  // Outcome
  clinicalOutcome?: string;
  
  // Follow-up
  followUpEstablished?: string;
  nextFollowUpDate?: string;
};

export default function OutcomesPage() {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const resultsPerPage = 10;

  async function fetchOutcomes() {
    setLoading(true);
    try {
      const { data } = await api.get("/outcomes", {
        params: { 
          page, 
          search, 
          limit: resultsPerPage,
          status: filterStatus !== "all" ? filterStatus : undefined,
        },
      });

      const rawOutcomes = data?.data || [];
      const mappedOutcomes: Outcome[] = rawOutcomes.map((item: any) => ({
        outcomeId: item.outcomeId ?? item.outcome_id ?? item.id,
        clientId: item.clientId ?? item.client_id,
        clientName: item.client?.fullName ?? item.client?.full_name ?? "Unknown",
        screeningId: item.client?.screeningId ?? item.client?.screening_id ?? "—",
        
        screeningResult: item.screeningResult ?? item.screening_result,
        screeningDate: item.screeningDate ?? item.screening_date,
        
        cancerType: item.cancerType ?? item.cancer_type,
        cancerStage: item.cancerStage ?? item.cancer_stage,
        diagnosisDate: item.diagnosisDate ?? item.diagnosis_date,
        
        treatmentCommenced: item.treatmentCommenced ?? item.treatment_commenced,
        treatmentStatus: item.treatmentStatus ?? item.treatment_status,
        treatmentFacility: item.treatmentFacility ?? item.treatment_facility,
        
        clinicalOutcome: item.clinicalOutcome ?? item.clinical_outcome,
        
        followUpEstablished: item.followUpEstablished ?? item.follow_up_established,
        nextFollowUpDate: item.nextFollowUpDate ?? item.next_follow_up_date,
      }));

      setOutcomes(mappedOutcomes);
      setTotalResults(data?.total || mappedOutcomes.length);
    } catch (err: any) {
      toast.error("Unable to load outcomes");
      console.error("Error fetching outcomes:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOutcomes();
  }, [page, search, filterStatus]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function getScreeningBadge(result?: string) {
    if (!result) return { type: "neutral" as const, text: "—" };
    const lower = result.toLowerCase();
    if (lower === "positive") return { type: "danger" as const, text: "Positive" };
    if (lower === "negative") return { type: "success" as const, text: "Negative" };
    return { type: "warning" as const, text: "Inconclusive" };
  }

  function getTreatmentStatusBadge(status?: string) {
    if (!status) return { type: "neutral" as const, text: "—" };
    const lower = status.toLowerCase();
    if (lower === "completed") return { type: "success" as const, text: "Completed" };
    if (lower === "discontinued") return { type: "danger" as const, text: "Discontinued" };
    if (lower.includes("progress")) return { type: "primary" as const, text: "In Progress" };
    return { type: "neutral" as const, text: status };
  }

  function getClinicalOutcomeBadge(outcome?: string) {
    if (!outcome) return { type: "neutral" as const, text: "—" };
    const lower = outcome.toLowerCase();
    if (lower.includes("remission")) return { type: "success" as const, text: outcome.replace(/_/g, ' ') };
    if (lower === "stable_disease") return { type: "primary" as const, text: "Stable Disease" };
    if (lower === "progressive_disease") return { type: "warning" as const, text: "Progressive Disease" };
    if (lower === "recurrence") return { type: "danger" as const, text: "Recurrence" };
    if (lower === "death") return { type: "danger" as const, text: "Death" };
    return { type: "neutral" as const, text: outcome.replace(/_/g, ' ') };
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>All Outcomes</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Treatment & Follow-up
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                Complete Case Outcomes Registry
              </h2>

              <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                Track all screening outcomes, treatment journeys, and follow-up status across your facility.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
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

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filterStatus === "all"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              All Outcomes
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("positive")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filterStatus === "positive"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Positive Screening
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("in_treatment")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filterStatus === "in_treatment"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              In Treatment
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("follow_up")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filterStatus === "follow_up"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Follow-up Required
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading outcomes...</p>
          </div>
        ) : outcomes.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No outcomes found
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {search ? "Try a different search term." : "No outcome records available."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {outcomes.map((outcome) => {
                const screeningBadge = getScreeningBadge(outcome.screeningResult);
                const treatmentBadge = getTreatmentStatusBadge(outcome.treatmentStatus);
                const outcomeBadge = getClinicalOutcomeBadge(outcome.clinicalOutcome);

                return (
                  <div key={outcome.outcomeId} className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          {outcome.clientName}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {outcome.screeningId}
                        </p>
                      </div>
                      <Badge type={screeningBadge.type}>{screeningBadge.text}</Badge>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      {outcome.cancerType && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <AlertCircle className="w-4 h-4" />
                          <span className="capitalize">{outcome.cancerType}</span>
                          {outcome.cancerStage && (
                            <Badge type="warning">{outcome.cancerStage.replace(/_/g, ' ')}</Badge>
                          )}
                        </div>
                      )}
                      {outcome.screeningDate && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span>Screened: {new Date(outcome.screeningDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {outcome.treatmentFacility && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Building2 className="w-4 h-4" />
                          <span>{outcome.treatmentFacility}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {outcome.treatmentStatus && (
                        <Badge type={treatmentBadge.type}>{treatmentBadge.text}</Badge>
                      )}
                      {outcome.clinicalOutcome && (
                        <Badge type={outcomeBadge.type}>{outcomeBadge.text}</Badge>
                      )}
                      {outcome.followUpEstablished === "yes" && (
                        <Badge type="primary">Follow-up Established</Badge>
                      )}
                    </div>

                    <Link href={`/ncsr/client-details?clientId=${outcome.clientId}`}>
                      <Button className="w-full rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800">
                        <span className="inline-flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View Details
                        </span>
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Screening</th>
                    <th className="px-6 py-4">Cancer Type</th>
                    <th className="px-6 py-4">Stage</th>
                    <th className="px-6 py-4">Treatment Status</th>
                    <th className="px-6 py-4">Clinical Outcome</th>
                    <th className="px-6 py-4">Follow-up</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {outcomes.map((outcome) => {
                    const screeningBadge = getScreeningBadge(outcome.screeningResult);
                    const treatmentBadge = getTreatmentStatusBadge(outcome.treatmentStatus);
                    const outcomeBadge = getClinicalOutcomeBadge(outcome.clinicalOutcome);

                    return (
                      <tr
                        key={outcome.outcomeId}
                        className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">
                              {outcome.clientName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {outcome.screeningId}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge type={screeningBadge.type}>{screeningBadge.text}</Badge>
                          {outcome.screeningDate && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(outcome.screeningDate).toLocaleDateString()}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm capitalize">
                            {outcome.cancerType || "—"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {outcome.cancerStage ? (
                            <Badge type="warning">
                              {outcome.cancerStage.replace(/_/g, ' ')}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <Badge type={treatmentBadge.type}>{treatmentBadge.text}</Badge>
                        </td>

                        <td className="px-6 py-4">
                          <Badge type={outcomeBadge.type}>{outcomeBadge.text}</Badge>
                        </td>

                        <td className="px-6 py-4">
                          {outcome.followUpEstablished === "yes" ? (
                            <div>
                              <Badge type="success">Established</Badge>
                              {outcome.nextFollowUpDate && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Next: {new Date(outcome.nextFollowUpDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : outcome.screeningResult === "negative" ? (
                            <Badge type="warning">Pending</Badge>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <Link href={`/ncsr/client-details?clientId=${outcome.clientId}`}>
                            <Button layout="outline" className="rounded-xl">
                              <span className="inline-flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                View
                              </span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalResults > resultsPerPage && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                <Pagination
                  totalResults={totalResults}
                  resultsPerPage={resultsPerPage}
                  onChange={setPage}
                  label="Outcomes navigation"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}