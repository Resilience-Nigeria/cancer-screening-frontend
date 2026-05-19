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
  AlertCircle,
  User,
  Calendar,
  Building2,
  Eye,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type PositiveFinding = {
  outcomeId: number;
  clientId: number;
  clientName: string;
  screeningId: string;
  cancerType: string;
  stageAtDiagnosis?: string;
  diagnosisDate: string;
  linkageToTreatment: boolean;
  treatmentFacility?: string;
  treatmentOutcome?: string;
};

export default function PositiveFindingsPage() {
  const [findings, setFindings] = useState<PositiveFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  const resultsPerPage = 10;

  async function fetchPositiveFindings() {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/positive-findings", {
        params: { page, search, limit: resultsPerPage },
      });

      const rawFindings = data?.data || [];
      const mappedFindings: PositiveFinding[] = rawFindings.map((item: any) => ({
        outcomeId: item.outcomeId ?? item.outcome_id,
        clientId: item.clientId ?? item.client_id,
        clientName: item.client?.fullName ?? item.client?.full_name ?? "Unknown",
        screeningId: item.client?.screeningId ?? item.client?.screening_id ?? "—",
        cancerType: item.cancerType ?? item.cancer_type ?? "Unknown",
        stageAtDiagnosis: item.stageAtDiagnosis ?? item.stage_at_diagnosis,
        diagnosisDate: item.diagnosisDate ?? item.diagnosis_date,
        linkageToTreatment: item.linkageToTreatment ?? item.linkage_to_treatment ?? false,
        treatmentFacility: item.treatmentFacility ?? item.treatment_facility,
        treatmentOutcome: item.treatmentOutcome ?? item.treatment_outcome,
      }));

      setFindings(mappedFindings);
      setTotalResults(data?.total || mappedFindings.length);
    } catch (err: any) {
      toast.error("Unable to load positive findings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPositiveFindings();
  }, [page, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Positive Findings</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-orange-900 via-orange-800 to-orange-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Confirmed Cases
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                All confirmed cancer cases
              </h2>

              <p className="mt-3 text-sm sm:text-base text-orange-100 leading-6">
                Track all confirmed cancer diagnoses and their treatment outcomes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
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
            className="rounded-2xl h-12 bg-orange-700 border-orange-700 hover:bg-orange-800 hover:border-orange-800"
            type="submit"
          >
            Search
          </Button>
        </form>
      </div>

      <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading positive findings...</p>
          </div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No positive findings
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {search ? "Try a different search term." : "No confirmed cancer cases found."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {findings.map((finding) => (
                <div key={finding.outcomeId} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                        {finding.clientName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {finding.clientId}
                      </p>
                    </div>
                    <Badge type="danger">Confirmed</Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <AlertCircle className="w-4 h-4" />
                      <span>{finding.cancerType}</span>
                      {finding.stageAtDiagnosis && (
                        <Badge type="warning">{finding.stageAtDiagnosis}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(finding.diagnosisDate).toLocaleDateString()}</span>
                    </div>
                    {finding.treatmentFacility && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Building2 className="w-4 h-4" />
                        <span>{finding.treatmentFacility}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Badge type={finding.linkageToTreatment ? "success" : "danger"}>
                      {finding.linkageToTreatment ? "Treatment Linked" : "Not Linked"}
                    </Badge>
                    {finding.treatmentOutcome && (
                      <Badge type="primary">{finding.treatmentOutcome}</Badge>
                    )}
                  </div>

                  <Link href={`/ncsr/client-details?clientId=${finding.clientId}`}>
                    <Button className="w-full rounded-xl bg-orange-700 border-orange-700 hover:bg-orange-800 hover:border-orange-800">
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
                    <th className="px-6 py-4">Cancer Type</th>
                    <th className="px-6 py-4">Stage</th>
                    <th className="px-6 py-4">Diagnosis Date</th>
                    <th className="px-6 py-4">Treatment Facility</th>
                    <th className="px-6 py-4">Linkage Status</th>
                    <th className="px-6 py-4">Outcome</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {findings.map((finding) => (
                    <tr
                      key={finding.outcomeId}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {finding.clientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {finding.clientId}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {finding.cancerType}
                      </td>

                      <td className="px-6 py-4">
                        {finding.stageAtDiagnosis ? (
                          <Badge type="warning">{finding.stageAtDiagnosis}</Badge>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {new Date(finding.diagnosisDate).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {finding.treatmentFacility || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <Badge type={finding.linkageToTreatment ? "success" : "danger"}>
                          {finding.linkageToTreatment ? "Linked" : "Not Linked"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        {finding.treatmentOutcome ? (
                          <Badge type="primary">{finding.treatmentOutcome}</Badge>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <Link href={`/ncsr/client-details?clientId=${finding.clientId}`}>
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
                  label="Positive findings navigation"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}