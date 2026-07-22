import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, ArrowRight, History, Inbox } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

const STAGE_OPTIONS = [
  { value: "", label: "All stages" },
  { value: "screening_to_confirmation", label: "Stage 2 → Stage 3" },
  { value: "confirmation_to_treatment", label: "Stage 3 → Stage 4" },
];

function nextToolFor(referralType: string) {
  if (referralType === "screening_to_confirmation") {
    return { href: "/ncsr/diagnostic-evaluation", label: "Start Screening" };
  }
  // Stage 4 (treatment) tooling doesn't exist yet.
  return null;
}

export default function LinkedClientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isHub, setIsHub] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [stageFilter, setStageFilter] = useState("");

  useEffect(() => {
    fetchLinked();
  }, [historyMode, stageFilter]);

  async function fetchLinked() {
    setLoading(true);
    try {
      const { data } = await api.get("/clients/linked", {
        params: { history: historyMode ? 1 : undefined, stage: stageFilter || undefined },
      });
      setReferrals(data.referrals?.data || data.referrals || []);
      setIsHub(!!data.isHub);
    } catch {
      toast.error("Could not load linked clients.");
    } finally {
      setLoading(false);
    }
  }

  function startScreening(referral: any) {
    const tool = nextToolFor(referral.referralType);
    if (!tool) {
      toast.error("There's no tool for this stage yet.");
      return;
    }
    router.push(`${tool.href}?clientId=${referral.client?.clientId}&referralId=${referral.referralId}`);
  }

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Linked Clients</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Clients referred to your facility from a previous stage.
        </p>
      </div>

      {isHub && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setHistoryMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              historyMode
                ? "bg-green-700 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {historyMode ? <History className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
            {historyMode ? "Viewing Referral History" : "View Referral History"}
          </button>

          {historyMode && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <Inbox className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No linked clients right now</p>
          <p className="text-xs text-gray-400 mt-1">
            {historyMode ? "No referrals match this filter." : "Clients referred to your facility will show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {referrals.map((r: any) => {
            const tool = nextToolFor(r.referralType);
            return (
              <div
                key={r.referralId}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{r.client?.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.client?.clientId} · From {r.fromFacility?.facilityName} · {r.referralDate}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                      {r.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {STAGE_OPTIONS.find((s) => s.value === r.referralType)?.label || r.referralType}
                    </span>
                  </div>
                </div>
                {tool && r.status !== "completed" && (
                  <button
                    onClick={() => startScreening(r)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors"
                  >
                    {tool.label} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
