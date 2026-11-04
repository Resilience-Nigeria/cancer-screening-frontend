import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, X, FlaskConical, Eye, Stethoscope } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { CANCER_TYPES, cancerName } from "../../lib/screeningTests";

const PER_PAGE = 20;

const resultStyle: Record<string, string> = {
  suspicious: "bg-red-100 text-red-700",
  non_suspicious: "bg-green-100 text-green-800",
};
const resultText: Record<string, string> = { suspicious: "Suspicious", non_suspicious: "Non-suspicious" };

const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

type Tile = { key: string; label: string; value: number; tone: string; apply: () => void; active: boolean };

export default function ScreenedClientsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({ screened: 0, suspicious: 0, awaiting: 0, urgentLabs: 0 });
  const [total, setTotal] = useState(0);
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

  // Deep links: ?lab=pending · ?result=suspicious · ?cancerType=cervical
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (typeof q.lab === "string") setLab(q.lab);
    if (typeof q.result === "string") setResult(q.result);
    if (typeof q.cancerType === "string") setCancerType(q.cancerType);
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
  }, [ready, cancerType, result, lab, dateFrom, dateTo]);

  const filtersActive = !!(search || cancerType || result || lab || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch(""); setCancerType(""); setResult(""); setLab(""); setDateFrom(""); setDateTo("");
  };

  const tiles: Tile[] = [
    { key: "all", label: "Screened clients", value: summary.screened, tone: "text-gray-800 dark:text-white", active: !result && !lab, apply: () => { setResult(""); setLab(""); } },
    { key: "susp", label: "Suspicious findings", value: summary.suspicious, tone: "text-red-600", active: result === "suspicious", apply: () => { setLab(""); setResult("suspicious"); } },
    { key: "wait", label: "Awaiting lab result", value: summary.awaiting, tone: "text-amber-600", active: lab === "pending", apply: () => { setResult(""); setLab("pending"); } },
    { key: "urg", label: "Urgent lab results", value: summary.urgentLabs, tone: "text-red-600", active: lab === "urgent", apply: () => { setResult(""); setLab("urgent"); } },
  ];

  const open = (id: string) => router.push(`/ncsr/client-details?clientId=${encodeURIComponent(id)}`);
  const screenAgain = (id: string) => router.push(`/ncsr/clinical-screening?search=${encodeURIComponent(id)}`);
  const labs = (id: string, tab?: string) =>
    router.push(tab ? `/ncsr/test-results?clientId=${encodeURIComponent(id)}` : `/ncsr/screening-tests-page?tab=results&search=${encodeURIComponent(id)}`);

  const fieldClass = "rounded-2xl h-11";

  const Badges = ({ c }: { c: any }) => (
    <div className="flex flex-wrap gap-1.5">
      {c.screenings.map((s: any) => (
        <span key={s.cancerType} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${resultStyle[s.screeningResult] ?? "bg-gray-100 text-gray-700"}`}>
          {cancerName(s.cancerType)}
          <span className="font-normal">· {resultText[s.screeningResult] ?? "No result"}</span>
        </span>
      ))}
    </div>
  );

  const LabLine = ({ c }: { c: any }) => {
    const l = c.labs;
    if (!l.pending && !l.released) return <span className="text-xs text-gray-400">No lab tests</span>;
    return (
      <div className="flex flex-wrap gap-1.5 text-xs">
        {l.pending > 0 && <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-semibold">{l.pending} awaiting</span>}
        {l.urgent > 0 && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-semibold">{l.urgent} urgent</span>}
        {l.abnormal > 0 && <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-semibold">{l.abnormal} abnormal</span>}
        {l.released - l.urgent - l.abnormal > 0 && (
          <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 font-semibold">{l.released - l.urgent - l.abnormal} normal / other</span>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <PageTitle>Screened Clients</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Everyone who has had at least one screening, with their findings and lab results in one place.
      </p>

      {/* Summary tiles double as quick filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
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
            <option value="abnormal">Abnormal or urgent result</option>
            <option value="urgent">Urgent result</option>
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
                  <LabLine c={c} />
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
          <div className="hidden lg:block rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
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
                    <td className="px-4 py-3"><Badges c={c} /></td>
                    <td className="px-4 py-3"><LabLine c={c} /></td>
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
