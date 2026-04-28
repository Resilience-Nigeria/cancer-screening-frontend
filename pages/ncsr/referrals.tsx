import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Pagination,
} from "@roketid/windmill-react-ui";
import {
  AlertTriangle,
  User,
  Building2,
  Calendar,
  Eye,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Referral = {
  outcomeId: number;
  clientId: number;
  clientName: string;
  screeningId: string;
  cancerType: string;
  diagnosisDate: string;
  linkageToTreatment: boolean;
  treatmentFacility?: string;
  followUpStatus: string;
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const resultsPerPage = 10;

  async function fetchReferrals() {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/referrals", {
        params: { page, limit: resultsPerPage },
      });

      const rawReferrals = data?.data || [];
      const mappedReferrals: Referral[] = rawReferrals.map((item: any) => ({
        outcomeId: item.outcomeId ?? item.outcome_id,
        clientId: item.clientId ?? item.client_id,
        clientName: item.client?.fullName ?? item.client?.full_name ?? "Unknown",
        screeningId: item.client?.screeningId ?? item.client?.screening_id ?? "—",
        cancerType: item.cancerType ?? item.cancer_type ?? "Unknown",
        diagnosisDate: item.diagnosisDate ?? item.diagnosis_date,
        linkageToTreatment: item.linkageToTreatment ?? item.linkage_to_treatment ?? false,
        treatmentFacility: item.treatmentFacility ?? item.treatment_facility,
        followUpStatus: item.followUpStatus ?? item.follow_up_status ?? "pending",
      }));

      setReferrals(mappedReferrals);
      setTotalResults(data?.total || mappedReferrals.length);
    } catch (err: any) {
      toast.error("Unable to load referrals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReferrals();
  }, [page]);

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Referral Alerts</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-red-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Urgent Cases
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                Confirmed cancer cases requiring linkage to treatment
              </h2>

              <p className="mt-3 text-sm sm:text-base text-red-100 leading-6">
                These cases need immediate attention for treatment linkage and follow-up.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading referrals...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No referral alerts
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              All cases are linked to treatment.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {referrals.map((referral) => (
                <div key={referral.outcomeId} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                        {referral.clientName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {referral.screeningId}
                      </p>
                    </div>
                    <Badge type={referral.linkageToTreatment ? "success" : "danger"}>
                      {referral.linkageToTreatment ? "Linked" : "Not Linked"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{referral.cancerType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(referral.diagnosisDate).toLocaleDateString()}</span>
                    </div>
                    {referral.treatmentFacility && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Building2 className="w-4 h-4" />
                        <span>{referral.treatmentFacility}</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/ncsr/client-details?clientId=${referral.clientId}`}>
                    <Button className="w-full rounded-xl bg-red-700 border-red-700 hover:bg-red-800 hover:border-red-800">
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
                    <th className="px-6 py-4">Diagnosis Date</th>
                    <th className="px-6 py-4">Treatment Facility</th>
                    <th className="px-6 py-4">Treatment Linkage</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {referrals.map((referral) => (
                    <tr
                      key={referral.outcomeId}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {referral.clientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {referral.screeningId}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {referral.cancerType}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {new Date(referral.diagnosisDate).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {referral.treatmentFacility || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <Badge type={referral.linkageToTreatment ? "success" : "danger"}>
                          {referral.linkageToTreatment ? "Linked" : "Not Linked"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <Badge type="warning">{referral.followUpStatus}</Badge>
                      </td>

                      <td className="px-6 py-4">
                        <Link href={`/ncsr/client-details?clientId=${referral.clientId}`}>
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
                  label="Referrals navigation"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}