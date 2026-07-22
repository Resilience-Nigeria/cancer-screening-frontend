import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, ClipboardList, Search, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

const RISK_TONE: Record<string, string> = {
  low: "bg-green-50 text-green-700",
  moderate: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}

export default function SelfAssessmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAssessments();
  }, [search]);

  async function fetchAssessments() {
    setLoading(true);
    try {
      const { data } = await api.get("/self-assessments", { params: { search: search || undefined } });
      setAssessments(data.data || []);
    } catch {
      toast.error("Could not load self-assessment records.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Stage 1 — Self-Assessment Records</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Bloom self-assessment submissions from awareness registrations.
        </p>
      </div>

      <div className="mb-6 flex gap-3 max-w-md">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
          placeholder="Search by name or phone"
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
        />
        <button
          onClick={() => setSearch(searchInput)}
          className="px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : assessments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No self-assessment records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <div key={a.assessmentId} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{a.registration?.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.registration?.phoneNumber} · {a.registration?.stateOfResidence} · Completed {fmtDate(a.completedAt)}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${RISK_TONE[a.riskCategory] || "bg-gray-50 text-gray-600"}`}>
                  {a.riskCategory} risk
                </span>
              </div>
              {a.recommendation && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{a.recommendation}</p>
              )}
              {a.suggestedCancerTypesJson?.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Suggested screening: {a.suggestedCancerTypesJson.join(", ")}
                </p>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                {a.client?.clientId ? (
                  <p className="text-xs text-blue-600">Linked to client {a.client.clientId}</p>
                ) : (
                  <p className="text-xs text-gray-400">Not yet registered as a client</p>
                )}
                {a.registration?.phoneNumber && (
                  <button
                    onClick={() => router.push(`/ncsr/clinical-screening?search=${encodeURIComponent(a.client?.clientId || a.registration.phoneNumber)}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-semibold transition-colors"
                  >
                    Start Stage 2 Screening <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
