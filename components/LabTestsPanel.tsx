import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { RefreshCw, FlaskConical, Loader2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import api from "../lib/api";
import { findTest, resultLabel, testsFor, cancerName } from "../lib/screeningTests";

const chip: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  abnormal: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};

const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

type Props = {
  clientId: string;
  cancerType: string;
  /** Called when a released HPV result is available, so the form can pick up the lab values. */
  onHpvResult?: (v: { hpvResult: string; hpvGenotype: string; hpvSampleDate: string; hpvResultDate: string }) => void;
  /** Called with just the sample date when the HPV sample has been taken but there is no result yet. */
  onHpvSample?: (v: { hpvSampleDate: string }) => void;
  /** True when the HPV form fields are still empty, so a lab result can be filled in automatically. */
  hpvFormEmpty?: boolean;
  /** Current visit, if one exists. Samples tied to an earlier visit are not treated as this visit's test. */
  visitId?: number | null;
  /** A sample the user just came from (results page "Continue"); always treated as relevant. */
  acceptSampleId?: number | null;
  /** Reports whether an HPV sample exists for this visit and whether its result has been released. */
  onHpvState?: (s: { hasSample: boolean; released: boolean }) => void;
};

/**
 * Lab tests for this client and cancer type, shown inside the clinical screening step.
 * Reads the same records as the Samples & Test Results pages, so both always agree.
 * It refreshes when the doctor comes back to this tab after recording a result elsewhere.
 */
export default function LabTestsPanel({ clientId, cancerType, onHpvResult, onHpvSample, hpvFormEmpty, visitId, acceptSampleId, onHpvState }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const autoApplied = useRef<string>("");

  const load = useCallback(
    async (manual = false) => {
      if (!clientId || clientId.startsWith("OFFLINE-")) return;
      setLoading(true);
      try {
        const { data } = await api.get("/screening-samples", { params: { status: "all", clientId, cancerType } });
        const list: any[] = data?.samples ?? [];
        setRows(list);
        setOffline(false);

        if (cancerType === "cervical") {
          // This visit's HPV test: linked to this visit, not linked to any visit yet, or the one the user came from.
          const hpv = list.filter(
            (x) =>
              x.testType === "hpv_dna" &&
              (!x.visitId || (visitId && Number(x.visitId) === Number(visitId)) || (acceptSampleId && Number(x.sampleId) === Number(acceptSampleId)))
          );
          const released = hpv.find((x) => x.status === "result_released");
          const waiting = hpv.find((x) => x.status === "collected");
          onHpvState?.({ hasSample: hpv.length > 0, released: !!released });
          // A released lab result is the source of truth, so it is always filled in (the fields are locked).
          if (released && onHpvResult && autoApplied.current !== `r${released.sampleId}-${released.resultDate}`) {
            const announce = hpvFormEmpty || manual;
            autoApplied.current = `r${released.sampleId}-${released.resultDate}`;
            onHpvResult({
              hpvResult: released.result || "",
              hpvGenotype: released.resultDetail || "",
              hpvSampleDate: String(released.sampleDate).slice(0, 10),
              hpvResultDate: String(released.resultDate).slice(0, 10),
            });
            if (announce) toast.success("HPV result from the lab has been filled in and locked.");
          } else if (!released && waiting && onHpvSample && autoApplied.current !== `s${waiting.sampleId}`) {
            autoApplied.current = `s${waiting.sampleId}`;
            onHpvSample({ hpvSampleDate: String(waiting.sampleDate).slice(0, 10) });
          }
        }
        if (manual) toast.success("Lab tests refreshed.");
      } catch {
        setOffline(true);
        if (manual) toast.error("Couldn't reach the server. Showing what was loaded earlier.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, cancerType, hpvFormEmpty, visitId, acceptSampleId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when the doctor returns from the Samples page (other tab or window).
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  const open = (query: Record<string, string>) => {
    const qs = new URLSearchParams(query).toString();
    window.open(`/ncsr/screening-tests-page?${qs}`, "_blank", "noopener");
  };

  const tests = testsFor(cancerType);
  if (!clientId || tests.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-green-100 dark:border-gray-700 bg-green-50/40 dark:bg-gray-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-green-700" />
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Lab samples &amp; results — {cancerName(cancerType)}</h4>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
        </button>
      </div>

      {offline && <p className="text-xs text-amber-700 mb-2">Offline — lab results will appear here once you're back online.</p>}

      {rows.length === 0 && !loading && (
        <p className="text-xs text-gray-500 mb-3">No samples or tests recorded for this client yet.</p>
      )}

      <div className="space-y-2">
        {rows.map((x) => {
          const t = findTest(x.testType);
          const done = x.status === "result_released";
          return (
            <div key={x.sampleId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{t?.label ?? x.testType}</p>
                <p className="text-xs text-gray-500">
                  {x.sampleRef} · {t?.kind === "procedure" ? "performed" : "taken"} {fmt(x.sampleDate)}
                  {done && ` · released ${fmt(x.resultDate)}`}
                </p>
              </div>
              {done ? (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${chip[x.resultSeverity || "neutral"]}`}>{resultLabel(t, x.result)}</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">Awaiting result</span>
                  <button type="button" className="text-xs font-semibold text-green-700 underline" onClick={() => open({ tab: "results", search: clientId })}>
                    Enter result
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tests.map((t) => (
          <Button
            key={t.key}
            size="small"
            layout="outline"
            className="rounded-xl"
            onClick={() => open({ cancer: cancerType, test: t.key, search: clientId })}
          >
            <span className="inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> {t.kind === "procedure" ? "Record" : "Collect"} {t.label}
            </span>
          </Button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        Opens in a new tab so nothing on this form is lost. Come back and this list updates by itself.
      </p>
    </div>
  );
}
