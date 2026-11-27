import React, { useEffect, useState } from "react";
import { ArrowRightCircle, CalendarPlus, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { breastNextStep } from "../../lib/screeningWizardConfig";

/**
 * Simulation report §5 — after an abnormal CBE, recommend the next evaluation by age
 * (under 40: breast ultrasound; 40 and over: mammography) and book it in one step.
 */
const SERVICE_SLUGS: Record<string, string[]> = {
  mammography: ["mammography", "mammogram"],
  breast_ultrasound: ["breast-ultrasound", "ultrasound", "uss"],
};

export default function BreastNextStep({
  clientId,
  visitId,
  values,
  age,
  alreadyInVisit,
  onBooked,
}: {
  clientId: string;
  visitId?: number | string | null;
  values: Record<string, any>;
  age: number | null;
  /** Test keys already taken / booked in this visit (from the tests panel). */
  alreadyInVisit?: string[];
  onBooked?: () => void;
}) {
  const next = breastNextStep(values, age);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [notes, setNotes] = useState("");
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loadingFac, setLoadingFac] = useState(false);
  const [facNote, setFacNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!open || !next) return;
    let cancelled = false;
    (async () => {
      setLoadingFac(true);
      setFacNote("");
      try {
        const { data } = await api.get("/services");
        const services: any[] = data?.services ?? data?.data ?? (Array.isArray(data) ? data : []);
        const norm = (v: any) => String(v || "").toLowerCase().replace(/[\s_]+/g, "-");
        const service =
          (SERVICE_SLUGS[next.test] || []).map((w) => services.find((s) => norm(s.slug) === w)).find(Boolean) ||
          services.find((s) => String(s.name || "").toLowerCase().includes(next.test === "mammography" ? "mammo" : "ultrasound"));
        if (!service?.slug) {
          if (!cancelled) setFacNote(`${next.label} isn't set up as a service yet (Facilities › Services), so no facility list is available.`);
          return;
        }
        const res = await api.get(`/services/${service.slug}/facilities`);
        if (!cancelled) {
          const rows: any[] = res.data?.facilities ?? [];
          setFacilities(rows);
          if (!rows.length) setFacNote(`No facility offers ${service.name || next.label} yet.`);
        }
      } catch {
        if (!cancelled) setFacNote("Could not load the facilities.");
      } finally {
        if (!cancelled) setLoadingFac(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, next?.test]);

  if (!next) return null;
  const done = booked || (alreadyInVisit ?? []).includes(next.test);

  async function book() {
    if (!next) return;
    if (!date || !facilityId) {
      toast.error("Choose the date and the facility.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/clients/${clientId}/screening-samples/book`, {
        testType: next.test,
        bookedFor: date,
        facilityId: Number(facilityId),
        notes: notes.trim() || `Recommended after abnormal CBE. ${next.reason}`,
        visitId: visitId || null,
      });
      toast.success(`${next.label} booked.`);
      setBooked(true);
      setOpen(false);
      onBooked?.();
    } catch (e) {
      toast.error(friendlyError(e, "Could not book it."));
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4">
      <div className="flex items-start gap-3">
        <ArrowRightCircle className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-blue-900 dark:text-blue-200">Recommended next step: {next.label}</p>
          <p className="text-sm text-blue-900/80 dark:text-blue-200/80 mt-0.5">{next.reason}</p>
          {done ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <CheckCircle2 className="w-4 h-4" /> Booked / recorded for this visit
            </p>
          ) : !open ? (
            <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-sm font-semibold text-white">
              <CalendarPlus className="w-4 h-4" /> Book {next.label.toLowerCase()}
            </button>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Date</span>
                <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Facility</span>
                <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
                  <option value="">{loadingFac ? "Loading…" : "Select a facility"}</option>
                  {facilities.map((f) => (
                    <option key={f.facilityId ?? f.id} value={f.facilityId ?? f.id}>
                      {f.facilityName ?? f.name}
                      {f.facilityState ? ` (${f.facilityState})` : ""}
                    </option>
                  ))}
                </select>
                {facNote ? <span className="block text-xs text-amber-700 mt-1">{facNote}</span> : null}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Notes (optional)</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sent with the booking" className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
              </label>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold">Cancel</button>
                <button type="button" onClick={book} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} Book
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Under 40: breast ultrasound · 40 and over: mammography (national protocol). Clinical judgement applies.</p>
        </div>
      </div>
    </div>
  );
}
