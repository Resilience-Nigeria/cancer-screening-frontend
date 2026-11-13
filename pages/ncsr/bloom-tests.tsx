import React, { useEffect, useRef, useState } from "react";
import { Button, Input, Select, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, X, Building2, Phone, FlaskConical, Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

const PER_PAGE = 20;
const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const FINDING: Record<string, { label: string; cls: string }> = {
  normal: { label: "Non-suspicious", cls: "bg-green-100 text-green-800" },
  urgent: { label: "Suspicious", cls: "bg-red-100 text-red-700" },
  abnormal: { label: "Suspicious", cls: "bg-red-100 text-red-700" },
  neutral: { label: "Inconclusive", cls: "bg-gray-100 text-gray-700" },
};

type Tile = { key: string; label: string; tone: string; status?: string; finding?: string };
const TILES: Tile[] = [
  { key: "total", label: "All tests", tone: "text-gray-800 dark:text-white" },
  { key: "collected", label: "Awaiting result", tone: "text-amber-600", status: "collected" },
  { key: "normal", label: "Non-suspicious", tone: "text-green-700", finding: "normal" },
  { key: "suspicious", label: "Suspicious", tone: "text-red-600", finding: "suspicious" },
  { key: "neutral", label: "Inconclusive", tone: "text-gray-600", finding: "neutral" },
];

/** Breast screening samples and results recorded by community health workers in the Bloom app. */
export default function BloomTestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const [status, setStatus] = useState("");
  const [finding, setFinding] = useState("");
  const [testType, setTestType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<any | null>(null);
  // Deletion follows the NCSR rules: admins (or anyone, before a result) delete; others send a request.
  const [isAdmin, setIsAdmin] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delReason, setDelReason] = useState("");
  const [delConfirmed, setDelConfirmed] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    api.get("/screening-samples/deletion-access").then(({ data }: any) => setIsAdmin(!!data?.isAdmin)).catch(() => {});
  }, []);

  const closeDelete = () => {
    setDelOpen(false);
    setDelReason("");
    setDelConfirmed(false);
  };

  async function submitDelete() {
    if (!open) return;
    const direct = isAdmin || open.status !== "result_released";
    if (delReason.trim().length < 5) return toast.error("Give a short reason (at least 5 characters).");
    if (direct && !delConfirmed) return toast.error("Tick the box to confirm the deletion.");
    setDelBusy(true);
    try {
      if (direct) {
        await api.delete(`/screening-samples/${open.sampleId}`, { data: { reason: delReason.trim(), confirm: true } });
        toast.success("Deleted. An admin can restore it from Deleted Records if needed.");
      } else {
        await api.post(`/screening-samples/${open.sampleId}/deletion-request`, { reason: delReason.trim() });
        toast.success("Deletion request sent to an admin for approval.");
      }
      closeDelete();
      setOpen(null);
      load(page);
    } catch (e) {
      toast.error(friendlyError(e, "Could not complete the request."));
    } finally {
      setDelBusy(false);
    }
  }

  async function load(p = page) {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const { data } = await api.get("/bloom-admin/tests", {
        params: {
          page: p,
          perPage: PER_PAGE,
          status: status || undefined,
          finding: finding || undefined,
          testType: testType || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search.trim() || undefined,
        },
      });
      if (id !== reqId.current) return;
      setRows(data.results ?? []);
      setTotal(data.total ?? 0);
      setSummary(data.summary ?? {});
      setTests(data.tests ?? []);
    } catch (e) {
      if (id === reqId.current) toast.error(friendlyError(e, "Could not load Bloom screening tests."));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, finding, testType, dateFrom, dateTo]);

  const testOf = (key: string) => tests.find((t) => t.key === key);
  const resultText = (r: any) => {
    const t = testOf(r.testType);
    const label = t?.results?.find((x: any) => x.value === r.result)?.label ?? r.result ?? "";
    return `${label}${r.resultValue != null && t?.value ? ` · ${r.resultValue} ${t.value.unit}` : ""}`;
  };
  const metaRows = (r: any) => {
    const t = testOf(r.testType);
    const meta = r.resultMeta || {};
    return Object.entries(meta).map(([k, v]) => {
      const f = t?.extraFields?.find((x: any) => x.name === k);
      const opt = f?.options?.find((o: any) => (typeof o === "string" ? o : o.value) === String(v));
      return { label: f?.label ?? k, value: opt && typeof opt !== "string" ? opt.label : String(v) };
    });
  };

  const activeTile = (t: Tile) => (t.status ? status === t.status : t.finding ? finding === t.finding : !status && !finding);
  const chooseTile = (t: Tile) => {
    setStatus(t.status ?? "");
    setFinding(t.finding ?? "");
  };
  const filtersActive = !!(status || finding || testType || dateFrom || dateTo || search);
  const clear = () => {
    setStatus(""); setFinding(""); setTestType(""); setDateFrom(""); setDateTo(""); setSearch("");
  };

  const Chip = ({ r }: { r: any }) =>
    r.status === "result_released" ? (
      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${FINDING[r.resultSeverity || "neutral"]?.cls ?? FINDING.neutral.cls}`}>
        {resultText(r) || FINDING[r.resultSeverity || "neutral"]?.label}
      </span>
    ) : (
      <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800">Awaiting result</span>
    );

  const Who = ({ r }: { r: any }) => (
    <div className="min-w-0">
      <p className="font-semibold text-gray-800 dark:text-white break-words">
        {r.client?.fullName ?? "—"}
        {r.client?.age != null && <span className="font-normal text-gray-500">, {r.client.age} yrs</span>}
      </p>
      <p className="text-xs font-mono text-gray-500 break-all">{r.client?.clientId}</p>
      {r.client?.phoneNumber && (
        <a href={`tel:${r.client.phoneNumber}`} className="text-xs text-green-700 font-medium inline-flex items-center gap-1">
          <Phone className="w-3 h-3" /> {r.client.phoneNumber}
        </a>
      )}
    </div>
  );

  return (
    <Layout>
      <PageTitle>Bloom Screening Tests</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Breast screening samples and results recorded by community health workers in the Bloom app. They are NCSR records, so they also appear on
        Samples &amp; Test Results; results entered later at the lab show here too.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        {TILES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => chooseTile(t)}
            className={`text-left rounded-2xl border p-4 bg-white dark:bg-gray-800 transition ${
              activeTile(t) ? "border-green-600 ring-2 ring-green-100" : "border-gray-100 dark:border-gray-700 hover:border-green-300"
            }`}
          >
            <p className={`text-2xl font-bold ${t.tone}`}>{summary[t.key] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 sm:p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select className="rounded-2xl h-11" value={testType} onChange={(e: any) => setTestType(e.target.value)} aria-label="Test">
            <option value="">All breast tests</option>
            {tests.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </Select>
          <Input type="date" className="rounded-2xl h-11" value={dateFrom} max={dateTo || undefined} onChange={(e: any) => setDateFrom(e.target.value)} aria-label="Taken from" />
          <Input type="date" className="rounded-2xl h-11" value={dateTo} min={dateFrom || undefined} onChange={(e: any) => setDateTo(e.target.value)} aria-label="Taken to" />
        </div>
        <div className="flex gap-2">
          <Input
            className="rounded-2xl h-11 flex-1 min-w-0"
            placeholder="Search client name, phone, Client ID, sample ref or case code"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            onKeyDown={(e: any) => { if (e.key === "Enter") { setPage(1); load(1); } }}
          />
          <Button onClick={() => { setPage(1); load(1); }} className="h-11 px-4 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" aria-label="Search">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {filtersActive && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 underline">
            <X className="w-3 h-3" /> Reset filters
          </button>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="font-semibold text-gray-700 dark:text-gray-200">{filtersActive ? "No tests match these filters." : "No screening has been recorded from the Bloom app yet."}</p>
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          <div className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <button key={r.sampleId} type="button" onClick={() => setOpen(r)} className="w-full text-left rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Who r={r} />
                  <Chip r={r} />
                </div>
                <p className="text-sm font-semibold text-green-800">{testOf(r.testType)?.label ?? r.testType}</p>
                <p className="text-xs text-gray-500">
                  {r.sampleRef} · taken {fmt(r.sampleDate)}{r.resultDate ? ` · result ${fmt(r.resultDate)}` : ""}
                </p>
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <Building2 className="w-3 h-3 mt-0.5 text-gray-400" /> {r.facility?.name ?? "—"}
                  {r.case ? ` · ${r.case.code}${r.case.navigator ? ` · ${r.case.navigator}` : ""}` : ""}
                </p>
              </button>
            ))}
          </div>

          <div className="hidden lg:block rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm whitespace-normal">
              <thead className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Facility / health worker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((r) => (
                  <tr key={r.sampleId} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer" onClick={() => setOpen(r)}>
                    <td className="px-4 py-3"><Who r={r} /></td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{testOf(r.testType)?.label ?? r.testType}</p>
                      <p className="text-xs font-mono text-gray-500">{r.sampleRef}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <p>Taken {fmt(r.sampleDate)}</p>
                      {r.resultDate && <p className="text-xs text-gray-500">Result {fmt(r.resultDate)}</p>}
                    </td>
                    <td className="px-4 py-3"><Chip r={r} /></td>
                    <td className="px-4 py-3 max-w-[16rem]">
                      <p className="text-gray-800 dark:text-gray-100 break-words">{r.facility?.name ?? "—"}</p>
                      {r.case && <p className="text-xs text-gray-500">{r.case.code}{r.case.navigator ? ` · ${r.case.navigator}` : ""}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PER_PAGE && (
            <div className="mt-4 overflow-x-auto">
              <Pagination totalResults={total} resultsPerPage={PER_PAGE} label="Bloom tests pages" onChange={(p: number) => { setPage(p); load(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal="true" onClick={() => { closeDelete(); setOpen(null); }}>
          <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{testOf(open.testType)?.label ?? open.testType}</p>
                <p className="text-xs text-gray-500">{open.sampleRef}</p>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><dt className="text-xs text-gray-500">Client</dt><dd className="text-gray-800 dark:text-gray-100">{open.client?.fullName ?? "—"}{open.client?.age != null ? `, ${open.client.age} yrs` : ""}</dd></div>
              <div><dt className="text-xs text-gray-500">Client ID</dt><dd className="font-mono text-gray-800 dark:text-gray-100 break-all">{open.client?.clientId}</dd></div>
              <div><dt className="text-xs text-gray-500">Taken / performed</dt><dd>{fmt(open.sampleDate)}</dd></div>
              <div><dt className="text-xs text-gray-500">Result released</dt><dd>{fmt(open.resultDate)}</dd></div>
              {open.specimenType && <div><dt className="text-xs text-gray-500">Specimen</dt><dd>{open.specimenType}</dd></div>}
              {open.collectedBy && <div><dt className="text-xs text-gray-500">By</dt><dd>{open.collectedBy}</dd></div>}
              <div><dt className="text-xs text-gray-500">Facility</dt><dd>{open.facility?.name ?? "—"}</dd></div>
              <div><dt className="text-xs text-gray-500">Bloom case</dt><dd>{open.case ? `${open.case.code}${open.case.navigator ? ` · ${open.case.navigator}` : ""}` : "—"}</dd></div>
            </dl>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Result</h4>
              <Chip r={open} />
              {metaRows(open).length > 0 && (
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {metaRows(open).map((m) => (
                    <div key={m.label}><dt className="text-xs text-gray-500">{m.label}</dt><dd className="text-gray-800 dark:text-gray-100">{m.value}</dd></div>
                  ))}
                </dl>
              )}
              {open.resultNotes && <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Notes: {open.resultNotes}</p>}
            </div>
            {delOpen ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-gray-900 p-4 space-y-3">
                <p className="flex items-start gap-2 text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {isAdmin || open.status !== "result_released"
                    ? "It will be hidden and kept in Deleted Records, where an admin can restore it."
                    : "A result has been recorded, so an admin has to approve this before it is removed."}
                </p>
                <textarea
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 p-3 text-sm"
                  rows={2}
                  value={delReason}
                  onChange={(e) => setDelReason(e.target.value)}
                  placeholder="Reason, e.g. Entered against the wrong client"
                />
                {(isAdmin || open.status !== "result_released") && (
                  <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" className="mt-1" checked={delConfirmed} onChange={(e) => setDelConfirmed(e.target.checked)} />
                    I understand this removes the record from the client&apos;s results.
                  </label>
                )}
                <div className="flex justify-end gap-2">
                  <Button layout="outline" className="rounded-2xl" onClick={closeDelete} disabled={delBusy}>Cancel</Button>
                  <Button className="rounded-2xl bg-red-600 border-red-600 hover:bg-red-700" onClick={submitDelete} disabled={delBusy}>
                    {delBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : isAdmin || open.status !== "result_released" ? "Delete" : "Send request"}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              {!delOpen ? (
                <button type="button" onClick={() => setDelOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline">
                  <Trash2 className="w-4 h-4" /> {isAdmin || open.status !== "result_released" ? "Delete" : "Request deletion"}
                </button>
              ) : <span />}
              <Button className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" onClick={() => { closeDelete(); setOpen(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
