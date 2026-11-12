import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { RefreshCw, Loader2, X, ClipboardList, CalendarPlus, TestTube2, FileCheck2, Stethoscope, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";

import api from "../lib/api";
import { friendlyError } from "../lib/apiError";
import { findTest, resultLabel, cancerName } from "../lib/screeningTests";
import { VIRAL_LOAD_LABEL, hpvRiskLabel, HPV_TRUENAT_CATEGORIES } from "../lib/hpvRisk";
import SampleDeleteButton from "./SampleDeleteButton";
import ScreeningActionModal from "./ScreeningActionModal";

const chip: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  abnormal: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};

const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export type ScreeningMethod = {
  /** Field on the screening form that records the method (e.g. methodHpv). */
  field: string;
  label: string;
  /** Catalogue test behind the method (e.g. hpv_dna). Methods without one (e.g. CBE) are findings only. */
  test?: string;
  checked: boolean;
  /** Can't be unticked (e.g. a sample already exists). */
  locked?: boolean;
};

type Props = {
  clientId: string;
  cancerType: string;
  methods: ScreeningMethod[];
  onToggleMethod: (field: string, checked: boolean) => void;
  onHpvResult?: (v: { hpvResult: string; hpvGenotype: string; hpvSampleDate: string; hpvResultDate: string }) => void;
  onHpvSample?: (v: { hpvSampleDate: string }) => void;
  hpvFormEmpty?: boolean;
  visitId?: number | null;
  acceptSampleId?: number | null;
  onHpvState?: (s: { hasSample: boolean; released: boolean }) => void;
  onFinding?: (f: { screeningResult: "suspicious" | "non_suspicious"; screeningDate: string } | null) => void;
  /** Reports which tests have records for this visit, so their methods can be shown as used. */
  onTestsInVisit?: (testKeys: string[]) => void;
  /** Released results of this visit, so the screening form can take values (PSA level, BI-RADS, ...) from the lab. */
  onVisitResults?: (rows: any[]) => void;
};

type ModalState = { mode: "collect" | "result"; testKey: string } | null;

/**
 * Screening methods for one cancer type on the clinical screening step. Ticking a method shows its three
 * actions (take a sample, record a screening result, book a test). Each opens as a pop-up on this page.
 * Below, every screening done for this client is listed in a table with its status.
 */
export default function LabTestsPanel({
  clientId,
  cancerType,
  methods,
  onToggleMethod,
  onHpvResult,
  onHpvSample,
  hpvFormEmpty,
  visitId,
  acceptSampleId,
  onHpvState,
  onFinding,
  onTestsInVisit,
  onVisitResults,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const autoApplied = useRef<string>("");
  const [modal, setModal] = useState<ModalState>(null);
  const [modalKey, setModalKey] = useState(0);
  const [bookTest, setBookTest] = useState<string>("");
  const [bookDate, setBookDate] = useState<string>("");
  const [bookNotes, setBookNotes] = useState<string>("");
  const [booking, setBooking] = useState(false);
  const [bookFacilityId, setBookFacilityId] = useState<string>("");
  const [bookFacilities, setBookFacilities] = useState<any[]>([]);
  const [bookFacilitiesNote, setBookFacilitiesNote] = useState<string>("");
  const [bookFacilitiesLoading, setBookFacilitiesLoading] = useState(false);

  const load = useCallback(
    async (manual = false) => {
      if (!clientId || clientId.startsWith("OFFLINE-")) return;
      setLoading(true);
      try {
        const { data } = await api.get("/screening-samples", { params: { status: "all", clientId, cancerType } });
        const list: any[] = data?.samples ?? [];
        setRows(list);
        setOffline(false);
        onVisitResults?.(
          list.filter(
            (x) =>
              x.status === "result_released" &&
              (!x.visitId || (visitId && Number(x.visitId) === Number(visitId)) || (acceptSampleId && Number(x.sampleId) === Number(acceptSampleId)))
          )
        );

        if (onFinding) {
          const mine = list.filter(
            (x) =>
              x.status === "result_released" &&
              (!x.visitId || (visitId && Number(x.visitId) === Number(visitId)) || (acceptSampleId && Number(x.sampleId) === Number(acceptSampleId)))
          );
          if (mine.length === 0) onFinding(null);
          else {
            const bad = mine.some((x) => x.resultSeverity === "abnormal" || x.resultSeverity === "urgent");
            const latest = mine.map((x) => String(x.resultDate).slice(0, 10)).sort().pop() as string;
            onFinding({ screeningResult: bad ? "suspicious" : "non_suspicious", screeningDate: latest });
          }
        }

        if (cancerType === "cervical") {
          // This visit's HPV test: linked to this visit, not linked to any visit yet, or the one the user came from.
          const hpv = list.filter(
            (x) =>
              x.testType === "hpv_dna" &&
              (!x.visitId || (visitId && Number(x.visitId) === Number(visitId)) || (acceptSampleId && Number(x.sampleId) === Number(acceptSampleId)))
          );
          const released = hpv.find((x) => x.status === "result_released");
          const waiting = hpv.find((x) => x.status === "collected");
          onHpvState?.({ hasSample: hpv.some((x) => x.status !== "booked"), released: !!released });
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
    [clientId, cancerType, hpvFormEmpty, visitId, acceptSampleId, !!onFinding]
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

  const isThisVisit = (x: any) =>
    !x.visitId || (visitId && Number(x.visitId) === Number(visitId)) || (acceptSampleId && Number(x.sampleId) === Number(acceptSampleId));

  // Tell the page which tests already have a record in this visit (so those methods count as used).
  useEffect(() => {
    onTestsInVisit?.(Array.from(new Set(rows.filter(isThisVisit).map((x) => x.testType))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // Lock page scrolling while a pop-up is open.
  useEffect(() => {
    if (!modal && !bookTest) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal, bookTest]);

  const openAction = (mode: "collect" | "result", testKey: string) => {
    setModalKey((k) => k + 1);
    setModal({ mode, testKey });
  };
  const closeAction = () => {
    setModal(null);
    load();
  };

  // Facilities that offer the service for the test being booked. Service slugs are matched loosely so a
  // facility list set up as "hpv", "hpv-dna" or "HPV DNA test" is found either way.
  const SERVICE_SLUGS: Record<string, string[]> = {
    hpv_dna: ["hpv", "hpv-dna", "hpv_dna", "hpv-test"],
    cervical_cytology: ["pap", "pap-smear", "cytology", "cervical-cytology"],
    via: ["via", "via-vili"],
    cervical_biopsy: ["biopsy", "cervical-biopsy"],
    cbe: ["cbe", "clinical-breast-exam", "breast-exam"],
    mammography: ["mammography", "mammogram"],
    breast_ultrasound: ["breast-ultrasound", "ultrasound", "uss"],
    breast_biopsy: ["biopsy", "breast-biopsy"],
    psa: ["psa", "psa-test"],
    dre: ["dre", "urology"],
    prostate_biopsy: ["biopsy", "prostate-biopsy"],
    afp: ["afp"],
    liver_ultrasound: ["liver-ultrasound", "ultrasound", "uss"],
    hbsag: ["hbsag", "hepatitis-b", "hepatitis"],
    anti_hcv: ["anti-hcv", "hcv", "hepatitis-c", "hepatitis"],
    fit: ["fit", "fobt", "fit-fobt"],
    colonoscopy: ["colonoscopy", "sigmoidoscopy"],
    colorectal_biopsy: ["biopsy", "colorectal-biopsy"],
  };

  useEffect(() => {
    if (!bookTest) return;
    let cancelled = false;
    (async () => {
      setBookFacilitiesLoading(true);
      setBookFacilities([]);
      setBookFacilitiesNote("");
      try {
        const { data } = await api.get("/services");
        const services: any[] = data?.services ?? data?.data ?? (Array.isArray(data) ? data : []);
        const wanted = SERVICE_SLUGS[bookTest] || [bookTest];
        const label = (findTest(bookTest)?.label || "").toLowerCase();
        const norm = (v: any) => String(v || "").toLowerCase().replace(/[\s_]+/g, "-");
        const service =
          wanted.map((w) => services.find((sv) => norm(sv.slug) === w)).find(Boolean) ||
          services.find((sv) => label && String(sv.name || "").toLowerCase().includes(label.split(/[\s/(]/)[0]));
        if (service?.slug) {
          const res = await api.get(`/services/${service.slug}/facilities`);
          const rows: any[] = res.data?.facilities ?? [];
          if (!cancelled) {
            setBookFacilities(rows);
            if (rows.length === 0) setBookFacilitiesNote(`No facility is set up to offer ${service.name || "this service"} yet.`);
          }
        } else if (!cancelled) {
          setBookFacilitiesNote("This test is not set up as a service yet, so no facility list is available. Add it under Facilities > Services.");
        }
      } catch {
        if (!cancelled) setBookFacilitiesNote("Could not load the facilities for this service.");
      } finally {
        if (!cancelled) setBookFacilitiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookTest]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const closeBooking = () => {
    setBookTest("");
    setBookDate("");
    setBookNotes("");
    setBookFacilityId("");
  };
  async function submitBooking() {
    if (!bookFacilityId) {
      toast.error("Choose the facility where the test will be done.");
      return;
    }
    if (!bookDate) {
      toast.error("Choose the date for the test.");
      return;
    }
    setBooking(true);
    try {
      await api.post(`/clients/${clientId}/screening-samples/book`, {
        testType: bookTest,
        bookedFor: bookDate,
        facilityId: Number(bookFacilityId),
        notes: bookNotes.trim() || null,
        visitId: visitId || null,
      });
      toast.success("Test booked.");
      closeBooking();
      load();
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not book the test."));
    } finally {
      setBooking(false);
    }
  }

  if (!clientId) return null;

  const detailLine = (x: any) => {
    const bits: string[] = [];
    const cat = HPV_TRUENAT_CATEGORIES.find((c) => c.value === x.resultMeta?.hrCategory)?.label;
    if (cat) bits.push(cat);
    else if (x.resultDetail) bits.push(String(x.resultDetail));
    if (x.resultMeta?.riskCategory) bits.push(`${VIRAL_LOAD_LABEL}: ${hpvRiskLabel(x.resultMeta.riskCategory)}`);
    return bits.join(" · ");
  };

  const statusOf = (x: any) => {
    if (x.status === "result_released") return { text: "Result released", cls: "bg-green-100 text-green-800" };
    if (x.status === "booked") return { text: "Booked", cls: "bg-blue-100 text-blue-800" };
    return { text: "Awaiting result", cls: "bg-amber-100 text-amber-800" };
  };

  const countsFor = (testKey: string) => {
    const mine = rows.filter((x) => isThisVisit(x) && x.testType === testKey);
    return {
      waiting: mine.filter((x) => x.status === "collected").length,
      released: mine.filter((x) => x.status === "result_released").length,
      booked: mine.filter((x) => x.status === "booked").length,
    };
  };

  const sorted = [...rows].sort((a, b) => String(b.sampleDate).localeCompare(String(a.sampleDate)) || b.sampleId - a.sampleId);

  return (
    <div className="space-y-5">
      {/* ── Screening methods ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Screening methods</h4>
          <button type="button" onClick={() => load(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline" disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Tick each method used in this visit.</p>
        {offline && <p className="text-xs text-amber-700 mb-2">Offline. Lab records will appear here once you are back online.</p>}

        <div className="space-y-2">
          {methods.map((m) => {
            const t = m.test ? findTest(m.test) : undefined;
            const c = m.test ? countsFor(m.test) : null;
            return (
              <div
                key={m.field}
                className={`rounded-xl border p-3 transition-colors ${
                  m.checked ? "border-green-300 bg-green-50/60 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={m.locked}
                    onClick={() => onToggleMethod(m.field, !m.checked)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 disabled:cursor-not-allowed"
                    title={m.locked ? "A sample or result exists for this method in this visit" : undefined}
                  >
                    {m.checked ? <CheckSquare className="w-5 h-5 text-green-700" /> : <Square className="w-5 h-5 text-gray-400" />}
                    {m.label}
                  </button>
                  {c && (c.waiting || c.released || c.booked) ? (
                    <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
                      {c.booked > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{c.booked} booked</span>}
                      {c.waiting > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{c.waiting} awaiting result</span>}
                      {c.released > 0 && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">{c.released} result{c.released > 1 ? "s" : ""}</span>}
                    </div>
                  ) : null}
                </div>

                {m.checked && t && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      size="small"
                      className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
                      onClick={() =>
                        openAction("collect", t.key)
                      }
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {t.kind === "procedure" ? <Stethoscope className="w-4 h-4" /> : <TestTube2 className="w-4 h-4" />}
                        {t.kind === "procedure" ? "Perform Test" : "Take a Sample"}
                      </span>
                    </Button>
                    <Button
                      size="small"
                      layout="outline"
                      className="rounded-xl"
                      onClick={() => openAction("result", t.key)}
                    >
                      <span className="inline-flex items-center gap-1.5"><FileCheck2 className="w-4 h-4" /> Record a Screening Result</span>
                    </Button>
                    <Button size="small" layout="outline" className="rounded-xl" onClick={() => setBookTest(t.key)}>
                      <span className="inline-flex items-center gap-1.5"><CalendarPlus className="w-4 h-4" /> Book a Test</span>
                    </Button>
                  </div>
                )}
                {m.checked && !t && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Clinical examination. Record the findings in the form below.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Screenings done ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-green-700" />
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Screenings done · {cancerName(cancerType)}</h4>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500">No screening has been recorded for this client yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-2">Test</th>
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Result</th>
                  <th className="px-4 py-2">Visit</th>
                  <th className="px-4 py-2 text-right sticky right-0 bg-white dark:bg-gray-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sorted.map((x) => {
                  const t = findTest(x.testType);
                  const st = statusOf(x);
                  const done = x.status === "result_released";
                  const extra = done ? detailLine(x) : "";
                  return (
                    <tr key={x.sampleId} className="align-top">
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{t?.label ?? x.testType}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{x.status === "booked" ? "—" : x.sampleRef}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {x.status === "booked" ? `Booked for ${fmt(x.sampleDate)}` : fmt(x.sampleDate)}
                        {x.status === "booked" && x.booked_facility?.facilityName && (
                          <span className="block text-xs text-gray-500">at {x.booked_facility.facilityName}</span>
                        )}
                        {x.status === "booked" && x.bookedFacility?.facilityName && (
                          <span className="block text-xs text-gray-500">at {x.bookedFacility.facilityName}</span>
                        )}
                        {done && <span className="block text-xs text-gray-500">Released {fmt(x.resultDate)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${st.cls}`}>{st.text}</span>
                      </td>
                      <td className="px-4 py-3">
                        {done ? (
                          <>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${chip[x.resultSeverity || "neutral"]}`}>{resultLabel(t, x.result)}</span>
                            {extra && <span className="block mt-1 text-xs text-gray-600 dark:text-gray-300">{extra}</span>}
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{isThisVisit(x) ? "This visit" : "Previous"}</td>
                      <td className="px-4 py-3 sticky right-0 bg-white dark:bg-gray-800">
                        <div className="flex justify-end items-center gap-2 whitespace-nowrap">
                          {x.status === "collected" && (
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg border border-green-300 text-xs font-semibold text-green-700 bg-white dark:bg-gray-900 hover:bg-green-50"
                              onClick={() => openAction("result", x.testType)}
                            >
                              Record result
                            </button>
                          )}
                          {x.status === "booked" && (
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg border border-green-300 text-xs font-semibold text-green-700 bg-white dark:bg-gray-900 hover:bg-green-50"
                              onClick={() => openAction("collect", x.testType)}
                            >
                              {t?.kind === "procedure" ? "Perform now" : "Take sample now"}
                            </button>
                          )}
                          <SampleDeleteButton sampleId={x.sampleId} label={`${t?.label ?? x.testType} · ${x.sampleRef ?? ""}`} hasResult={x.status === "result_released"} appearance="button" onDone={() => load()} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Pop-up: Take a Sample / Record a Screening Result (the form only, no page around it) ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full sm:max-w-3xl max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {modal.mode === "collect"
                  ? findTest(modal.testKey)?.kind === "procedure"
                    ? "Perform Test"
                    : "Take a Sample"
                  : "Record a Screening Result"}
              </p>
              <button type="button" onClick={closeAction} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <ScreeningActionModal
                key={modalKey}
                mode={modal.mode}
                testKey={modal.testKey}
                clientId={clientId}
                onSaved={() => load()}
                onClose={closeAction}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Pop-up: book a test ───────────────────────────────────────── */}
      {bookTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 p-6 shadow-2xl">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Book a Test</p>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{findTest(bookTest)?.label}</h3>
            <label className="block mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Facility offering this test
              <select
                value={bookFacilityId}
                onChange={(e) => setBookFacilityId(e.target.value)}
                disabled={bookFacilitiesLoading}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm"
              >
                <option value="">{bookFacilitiesLoading ? "Loading facilities…" : "Select a facility"}</option>
                {bookFacilities.map((f) => (
                  <option key={f.facilityId} value={String(f.facilityId)}>
                    {f.facilityName}
                    {f.facilityState ? ` · ${f.facilityState}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {bookFacilitiesNote && <p className="mt-1 text-xs text-amber-700">{bookFacilitiesNote}</p>}
            <label className="block mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Date of the test
              <input
                type="date"
                min={todayIso}
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 p-3 text-sm"
              />
            </label>
            <label className="block mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
              <textarea
                rows={2}
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 p-3 text-sm"
                placeholder="Instructions for the client or the lab"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button layout="outline" className="rounded-2xl" onClick={closeBooking} disabled={booking}>Cancel</Button>
              <Button className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" onClick={submitBooking} disabled={booking || !bookFacilityId}>
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Book test"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
