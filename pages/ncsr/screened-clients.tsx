import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, X, FlaskConical, Eye, Stethoscope, Building2, BarChart3, ChevronDown, ChevronUp, AlertTriangle, Copy } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { CANCER_TYPES, cancerName, findTest, resultLabel, findingOf, FINDING_LABEL } from "../../lib/screeningTests";

const PER_PAGE = 20;

// Positive = suspicious, negative = non-suspicious (same grouping as the All Test Results page).
const resultStyle: Record<string, string> = {
  suspicious: "bg-red-100 text-red-700",
  positive: "bg-red-100 text-red-700",
  non_suspicious: "bg-green-100 text-green-800",
  negative: "bg-green-100 text-green-800",
  inconclusive: "bg-gray-100 text-gray-700",
  awaiting: "bg-amber-100 text-amber-800",
};
const resultText: Record<string, string> = {
  suspicious: "Suspicious",
  positive: "Suspicious",
  non_suspicious: "Non-suspicious",
  negative: "Non-suspicious",
  inconclusive: "Inconclusive",
  awaiting: "Awaiting lab result",
};

const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

type Tile = { key: string; label: string; value: number; tone: string; apply: () => void; active: boolean };

export default function ScreenedClientsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({ screened: 0, suspicious: 0, nonSuspicious: 0, awaiting: 0, urgentLabs: 0, duplicates: 0, noSample: 0 });
  const [total, setTotal] = useState(0);
  const [facilityStats, setFacilityStats] = useState<any[]>([]);
  const [screenerStats, setScreenerStats] = useState<any[]>([]);
  const [scope, setScope] = useState<"facility" | "multi">("multi");
  const [view, setView] = useState<"facilities" | "screeners">("facilities");
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [facilityId, setFacilityId] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [cancerType, setCancerType] = useState("");
  const [result, setResult] = useState("");
  const [lab, setLab] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ready, setReady] = useState(false);
  const reqId = useRef(0);

  // Warning pop-up: shown every time the page loads (or reloads) while there are records to fix.
  // "Remind me later" closes it until the next load; the chip at the top reopens it.
  const [attentionOpen, setAttentionOpen] = useState(false);
  const attentionShown = useRef(false);
  const needsAttention = (summary.noSample ?? 0) > 0 || (summary.duplicates ?? 0) > 0;
  useEffect(() => {
    if (!needsAttention || attentionShown.current) return;
    attentionShown.current = true;
    setAttentionOpen(true);
  }, [needsAttention]);
  const closeAttention = () => setAttentionOpen(false);

  // Deep links: ?lab=pending · ?result=suspicious · ?cancerType=cervical
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (typeof q.lab === "string") setLab(q.lab === "urgent" || q.lab === "abnormal" ? "suspicious" : q.lab);
    if (typeof q.result === "string") setResult(q.result);
    if (typeof q.cancerType === "string") setCancerType(q.cancerType);
    if (typeof q.facilityId === "string") setFacilityId(q.facilityId);
    setReady(true);
  }, [router.isReady]);

  async function load(p = page) {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const { data } = await api.get("/screened-clients", {
        params: {
          page: p,
          perPage: PER_PAGE,
          search: search.trim() || undefined,
          cancerType: cancerType || undefined,
          facilityId: facilityId || undefined,
          result: result || undefined,
          lab: lab || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      if (id !== reqId.current) return; // a newer request has replaced this one
      setRows(data.clients ?? []);
      setTotal(data.total ?? 0);
      setSummary(data.summary ?? summary);
      setFacilityStats(data.facilityAnalytics ?? []);
      setScreenerStats(data.screenerAnalytics ?? []);
      setScope(data.scope === "facility" ? "facility" : "multi");
    } catch (e) {
      if (id === reqId.current) toast.error(friendlyError(e, "Could not load screened clients."));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cancerType, result, lab, dateFrom, dateTo, facilityId]);

  const filtersActive = !!(search || cancerType || result || lab || dateFrom || dateTo || facilityId);
  const clearFilters = () => {
    setSearch(""); setCancerType(""); setResult(""); setLab(""); setDateFrom(""); setDateTo(""); setFacilityId("");
  };

  const tiles: Tile[] = [
    { key: "all", label: "Screened clients", value: summary.screened, tone: "text-gray-800 dark:text-white", active: !result && !lab, apply: () => { setResult(""); setLab(""); } },
    { key: "susp", label: "Suspicious (incl. positive results)", value: summary.suspicious, tone: "text-red-600", active: result === "suspicious", apply: () => { setLab(""); setResult("suspicious"); } },
    { key: "ok", label: "Non-suspicious (incl. negative results)", value: summary.nonSuspicious ?? 0, tone: "text-green-700", active: result === "non_suspicious", apply: () => { setLab(""); setResult("non_suspicious"); } },
    { key: "wait", label: "Awaiting lab result", value: summary.awaiting, tone: "text-amber-600", active: lab === "pending", apply: () => { setResult(""); setLab("pending"); } },
    { key: "nosample", label: "Result without a sample", value: summary.noSample ?? 0, tone: "text-amber-700", active: lab === "no_sample", apply: () => { setResult(""); setLab("no_sample"); } },
    { key: "dup", label: "Possible duplicate results", value: summary.duplicates ?? 0, tone: "text-amber-700", active: lab === "duplicates", apply: () => { setResult(""); setLab("duplicates"); } },
  ];

  const open = (id: string) => router.push(`/ncsr/client-details?clientId=${encodeURIComponent(id)}`);
  const screenAgain = (id: string) => router.push(`/ncsr/clinical-screening?search=${encodeURIComponent(id)}`);
  const labs = (id: string, tab?: string) =>
    router.push(tab ? `/ncsr/test-results-page?clientId=${encodeURIComponent(id)}` : `/ncsr/screening-tests-page?tab=results&search=${encodeURIComponent(id)}`);

  const fieldClass = "rounded-2xl h-11";

  const singleFacility = scope === "facility";
  const activeView = singleFacility ? "screeners" : view;
  const maxScreener = Math.max(1, ...screenerStats.map((s) => s.clients));
  const selectedFacility = facilityStats.find((f) => String(f.facilityId) === facilityId);
  const maxClients = Math.max(1, ...facilityStats.map((f) => f.clients));
  const shownFacilities = showAllFacilities ? facilityStats : facilityStats.slice(0, 8);

  const ScreenedAt = ({ c }: { c: any }) =>
    c.screenedAt ? (
      <div className="min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-100 break-words">{c.screenedAt.facilityName}</p>
        <p className="text-xs text-gray-500">
          {c.screenedAt.facilityState}
          {c.otherFacilities > 0 ? `${c.screenedAt.facilityState ? " · " : ""}+${c.otherFacilities} other facilit${c.otherFacilities === 1 ? "y" : "ies"}` : ""}
        </p>
        {c.screenedBy && (
          <p className="text-xs text-gray-500 mt-0.5">
            by {c.screenedBy}{c.otherScreeners > 0 ? ` +${c.otherScreeners}` : ""}
          </p>
        )}
      </div>
    ) : (
      <span className="text-xs text-gray-400">—</span>
    );

  const Badges = ({ c }: { c: any }) => (
    <div className="flex flex-wrap gap-1.5">
      {c.screenings.map((s: any) => (
        <span
          key={s.cancerType}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${resultStyle[s.screeningResult] ?? "bg-gray-100 text-gray-700"}`}
          title={s.source === "lab" ? "Taken from the lab result (no finding on the screening form)" : undefined}
        >
          {cancerName(s.cancerType)}
          <span className="font-normal">· {resultText[s.screeningResult] ?? "No result"}</span>
          {s.source === "lab" && <span className="font-normal opacity-70">(lab)</span>}
        </span>
      ))}
    </div>
  );

  const LabLine = ({ c }: { c: any }) => {
    const l = c.labs;
    const tests: any[] = c.tests ?? [];
    if (tests.length === 0) return <span className="text-xs text-gray-400">No lab tests</span>;
    const suspicious = l.suspicious ?? l.urgent ?? 0;
    const normal = l.normal ?? Math.max(0, l.released - suspicious);
    return (
      <div className="space-y-1.5">
        <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
          {tests.map((t, i) => {
            const test = findTest(t.testType);
            const finding = t.status === "result_released" ? findingOf(t.severity) : null;
            return (
              <li key={t.sampleId ?? i} className="break-words">
                <span className="font-medium">{test?.label ?? String(t.testType ?? "Test").replace(/_/g, " ")}</span>
                <span className="text-gray-500">
                  {" · "}
                  {t.status === "result_released"
                    ? `${resultLabel(test, t.result) || "released"} · ${FINDING_LABEL[finding!]}`
                    : t.status === "booked"
                    ? "booked"
                    : "awaiting result"}
                  {t.date ? ` · ${fmt(t.date)}` : ""}
                </span>
                {t.duplicate && (
                  <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-semibold align-middle">
                    <Copy className="w-2.5 h-2.5" /> duplicate
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {l.pending > 0 && <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-semibold">{l.pending} awaiting</span>}
          {suspicious > 0 && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-semibold">{suspicious} suspicious</span>}
          {normal > 0 && <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 font-semibold">{normal} non-suspicious</span>}
          {(l.inconclusive ?? 0) > 0 && <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 font-semibold">{l.inconclusive} inconclusive</span>}
        </div>
        {(l.duplicates ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => labs(c.clientId, "results")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline"
          >
            <Copy className="w-3 h-3" /> {l.duplicates} possible duplicate results: review and delete
          </button>
        )}
      </div>
    );
  };

  // Results typed on the screening form without a sample / test in the testing module.
  const MissingSample = ({ c }: { c: any }) =>
    (c.missingSample?.length ?? 0) > 0 ? (
      <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-2.5 text-xs space-y-1">
        {c.missingSample.map((m: any) => (
          <p key={m.cancerType} className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <b>{cancerName(m.cancerType)}:</b> {m.note}
            </span>
          </p>
        ))}
        <button type="button" onClick={() => screenAgain(c.clientId)} className="font-semibold underline">
          Record the sample / test
        </button>
      </div>
    ) : null;

  return (
    <Layout>
      <PageTitle>Screened Clients</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Everyone who has had at least one screening, with their findings and lab results in one place. Positive results are
        counted as suspicious and negative results as non-suspicious, the same as on All Test Results.
      </p>

      {/* Small reminder that reopens the warning after it was closed */}
      {needsAttention && !attentionOpen && (
        <button
          type="button"
          onClick={() => setAttentionOpen(true)}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 text-amber-900 px-3 py-1.5 text-xs font-semibold"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Records need your attention
        </button>
      )}

      {/* Warning pop-up: results without a sample and possible duplicates */}
      {attentionOpen && needsAttention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="attention-title">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100 text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="attention-title" className="text-lg font-semibold text-gray-800 dark:text-white">Records need your attention</h3>
                <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  {summary.noSample > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-gray-900 p-3">
                      <p>
                        <b>{summary.noSample}</b> client{summary.noSample === 1 ? " has" : "s have"} a screening result entered without a sample or
                        test in the testing module. Record the sample / test, or correct the result.
                      </p>
                      <Button
                        size="small"
                        className="mt-2 rounded-xl bg-amber-600 border-amber-600 hover:bg-amber-700"
                        onClick={() => { setResult(""); setLab("no_sample"); closeAttention(); }}
                      >
                        Show these clients
                      </Button>
                    </div>
                  )}
                  {summary.duplicates > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-gray-900 p-3">
                      <p>
                        <b>{summary.duplicates}</b> client{summary.duplicates === 1 ? " has" : "s have"} possible duplicate results (same test, same
                        sample date). Review them and delete the extra record.
                      </p>
                      <Button
                        size="small"
                        className="mt-2 rounded-xl bg-amber-600 border-amber-600 hover:bg-amber-700"
                        onClick={() => { setResult(""); setLab("duplicates"); closeAttention(); }}
                      >
                        Show duplicates
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button layout="outline" className="rounded-2xl" onClick={closeAttention}>
                Remind me later
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary tiles double as quick filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.apply}
            className={`text-left rounded-2xl border p-4 bg-white dark:bg-gray-800 transition ${
              t.active ? "border-green-600 ring-2 ring-green-100" : "border-gray-100 dark:border-gray-700 hover:border-green-300"
            }`}
          >
            <p className={`text-2xl font-bold ${t.tone}`}>{t.value}</p>
            <p className="text-xs text-gray-500 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Screening facility analytics */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 mb-5">
        <button type="button" onClick={() => setShowAnalytics((v) => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-700" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{singleFacility ? `Screening at ${facilityStats[0]?.facilityName ?? "your facility"}` : "Screening analytics"}</span>
            <span className="text-xs text-gray-500">
              {singleFacility
                ? `${facilityStats[0]?.clients ?? 0} client${(facilityStats[0]?.clients ?? 0) === 1 ? "" : "s"} · ${screenerStats.length} screener${screenerStats.length === 1 ? "" : "s"}`
                : `${facilityStats.length} facilit${facilityStats.length === 1 ? "y" : "ies"} · ${screenerStats.length} screener${screenerStats.length === 1 ? "" : "s"}`}
            </span>
          </span>
          {showAnalytics ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showAnalytics && (
          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            {!singleFacility && (
              <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mb-3 text-xs font-semibold">
                {(["facilities", "screeners"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-lg transition ${activeView === v ? "bg-white dark:bg-gray-800 text-green-700 shadow-sm" : "text-gray-500"}`}
                  >
                    {v === "facilities" ? "By facility" : "By screener"}
                  </button>
                ))}
              </div>
            )}
            {activeView === "screeners" ? (
              screenerStats.length === 0 ? (
                <p className="text-sm text-gray-500">No screenings match the current filters.</p>
              ) : (
                <ul className="space-y-2">
                  {screenerStats.map((s) => (
                    <li key={String(s.userId ?? "none")} className="rounded-xl p-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-800 dark:text-gray-100 break-words min-w-0">{s.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 shrink-0 text-right">
                          <span className="font-semibold">{s.clients}</span> client{s.clients === 1 ? "" : "s"}
                          <span className="text-gray-400"> · {s.visits} visit{s.visits === 1 ? "" : "s"}</span>
                          {s.suspicious > 0 && <span className="text-red-600 font-semibold"> · {s.suspicious} suspicious ({s.suspiciousRate}%)</span>}
                        </p>
                      </div>
                      <div className="mt-1.5 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden" aria-hidden="true">
                        <div className="h-full rounded-full bg-green-600 relative" style={{ width: `${(s.clients / maxScreener) * 100}%` }}>
                          {s.suspicious > 0 && <div className="absolute right-0 top-0 h-full bg-red-500" style={{ width: `${Math.min(100, (s.suspicious / s.clients) * 100)}%` }} />}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : facilityStats.length === 0 ? (
              <p className="text-sm text-gray-500">No screenings match the current filters.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> Clients screened</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> With a suspicious finding</span>
                  <span>Tap a facility to filter the list.</span>
                </div>
                <ul className="space-y-2">
                  {shownFacilities.map((f) => {
                    const on = facilityId === String(f.facilityId);
                    return (
                      <li key={f.facilityId}>
                        <button
                          type="button"
                          onClick={() => setFacilityId(on ? "" : String(f.facilityId))}
                          className={`w-full text-left rounded-xl p-2 transition ${on ? "bg-green-50 dark:bg-gray-700 ring-1 ring-green-600" : "hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-gray-800 dark:text-gray-100 break-words min-w-0">
                              {f.facilityName}
                              {f.facilityState && <span className="text-xs text-gray-500"> · {f.facilityState}</span>}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 shrink-0 text-right">
                              <span className="font-semibold">{f.clients}</span> client{f.clients === 1 ? "" : "s"}
                              <span className="text-gray-400"> · {f.visits} visit{f.visits === 1 ? "" : "s"}</span>
                              {f.suspicious > 0 && <span className="text-red-600 font-semibold"> · {f.suspicious} suspicious ({f.suspiciousRate}%)</span>}
                            </p>
                          </div>
                          <div className="mt-1.5 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden" aria-hidden="true">
                            <div className="h-full rounded-full bg-green-600 relative" style={{ width: `${(f.clients / maxClients) * 100}%` }}>
                              {f.suspicious > 0 && (
                                <div className="absolute right-0 top-0 h-full bg-red-500" style={{ width: `${Math.min(100, (f.suspicious / f.clients) * 100)}%` }} />
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {facilityStats.length > 8 && (
                  <button type="button" onClick={() => setShowAllFacilities((v) => !v)} className="mt-3 text-xs font-semibold text-green-700 underline">
                    {showAllFacilities ? "Show top 8 only" : `Show all ${facilityStats.length} facilities`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 sm:p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select className={fieldClass} value={cancerType} onChange={(e) => setCancerType(e.target.value)} aria-label="Cancer type">
            <option value="">All cancer types</option>
            {CANCER_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select className={fieldClass} value={result} onChange={(e) => setResult(e.target.value)} aria-label="Screening finding">
            <option value="">Any finding</option>
            <option value="suspicious">Suspicious</option>
            <option value="non_suspicious">Non-suspicious</option>
          </Select>
          <Select className={fieldClass} value={lab} onChange={(e) => setLab(e.target.value)} aria-label="Lab status">
            <option value="">Any lab status</option>
            <option value="pending">Awaiting a result</option>
            <option value="suspicious">Suspicious lab result</option>
            <option value="no_sample">Result without a sample</option>
            <option value="duplicates">Possible duplicate results</option>
          </Select>
          <Input type="date" className={fieldClass} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} aria-label="Screened from" />
          <Input type="date" className={fieldClass} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} aria-label="Screened to" />
        </div>
        <div className="flex gap-2">
          <Input
            className={`${fieldClass} flex-1 min-w-0`}
            placeholder="Search name, phone, Client ID or hospital number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1); } }}
          />
          <Button onClick={() => { setPage(1); load(1); }} className="h-11 px-4 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" aria-label="Search">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {facilityId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 mr-2">
            <Building2 className="w-3 h-3" /> {selectedFacility?.facilityName ?? "Selected facility"}
            <button type="button" onClick={() => setFacilityId("")} aria-label="Remove facility filter"><X className="w-3 h-3" /></button>
          </span>
        )}
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 underline">
            <X className="w-3 h-3" /> Clear all filters
          </button>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            {filtersActive ? "No screened clients match these filters." : "No client has been screened yet."}
          </p>
          {filtersActive && <Button layout="outline" className="mt-4 rounded-2xl" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          {/* Phones and tablets: cards */}
          <div className="space-y-3 lg:hidden">
            {rows.map((c) => (
              <div key={c.clientId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <button type="button" className="text-left w-full" onClick={() => open(c.clientId)}>
                  <p className="font-semibold text-gray-800 dark:text-white break-words">{c.fullName}</p>
                  <p className="text-xs text-green-700 font-medium break-all">{c.clientId}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.age != null ? `${c.age} yrs` : ""}{c.gender ? ` · ${c.gender}` : ""}{c.phoneNumber ? ` · ${c.phoneNumber}` : ""}
                  </p>
                </button>
                <div className="mt-3 space-y-2">
                  <Badges c={c} />
                  <MissingSample c={c} />
                  <LabLine c={c} />
                  {c.screenedAt && (
                    <p className="text-xs text-gray-600 flex items-start gap-1"><Building2 className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" /> Screened at {c.screenedAt.facilityName}{c.otherFacilities > 0 ? ` (+${c.otherFacilities} more)` : ""}{c.screenedBy ? ` · by ${c.screenedBy}` : ""}</p>
                  )}
                  <p className="text-xs text-gray-500">Last screened {fmt(c.lastScreeningDate)} · {c.visitCount} visit{c.visitCount === 1 ? "" : "s"}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button size="small" layout="outline" className="rounded-xl" onClick={() => open(c.clientId)}>View</Button>
                  <Button size="small" layout="outline" className="rounded-xl" onClick={() => labs(c.clientId, "results")}>Results</Button>
                  <Button size="small" className="rounded-xl bg-green-700 border-green-700" onClick={() => screenAgain(c.clientId)}>Screen</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm whitespace-normal">
              <thead className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Screened at / by</th>
                  <th className="px-4 py-3">Screenings &amp; findings</th>
                  <th className="px-4 py-3">Lab tests</th>
                  <th className="px-4 py-3">Last screened</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((c) => (
                  <tr key={c.clientId} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left" onClick={() => open(c.clientId)}>
                        <p className="font-semibold text-gray-800 dark:text-white">{c.fullName}</p>
                        <p className="text-xs text-green-700 font-medium">{c.clientId}</p>
                        <p className="text-xs text-gray-500">
                          {c.age != null ? `${c.age} yrs` : ""}{c.gender ? ` · ${c.gender}` : ""}{c.phoneNumber ? ` · ${c.phoneNumber}` : ""}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3"><ScreenedAt c={c} /></td>
                    <td className="px-4 py-3 max-w-[18rem]"><div className="space-y-2"><Badges c={c} /><MissingSample c={c} /></div></td>
                    <td className="px-4 py-3 max-w-[18rem]"><LabLine c={c} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {fmt(c.lastScreeningDate)}
                      <p className="text-xs text-gray-400">{c.visitCount} visit{c.visitCount === 1 ? "" : "s"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="small" layout="outline" className="rounded-xl" onClick={() => open(c.clientId)} title="Open client summary">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="small" layout="outline" className="rounded-xl" onClick={() => labs(c.clientId, "results")} title="This client's test results">
                          <FlaskConical className="w-4 h-4" />
                        </Button>
                        <Button size="small" className="rounded-xl bg-green-700 border-green-700" onClick={() => screenAgain(c.clientId)} title="Start a new screening">
                          <Stethoscope className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PER_PAGE && (
            <div className="mt-4 overflow-x-auto">
              <Pagination
                totalResults={total}
                resultsPerPage={PER_PAGE}
                label="Screened clients pages"
                onChange={(p: number) => { setPage(p); load(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}