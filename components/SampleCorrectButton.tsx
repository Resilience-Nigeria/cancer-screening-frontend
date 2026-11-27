import React, { useState } from "react";
import { PencilLine, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { friendlyError } from "../lib/apiError";
import { findTest } from "../lib/screeningTests";

/**
 * "Correct" button for a sample / test row (simulation report §6).
 * Fixes a wrong procedure or specimen type, lab number, date or notes on the SAME record — no new client
 * or sample is created. The reason and the old → new values go to the activity log.
 *
 * Usage (e.g. in LabTestsPanel's Actions cell, or the Samples page):
 *   {x.status !== "booked" && <SampleCorrectButton sample={x} onDone={load} />}
 */
export default function SampleCorrectButton({ sample, onDone }: { sample: any; onDone?: () => void }) {
  const t = findTest(sample.testType) as any;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function start() {
    setForm({
      specimenType: sample.specimenType ?? "",
      collectionMethod: sample.collectionMethod ?? "",
      labSampleNumber: sample.labSampleNumber ?? "",
      sampleDate: String(sample.sampleDate ?? "").slice(0, 10),
      notes: sample.notes ?? "",
      reason: "",
    });
    setOpen(true);
  }

  async function save() {
    if (form.reason.trim().length < 3) {
      toast.error("Say briefly why you are correcting it.");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, any> = { reason: form.reason.trim(), labSampleNumber: form.labSampleNumber || null, sampleDate: form.sampleDate, notes: form.notes || null };
      if (t?.specimenTypes?.length) body.specimenType = form.specimenType || null;
      if (t?.collectionMethods?.length) body.collectionMethod = form.collectionMethod || null;
      const { data } = await api.patch(`/screening-samples/${sample.sampleId}/details`, body);
      toast.success(data?.message ?? "Corrected.");
      setOpen(false);
      onDone?.();
    } catch (e) {
      toast.error(friendlyError(e, "Could not save the correction."));
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const procedureLabel = t?.key?.includes("biopsy") ? "Biopsy procedure" : "Specimen type";

  return (
    <>
      <button type="button" onClick={start} title="Correct a wrong entry" className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 inline-flex items-center gap-1">
        <PencilLine className="w-3.5 h-3.5" /> Correct
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 p-5 sm:p-6 text-left whitespace-normal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Correct {t?.label ?? "this record"}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{sample.sampleRef} · {sample.clientId}. Changes this record only — nothing new is created.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 -m-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {t?.specimenTypes?.length ? (
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{procedureLabel}</span>
                  <select value={form.specimenType} onChange={set("specimenType")} className={input}>
                    <option value="">Select</option>
                    {t.specimenTypes.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    {form.specimenType && !t.specimenTypes.includes(form.specimenType) ? <option value={form.specimenType}>{form.specimenType} (old value)</option> : null}
                  </select>
                </label>
              ) : null}
              {t?.collectionMethods?.length ? (
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Collection method</span>
                  <select value={form.collectionMethod} onChange={set("collectionMethod")} className={input}>
                    <option value="">Select</option>
                    {t.collectionMethods.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Lab number</span>
                <input value={form.labSampleNumber} onChange={set("labSampleNumber")} className={input} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date</span>
                <input type="date" value={form.sampleDate} max={new Date().toISOString().slice(0, 10)} onChange={set("sampleDate")} className={input} />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</span>
                <textarea rows={2} value={form.notes} onChange={set("notes")} className={input} />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reason for the correction *</span>
                <input value={form.reason} onChange={set("reason")} placeholder="e.g. Wrong procedure selected — it was core needle, not FNA" className={input} />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={save} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 hover:bg-green-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save correction
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
