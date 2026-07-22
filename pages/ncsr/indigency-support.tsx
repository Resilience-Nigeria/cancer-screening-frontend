import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, HeartHandshake, Users, AlertTriangle, Search } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type SocioeconomicSummary = {
  classDistribution: Record<string, number>;
  classByCancerRisk: Record<string, Record<string, number>>;
  lowerClassTotal: number;
  lowerClassWithConfirmedCancer: number;
  lowerClassWithActiveTreatment: number;
};

const CLASS_TONE: Record<string, string> = {
  upper: "bg-green-50 text-green-700",
  middle: "bg-blue-50 text-blue-700",
  lower: "bg-red-50 text-red-700",
};

const RISK_TONE: Record<string, string> = {
  low: "bg-green-50 text-green-700",
  intermediate: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

export default function IndigencySupportPage() {
  const router = useRouter();
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<SocioeconomicSummary | null>(null);

  const [loadingClients, setLoadingClients] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [confirmedCancerOnly, setConfirmedCancerOnly] = useState(false);
  const [activeTreatmentOnly, setActiveTreatmentOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchClients();
  }, [confirmedCancerOnly, activeTreatmentOnly, search]);

  async function fetchSummary() {
    setLoadingSummary(true);
    try {
      const { data } = await api.get("/analytics/socioeconomic");
      if (data.status) setSummary(data.data);
    } catch {
      toast.error("Could not load socio-economic analytics.");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function fetchClients() {
    setLoadingClients(true);
    try {
      const { data } = await api.get("/indigency-support", {
        params: {
          confirmedCancerOnly: confirmedCancerOnly ? 1 : undefined,
          activeTreatmentOnly: activeTreatmentOnly ? 1 : undefined,
          search: search || undefined,
        },
      });
      setClients(data.data || []);
    } catch {
      toast.error("Could not load the client list.");
    } finally {
      setLoadingClients(false);
    }
  }

  const totalClassified = summary
    ? Object.values(summary.classDistribution || {}).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Indigency Support</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Socio-economic status breakdown (NICRAT model) to help identify clients who may need financial or support assistance.
        </p>
      </div>

      {loadingSummary ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {["upper", "middle", "lower"].map((cls) => (
              <div key={cls} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${CLASS_TONE[cls]}`}>
                    {cls} Class
                  </span>
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {summary.classDistribution?.[cls] ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalClassified > 0
                    ? `${Math.round(((summary.classDistribution?.[cls] ?? 0) / totalClassified) * 100)}% of classified clients`
                    : "No data yet"}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Most in need of support (Lower class)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{summary.lowerClassTotal}</p>
                <p className="text-xs text-gray-500 mt-1">Total lower-class clients</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-700">{summary.lowerClassWithConfirmedCancer}</p>
                <p className="text-xs text-gray-500 mt-1">With confirmed cancer diagnosis</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-700">{summary.lowerClassWithActiveTreatment}</p>
                <p className="text-xs text-gray-500 mt-1">With active treatment plan</p>
              </div>
            </div>

            {Object.keys(summary.classByCancerRisk || {}).length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cancer Risk by Socio-Economic Class</p>
                <div className="space-y-2">
                  {Object.entries(summary.classByCancerRisk).map(([cls, riskCounts]) => (
                    <div key={cls} className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize w-20 justify-center ${CLASS_TONE[cls] || "bg-gray-50 text-gray-600"}`}>
                        {cls}
                      </span>
                      {["low", "intermediate", "high"].map((risk) => (
                        <span key={risk} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RISK_TONE[risk]}`}>
                          {risk}: {(riskCounts as any)[risk] ?? 0}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-1 min-w-[240px]">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            placeholder="Search by name, phone, or client ID"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
          />
          <button onClick={() => setSearch(searchInput)} className="px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={confirmedCancerOnly} onChange={(e) => setConfirmedCancerOnly(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
          Confirmed cancer only
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={activeTreatmentOnly} onChange={(e) => setActiveTreatmentOnly(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
          Active treatment only
        </label>
      </div>

      {loadingClients ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : clients.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <HeartHandshake className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No clients match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <div key={c.clientId} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">{c.fullName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.clientId} · {c.phoneNumber || "no phone"} · {c.facility?.facilityName}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {c.latestRiskProfile?.cancerRiskCategory && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${RISK_TONE[c.latestRiskProfile.cancerRiskCategory]}`}>
                      {c.latestRiskProfile.cancerRiskCategory} risk
                    </span>
                  )}
                  {c.outcome?.cancerConfirmed === "yes" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                      Confirmed cancer
                    </span>
                  )}
                  {c.treatmentPlans?.length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                      Active treatment
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push(`/ncsr/client-details?clientId=${c.clientId}`)}
                className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold"
              >
                View Client
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
