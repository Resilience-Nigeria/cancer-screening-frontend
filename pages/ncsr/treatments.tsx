import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, Activity, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

const STATUS_TONE: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  closed: "bg-gray-100 text-gray-600",
};

const OUTCOME_TONE: Record<string, string> = {
  complete_response: "bg-green-50 text-green-700",
  disease_free: "bg-green-50 text-green-700",
  remission: "bg-green-50 text-green-700",
  partial_response: "bg-amber-50 text-amber-700",
  stable_disease: "bg-amber-50 text-amber-700",
  progressive_disease: "bg-red-50 text-red-700",
  recurrence: "bg-red-50 text-red-700",
  deceased: "bg-gray-200 text-gray-700",
  lost_to_followup: "bg-gray-100 text-gray-600",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}

export default function TreatmentsTrackingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  async function fetchPlans() {
    setLoading(true);
    try {
      const { data } = await api.get("/treatment-plans", {
        params: { status: statusFilter || undefined },
      });
      setPlans(data.data || data.plans || []);
    } catch {
      toast.error("Could not load treatment plans.");
    } finally {
      setLoading(false);
    }
  }

  function resume(clientId: string) {
    router.push(`/ncsr/treatment-plan?clientId=${clientId}`);
  }

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Treatment Tracking</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          All Stage 4 treatment plans across your facilities — active and closed.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { value: "", label: "All" },
          { value: "active", label: "Active" },
          { value: "closed", label: "Closed" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === opt.value ? "bg-green-700 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <Activity className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No treatment plans match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.treatmentPlanId} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">{p.client?.fullName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.client?.clientId} · {p.facility?.facilityName} · {p.treatmentIntent ? p.treatmentIntent.replace(/_/g, " ") : "intent not set"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_TONE[p.status] || "bg-gray-50 text-gray-600"}`}>
                    {p.status}
                  </span>
                  {p.treatmentOutcome && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${OUTCOME_TONE[p.treatmentOutcome] || "bg-gray-50 text-gray-600"}`}>
                      {p.treatmentOutcome.replace(/_/g, " ")}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {p.treatmentRecords?.length || 0} modalit{(p.treatmentRecords?.length || 0) === 1 ? "y" : "ies"} · Started {fmtDate(p.created_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => resume(p.client?.clientId)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors"
              >
                Open <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
