import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select, Pagination, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@roketid/windmill-react-ui";
import { Search, Loader2, Download, X, FlaskConical, Paperclip } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import ResultAttachmentViewer from "../components/ResultAttachmentViewer";
import TestResultModal from "../../components/TestResultModal";
import { hpvRiskLabel } from "../../lib/hpvRisk";
import { CANCER_TYPES, cancerName, findTest, resultLabel, testsFor } from "../../lib/screeningTests";

// Stage 2 clinical screening page (reads ?search= on load) and the sample/result entry page. Change if yours differ.
const CLINICAL_SCREENING_PATH = "/ncsr/clinical-screening";
const SAMPLES_PATH = "/ncsr/screening-tests-page";

const PER_PAGE = 15;

const severityChip: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  abnormal: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};

const TILES: { key: "" | "normal" | "abnormal" | "urgent" | "neutral"; label: string; field: string; ring: string }[] = [
  { key: "", label: "All results", field: "total", ring: "ring-green-600" },
  { key: "normal", label: "Normal", field: "normal", ring: "ring-green-600" },
  { key: "abnormal", label: "Abnormal", field: "abnormal", ring: "ring-amber-500" },
  { key: "urgent", label: "Urgent / suspicious", field: "urgent", ring: "ring-red-500" },
  { key: "neutral", label: "Inconclusive", field: "neutral", ring: "ring-gray-400" },
];

function prettyDate(d?: string | null) {
  if (!d) return "—";
  return new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "Positive · HPV genotype 16" / "Elevated (4 – 10 ng/mL) · 6.2 ng/mL" */
function describe(s: any) {
  const t = findTest(s.testType);
  const parts = [resultLabel(t, s.result)];
  if (s.resultValue != null && t?.value) parts.push(`${s.resultValue} ${t.value.unit}`);
  if (s.resultMeta?.runStatus && s.resultMeta.runStatus !== "Valid") parts.push(`Run ${String(s.resultMeta.runStatus).toLowerCase()}`);
  if (s.resultDetail && t?.detail) {
    const opt = t.detail.options.find((o) => o.value === s.resultDetail);
    parts.push(`${t.detail.label}: ${opt?.label ?? s.resultDetail}`);
  }
  if (s.resultMeta?.riskCategory) parts.push(`Viral load: ${hpvRiskLabel(s.resultMeta.riskCategory).toLowerCase()}`);
  return parts;
}

function csvEscape(v: any) {
  const str = v == null ? "" : String(v);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export default function TestResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, normal: 0, abnormal: 0, urgent: 0, neutral: 0 });
  const [page, setPage] = useState(1);

  const [cancerType, setCancerType] = useState("");
  const [testType, setTestType] = useState("");
  const [severity, setSeverity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [ready, setReady] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (typeof q.clientId === "string") setClientId(q.clientId);
    if (typeof q.cancer === "string") setCancerType(q.cancer);
    if (typeof q.severity === "string") setSeverity(q.severity);
    setReady(true);
  }, [router.isReady]);

  const params = (extra: Record<string, any> = {}) => ({
    cancerType: cancerType || undefined,
    testType: testType || undefined,
    severity: severity || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    clientId: clientId || undefined,
    search: search.trim() || undefined,
    ...extra,
  });

  async function load(p = page) {
    setLoading(true);
    try {
      const { data } = await api.get("/screening-samples/results", { params: params({ page: p, perPage: PER_PAGE }) });
      setRows(data?.results ?? []);
      setTotal(data?.total ?? 0);
      setSummary(data?.summary ?? summary);
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not load results."));
    } finally {
      setLoading(false);
    }
  }

  // Any filter change goes back to page 1.
  useEffect(() => {
    if (!ready) return;
    setPage(1);
    load(1);
  }, [ready, cancerType, testType, severity, dateFrom, dateTo, clientId]);

  useEffect(() => {
    if (ready) load(page);
  }, [page]);

  function clearFilters() {
    setCancerType("");
    setTestType("");
    setSeverity("");
    setDateFrom("");
    setDateTo("");
    setClientId("");
    setSearch("");
  }

  const filtersActive = !!(cancerType || testType || severity || dateFrom || dateTo || clientId || search);

  async function exportCsv() {
    try {
      const { data } = await api.get("/screening-samples/results", { params: params({ page: 1, perPage: 500 }) });
      const list: any[] = data?.results ?? [];
      if (list.length === 0) {
        toast.error("Nothing to export.");
        return;
      }
      const header = ["Client", "Client ID", "Phone", "Facility", "Cancer type", "Test", "Reference", "Sample/test date", "Result date", "Result", "Value", "Detail", "Platform", "Run status", "Control Ct", "Kit lot", "Printout attached", "Notes"];
      const lines = list.map((s) => {
        const t = findTest(s.testType);
        return [
          s.client?.fullName, s.clientId, s.client?.phoneNumber, s.facility?.facilityName, cancerName(s.cancerType), t?.label ?? s.testType, s.sampleRef,
          String(s.sampleDate).slice(0, 10), String(s.resultDate).slice(0, 10), resultLabel(t, s.result),
          s.resultValue != null ? `${s.resultValue} ${t?.value?.unit ?? ""}`.trim() : "", s.resultDetail,
          s.resultMeta?.assay, s.resultMeta?.runStatus, s.resultMeta?.controlCt, s.resultMeta?.lotNumber, s.hasAttachment ? "yes" : "", s.resultNotes,
        ].map(csvEscape).join(",");
      });
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-results-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${list.length} result${list.length === 1 ? "" : "s"}${total > list.length ? ` (first ${list.length} of ${total})` : ""}.`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Export failed."));
    }
  }

  const openClient = (id: string) => router.push({ pathname: CLINICAL_SCREENING_PATH, query: { search: id } });

  const fieldClass = "rounded-2xl h-11";

  return (
    <Layout>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <PageTitle>All Test Results</PageTitle>
          <p className="text-sm text-gray-500 -mt-4">Every recorded sample and test result across breast, cervical, prostate, liver and colorectal screening.</p>
        </div>
        <div className="flex gap-2">
          <Button layout="outline" className="rounded-2xl flex-1 sm:flex-none" onClick={() => router.push(SAMPLES_PATH)}>
            <FlaskConical className="w-4 h-4 mr-2" /> Record
          </Button>
          <Button layout="outline" className="rounded-2xl flex-1 sm:flex-none" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary tiles — click to filter by outcome */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 sm:mb-6">
        {TILES.map((t) => {
          const active = severity === t.key;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => setSeverity(t.key)}
              className={`text-left rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-3 sm:p-4 transition-all ${
                active ? `ring-2 ${t.ring}` : "hover:shadow-md"
              } ${t.key === "" ? "col-span-2 md:col-span-1" : ""}`}
            >
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{t.label}</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                {((summary as any)[t.field] ?? 0).toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Select className={fieldClass} value={cancerType} onChange={(e) => { setCancerType(e.target.value); setTestType(""); }}>
            <option value="">All cancer types</option>
            {CANCER_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select className={fieldClass} value={testType} onChange={(e) => setTestType(e.target.value)} disabled={!cancerType}>
            <option value="">{cancerType ? "All tests" : "Select a cancer type first"}</option>
            {(cancerType ? testsFor(cancerType) : []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </Select>
          <label className="block">
            <span className="sr-only">Result date from</span>
            <Input type="date" className={fieldClass} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} aria-label="Result date from" />
          </label>
          <label className="block">
            <span className="sr-only">Result date to</span>
            <Input type="date" className={fieldClass} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} aria-label="Result date to" />
          </label>
        </div>
        <div className="flex gap-2">
          <Input
            className={`${fieldClass} flex-1 min-w-0`}
            placeholder="Search name, phone, Client ID or lab number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1); } }}
          />
          <Button onClick={() => { setPage(1); load(1); }} className="h-11 px-4 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {(clientId || filtersActive) && (
          <div className="flex flex-wrap items-center gap-2">
            {clientId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold px-3 py-1">
                Client {clientId}
                <button type="button" onClick={() => setClientId("")} aria-label="Remove client filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-gray-600 underline">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading && rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="font-semibold text-gray-800 dark:text-gray-100">No results found</p>
          <p className="mt-1 text-sm text-gray-500">{filtersActive ? "Try clearing some filters." : "Results appear here once they are recorded."}</p>
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          {/* Mobile / tablet cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map((s) => {
              const t = findTest(s.testType);
              const [main, ...extra] = describe(s);
              return (
                <div key={s.sampleId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 cursor-pointer" onClick={() => setDetail(s)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white break-words">{s.client?.fullName || s.clientId}</p>
                      <p className="text-xs text-green-700 font-medium break-all">{s.clientId}</p>
                    </div>
                    <span className={`shrink-0 max-w-[50%] text-xs font-semibold px-2 py-1 rounded-full ${severityChip[s.resultSeverity || "neutral"]}`}>{main}</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{t?.label ?? s.testType} <span className="text-gray-400">· {cancerName(s.cancerType)}</span></p>
                  {extra.length > 0 && <p className="text-xs text-gray-500 mt-1">{extra.join(" · ")}</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    {s.sampleRef} · {t?.kind === "procedure" ? "performed" : "taken"} {prettyDate(s.sampleDate)} · released {prettyDate(s.resultDate)}
                  </p>
                  {s.facility?.facilityName && <p className="mt-1 text-xs text-gray-500">Done at {s.facility.facilityName}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <button type="button" className="text-xs font-semibold text-green-700 underline" onClick={(e) => { e.stopPropagation(); setDetail(s); }}>
                      View details
                    </button>
                    <button type="button" className="text-xs font-semibold text-green-700 underline" onClick={(e) => { e.stopPropagation(); openClient(s.clientId); }}>
                      Open in clinical screening
                    </button>
                    {s.hasAttachment && (
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 underline" onClick={(e) => { e.stopPropagation(); setViewing(s); }}>
                        <Paperclip className="w-3 h-3" /> View printout
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block rounded-2xl overflow-hidden shadow-sm">
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>Client</TableCell>
                    <TableCell>Test</TableCell>
                    <TableCell>Facility</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Sample / test date</TableCell>
                    <TableCell>Result date</TableCell>
                    <TableCell>Ref</TableCell>
                    <TableCell> </TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => {
                    const t = findTest(s.testType);
                    const [main, ...extra] = describe(s);
                    return (
                      <TableRow key={s.sampleId} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={() => setDetail(s)}>
                        <TableCell>
                          <p className="text-sm font-semibold break-words">{s.client?.fullName || "—"}</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">{s.clientId}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{t?.label ?? s.testType}</p>
                          <p className="text-xs text-gray-500">{cancerName(s.cancerType)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{s.facility?.facilityName ?? "—"}</p>
                          {s.facility?.facilityState && <p className="text-xs text-gray-500">{s.facility.facilityState}</p>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${severityChip[s.resultSeverity || "neutral"]}`}>{main}</span>
                          {extra.length > 0 && <p className="text-xs text-gray-500 mt-1">{extra.join(" · ")}</p>}
                        </TableCell>
                        <TableCell><span className="text-sm whitespace-nowrap">{prettyDate(s.sampleDate)}</span></TableCell>
                        <TableCell><span className="text-sm whitespace-nowrap">{prettyDate(s.resultDate)}</span></TableCell>
                        <TableCell><span className="text-xs whitespace-nowrap">{s.sampleRef}</span></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <button type="button" className="text-xs font-semibold text-green-700 underline whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setDetail(s); }}>
                              View details
                            </button>
                            <button type="button" className="text-xs font-semibold text-green-700 underline whitespace-nowrap" onClick={(e) => { e.stopPropagation(); openClient(s.clientId); }}>
                              Open client
                            </button>
                            {s.hasAttachment && (
                              <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 underline whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setViewing(s); }}>
                                <Paperclip className="w-3 h-3" /> Printout
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {total > PER_PAGE && (
            <div className="mt-4 sm:mt-6 overflow-x-auto">
              <Pagination totalResults={total} resultsPerPage={PER_PAGE} label="Results navigation" onChange={(p: number) => setPage(p)} />
            </div>
          )}
        </div>
      )}
      {detail && <TestResultModal sample={detail} onClose={() => setDetail(null)} onOpenClient={openClient} />}
      {viewing && (
        <ResultAttachmentViewer
          sampleId={viewing.sampleId}
          title={`${findTest(viewing.testType)?.label ?? "Result"} · ${viewing.sampleRef}`}
          onClose={() => setViewing(null)}
        />
      )}
    </Layout>
  );
}
