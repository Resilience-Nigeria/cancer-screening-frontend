import React, { useEffect, useState } from "react";
import { Sparkles, Loader2, Upload, X, CheckSquare, Square, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { BIOPSY_PROCEDURE_OPTIONS, BREAST_CHANGE_OPTIONS, CBE_RESULT_OPTIONS } from "../../lib/screeningWizardConfig";

/**
 * AI-assisted summary of an uploaded breast report (simulation report §9).
 * The health worker uploads a photo / PDF of an ultrasound, mammography, biopsy or CBE report, gets a bullet
 * summary and SUGGESTED form values, ticks the ones that are right and applies them. Nothing is saved until the
 * form itself is saved. Hidden unless the server has AI turned on (NCSR_AI_ENABLED).
 */
const LABELS: Record<string, string> = {
  leftCbeResult: "Left breast — CBE result", rightCbeResult: "Right breast — CBE result", physicalChanges: "Physical changes",
  physicalChangesOther: "Other change", breastPain: "Breast tenderness", leftBiradsScore: "Left BI-RADS", rightBiradsScore: "Right BI-RADS",
  leftBreastDensity: "Left density", rightBreastDensity: "Right density", leftImagingFinding: "Left imaging finding",
  rightImagingFinding: "Right imaging finding", biopsyProcedure: "Biopsy procedure", histologyResult: "Histology", ihcResult: "IHC result",
};
const opt = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v;
function show(k: string, v: any): string {
  if (k === "physicalChanges") return (v as string[]).map((c) => opt(BREAST_CHANGE_OPTIONS, c)).join(", ");
  if (k === "leftCbeResult" || k === "rightCbeResult") return opt(CBE_RESULT_OPTIONS, v);
  if (k === "biopsyProcedure") return opt(BIOPSY_PROCEDURE_OPTIONS, v);
  if (k.endsWith("BiradsScore")) return `BI-RADS ${v}`;
  if (k.endsWith("BreastDensity")) return `ACR ${String(v).toUpperCase()}`;
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return String(v);
}

let statusCache: boolean | null = null;

export default function ReportSummary({ onApply }: { onApply: (fields: Record<string, any>) => void }) {
  const [enabled, setEnabled] = useState<boolean>(!!statusCache);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState("ultrasound");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [pick, setPick] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (statusCache !== null) return;
    api.get("/ai/status").then(({ data }) => {
      statusCache = !!data?.enabled;
      setEnabled(statusCache);
    }).catch(() => {
      statusCache = false;
    });
  }, []);

  if (!enabled) return null;

  async function run() {
    if (!file) return toast.error("Choose the report file first.");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("reportType", kind);
    setBusy(true);
    setRes(null);
    try {
      const { data } = await api.post("/ai/report-summary", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setRes(data);
      setPick(Object.fromEntries(Object.keys(data?.fields ?? {}).map((k) => [k, true])));
    } catch (e) {
      toast.error(friendlyError(e, "Could not summarise the report."));
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    const chosen = Object.fromEntries(Object.entries(res?.fields ?? {}).filter(([k]) => pick[k]));
    if (!Object.keys(chosen).length) return toast.error("Tick at least one value to apply.");
    if (chosen.leftCbeResult || chosen.rightCbeResult || chosen.physicalChanges) (chosen as any).methodCbe = true;
    if (chosen.leftBiradsScore || chosen.rightBiradsScore) (chosen as any)[kind === "mammography" ? "methodMammography" : "methodUltrasound"] = true;
    if (chosen.biopsyProcedure || chosen.histologyResult) (chosen as any).biopsyDone = true;
    onApply(chosen);
    toast.success("Applied to the form — check it, then save.");
    setOpen(false);
    setRes(null);
    setFile(null);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 dark:bg-violet-900/20 px-4 py-2 text-sm font-semibold text-violet-800 dark:text-violet-200 hover:bg-violet-100">
        <Sparkles className="w-4 h-4" /> Summarise an uploaded report (AI)
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-600" /> Summarise a report</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload a photo or PDF of the report. You'll see a summary and suggested values to apply — nothing is saved until you save the form.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 -m-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[["ultrasound", "Breast ultrasound"], ["mammography", "Mammography"], ["biopsy", "Biopsy / histology"], ["cbe", "CBE notes"], ["other", "Other"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setKind(v)} className={`px-3 py-1.5 rounded-full text-sm border ${kind === v ? "bg-violet-700 border-violet-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>{l}</button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{file ? file.name : "Choose a photo (JPG, PNG) or PDF of the report"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {!res && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={run} disabled={busy || !file} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 hover:bg-violet-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {busy ? "Reading the report…" : "Summarise"}
                </button>
              </div>
            )}

            {res && (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Summary</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-gray-700 dark:text-gray-200 space-y-0.5">
                    {(res.bullets ?? []).map((b: string, i: number) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
                {Object.keys(res.fields ?? {}).length ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Suggested values — untick anything that's wrong</p>
                    <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700">
                      {Object.entries(res.fields).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => setPick((p) => ({ ...p, [k]: !p[k] }))} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm">
                          {pick[k] ? <CheckSquare className="w-4 h-4 text-violet-700 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                          <span className="flex-1 text-gray-600 dark:text-gray-300">{LABELS[k] ?? k}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{show(k, v)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No form values could be read with confidence — use the summary above.</p>
                )}
                {res.unclear?.length ? <p className="text-xs text-amber-700">Unclear: {res.unclear.join("; ")}</p> : null}
                <p className="text-xs text-gray-500 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {res.disclaimer}</p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <button type="button" onClick={() => setRes(null)} className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold">Try another file</button>
                  {Object.keys(res.fields ?? {}).length ? (
                    <button type="button" onClick={apply} className="rounded-xl bg-green-700 hover:bg-green-800 px-4 py-2 text-sm font-semibold text-white">Apply ticked values to the form</button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
