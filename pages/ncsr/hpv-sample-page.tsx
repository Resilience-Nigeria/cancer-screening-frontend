import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { Search, Loader2, CheckCircle, AlertTriangle, ClipboardCheck, Activity } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { isLowRiskType } from "../../lib/hpvRisk";
import { HPV_GENOTYPE_OPTIONS, ABLATION_GENOTYPES } from "../../lib/screeningWizardConfig";
import { ageFromDob } from "../components/VisitDetailsFields";

// Route of the Stage 2 clinical screening page (it reads ?search= on load). Change if yours differs.
const CLINICAL_SCREENING_PATH = "/clinical-screening";

const COLLECTION_METHODS = [
  { value: "clinician_collected", label: "Clinician-collected" },
  { value: "self_collected", label: "Self-collected" },
];

const RESULT_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "indeterminate", label: "Indeterminate" },
];

type Tab = "collect" | "results";
type StatusFilter = "collected" | "result_released";

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysSince(dateStr?: string) {
  if (!dateStr) return 0;
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function prettyDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// What the existing cervical pathway does with each result, mirrored from the screening config.
function nextStepFor(result: string, genotype: string): { tone: "ok" | "warn" | "info"; text: string } {
  if (result === "positive") {
    if (isLowRiskType(genotype)) {
      return { tone: "info", text: `HPV ${genotype} is a low-risk (non-oncogenic) type. No colposcopy or ablation is needed; counsel the client and re-screen at the routine interval.` };
    }
    if (ABLATION_GENOTYPES.includes(genotype)) {
      return { tone: "warn", text: `HPV ${genotype} is positive. Continue to ablation eligibility in the clinical screening.` };
    }
    return { tone: "warn", text: "Positive for another high-risk genotype. Continue to colposcopy booking in the clinical screening." };
  }
  if (result === "indeterminate") {
    return { tone: "info", text: "Indeterminate result. A repeat sample is usually needed; record a new sample from the Collect tab." };
  }
  return { tone: "ok", text: "Negative result. Record it and follow routine re-screening guidance." };
}

const toneClass = {
  ok: "border-green-200 bg-green-50 text-green-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export default function HpvSamplePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("collect");
  const [busy, setBusy] = useState(false);

  // ── Collect tab ──────────────────────────────────────────────────────
  const [lookupValue, setLookupValue] = useState("");
  const [client, setClient] = useState<any>(null);
  const [sample, setSample] = useState({
    sampleDate: todayStr(),
    collectionMethod: "clinician_collected",
    labSampleNumber: "",
    collectedBy: "",
    notes: "",
  });
  const [savedSample, setSavedSample] = useState<any>(null);

  // ── Results tab ──────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("collected");
  const [listSearch, setListSearch] = useState("");
  const [samples, setSamples] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [resultForm, setResultForm] = useState({ resultDate: todayStr(), result: "", hpvGenotype: "", resultNotes: "" });
  const [resultSaved, setResultSaved] = useState<any>(null);

  const clientAge = useMemo(() => ageFromDob(client?.dateOfBirth?.slice(0, 10)), [client]);

  // Deep link: ?search=<clientId or phone> opens the Collect tab with that client.
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.tab === "results") setTab("results"); // ?tab=results from the dashboard shortcut
    const q = router.query.search;
    if (typeof q === "string" && q) {
      setLookupValue(q);
      findClient(q);
    }
  }, [router.isReady]);

  async function findClient(override?: string) {
    const value = (override ?? lookupValue).trim();
    if (!value) {
      toast.error("Enter a phone number or Client ID.");
      return;
    }
    setBusy(true);
    setSavedSample(null);
    try {
      const { data } = await api.get("/clients/search/details", { params: { search: value } });
      if (!data?.client) {
        setClient(null);
        toast.error("No client found. Register the client in Stage 2 first.");
        return;
      }
      if (data.client.gender !== "female") {
        setClient(null);
        toast.error("HPV samples are only recorded for female clients.");
        return;
      }
      setClient(data.client);
    } catch (err: any) {
      toast.error(friendlyError(err, "Lookup failed."));
    } finally {
      setBusy(false);
    }
  }

  async function saveSample() {
    if (!client) return;
    if (!sample.sampleDate) {
      toast.error("Enter the date the sample was taken.");
      return;
    }
    if (sample.sampleDate > todayStr()) {
      toast.error("The sample date can't be in the future.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/clients/${client.clientId}/hpv-samples`, {
        ...sample,
        labSampleNumber: sample.labSampleNumber.trim() || null,
        collectedBy: sample.collectedBy.trim() || null,
        notes: sample.notes.trim() || null,
      });
      setSavedSample(data?.sample ?? null);
      toast.success("HPV sample recorded.");
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not save the sample."));
    } finally {
      setBusy(false);
    }
  }

  function resetCollect() {
    setClient(null);
    setLookupValue("");
    setSavedSample(null);
    setSample({ sampleDate: todayStr(), collectionMethod: "clinician_collected", labSampleNumber: "", collectedBy: "", notes: "" });
  }

  async function loadSamples() {
    setListLoading(true);
    try {
      const { data } = await api.get("/hpv-samples", {
        params: { status: statusFilter, search: listSearch.trim() || undefined },
      });
      setSamples(data?.samples ?? []);
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not load samples."));
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "results") loadSamples();
  }, [tab, statusFilter]);

  function openResultForm(s: any) {
    setSelected(s);
    setResultSaved(null);
    setResultForm({
      resultDate: s.resultDate ? String(s.resultDate).slice(0, 10) : todayStr(),
      result: s.result || "",
      hpvGenotype: s.hpvGenotype || "",
      resultNotes: s.resultNotes || "",
    });
  }

  async function saveResult() {
    if (!selected) return;
    const sampleDate = String(selected.sampleDate).slice(0, 10);
    if (!resultForm.result) {
      toast.error("Select the HPV result.");
      return;
    }
    if (resultForm.result === "positive" && !resultForm.hpvGenotype) {
      toast.error("Select the HPV genotype for a positive result.");
      return;
    }
    if (!resultForm.resultDate) {
      toast.error("Enter the date the result was released.");
      return;
    }
    if (resultForm.resultDate < sampleDate) {
      toast.error("The result date can't be earlier than the date the sample was taken.");
      return;
    }
    if (resultForm.resultDate > todayStr()) {
      toast.error("The result date can't be in the future.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.patch(`/hpv-samples/${selected.hpvSampleId}/result`, {
        ...resultForm,
        hpvGenotype: resultForm.result === "positive" ? resultForm.hpvGenotype : null,
        resultNotes: resultForm.resultNotes.trim() || null,
      });
      setResultSaved(data?.sample ?? { ...selected, ...resultForm });
      toast.success("Result recorded.");
      loadSamples();
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not save the result."));
    } finally {
      setBusy(false);
    }
  }

  const goToClinical = (clientId: string) =>
    router.push({ pathname: CLINICAL_SCREENING_PATH, query: { search: clientId } });

  const inputClass = "mt-2 rounded-2xl h-12";

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>HPV Sample Collection & Results</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Record when an HPV sample is taken, then enter the result once the lab releases it.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {([
          ["collect", "Collect sample", ClipboardCheck],
          ["results", "Enter results", Activity],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === key ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ───────────── COLLECT ───────────── */}
      {tab === "collect" && (
        <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6">
          {savedSample ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Sample recorded</h3>
              <p className="text-sm text-gray-500">
                {client?.fullName} · taken {prettyDate(savedSample.sampleDate)}
              </p>
              <div className="inline-block rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-lg font-bold tracking-wider text-green-800 select-all">
                {savedSample.sampleRef}
              </div>
              <p className="text-xs text-gray-500">Write this reference on the sample and the lab form.</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button layout="outline" className="rounded-xl" onClick={resetCollect}>
                  Record another
                </Button>
                <Button
                  className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
                  onClick={() => setTab("results")}
                >
                  Go to results
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">1. Find the client</h3>
                <div className="flex gap-2">
                  <Input
                    className="rounded-2xl h-12 flex-1"
                    placeholder="Phone number or Client ID"
                    value={lookupValue}
                    onChange={(e) => setLookupValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") findClient();
                    }}
                  />
                  <Button
                    onClick={() => findClient()}
                    disabled={busy}
                    className="h-12 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                  >
                    {busy && !client ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {client && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
                    <p className="font-semibold text-green-800">{client.fullName}</p>
                    <p className="text-green-700">
                      {client.clientId} · {clientAge !== null && clientAge !== undefined ? `${clientAge} yrs · ` : ""}
                      {client.phoneNumber}
                      {client.phoneNotClients ? " (caregiver's number)" : ""}
                    </p>
                  </div>
                )}
              </div>

              {client && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">2. Sample details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Label>
                      <span className="text-sm font-semibold">Date sample taken *</span>
                      <Input
                        type="date"
                        max={todayStr()}
                        className={inputClass}
                        value={sample.sampleDate}
                        onChange={(e) => setSample((p) => ({ ...p, sampleDate: e.target.value }))}
                      />
                    </Label>
                    <Label>
                      <span className="text-sm font-semibold">Collection method *</span>
                      <Select
                        className={inputClass}
                        value={sample.collectionMethod}
                        onChange={(e) => setSample((p) => ({ ...p, collectionMethod: e.target.value }))}
                      >
                        {COLLECTION_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </Select>
                    </Label>
                    <Label>
                      <span className="text-sm font-semibold">
                        Lab / barcode number <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <Input
                        className={inputClass}
                        value={sample.labSampleNumber}
                        onChange={(e) => setSample((p) => ({ ...p, labSampleNumber: e.target.value }))}
                      />
                    </Label>
                    <Label>
                      <span className="text-sm font-semibold">
                        Collected by <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <Input
                        className={inputClass}
                        value={sample.collectedBy}
                        onChange={(e) => setSample((p) => ({ ...p, collectedBy: e.target.value }))}
                      />
                    </Label>
                    <Label className="sm:col-span-2">
                      <span className="text-sm font-semibold">Notes</span>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm"
                        rows={3}
                        value={sample.notes}
                        onChange={(e) => setSample((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </Label>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={saveSample}
                      disabled={busy}
                      className="h-11 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save sample"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ───────────── RESULTS ───────────── */}
      {tab === "results" && (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ["collected", "Awaiting result"],
                ["result_released", "Result recorded"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    statusFilter === key ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                className="rounded-2xl h-11 flex-1"
                placeholder="Search name, phone or Client ID"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadSamples();
                }}
              />
              <Button onClick={loadSamples} className="h-11 px-4 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {listLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            <div className="space-y-2 max-h-[32rem] overflow-y-auto">
              {!listLoading && samples.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">
                  {statusFilter === "collected" ? "No samples are waiting for a result." : "No results recorded yet."}
                </p>
              )}
              {samples.map((s) => {
                const waiting = daysSince(s.sampleDate);
                const active = selected?.hpvSampleId === s.hpvSampleId;
                return (
                  <button
                    key={s.hpvSampleId}
                    type="button"
                    onClick={() => openResultForm(s)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      active ? "border-green-600 bg-green-50" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                          {s.client?.fullName || s.clientId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.clientId} · {s.sampleRef}
                        </p>
                        <p className="text-xs text-gray-500">Taken {prettyDate(s.sampleDate)}</p>
                      </div>
                      {s.status === "collected" ? (
                        <span
                          className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                            waiting >= 14 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {waiting === 0 ? "Today" : `${waiting}d waiting`}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                          {s.result}
                          {s.hpvGenotype ? ` · ${s.hpvGenotype}` : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
            {!selected && (
              <p className="text-sm text-gray-500 py-10 text-center">Select a sample to enter its result.</p>
            )}

            {selected && !resultSaved && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selected.client?.fullName || selected.clientId}</h3>
                  <p className="text-xs text-gray-500">
                    {selected.sampleRef} · sample taken {prettyDate(selected.sampleDate)}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Label>
                    <span className="text-sm font-semibold">Date result released *</span>
                    <Input
                      type="date"
                      min={String(selected.sampleDate).slice(0, 10)}
                      max={todayStr()}
                      className={inputClass}
                      value={resultForm.resultDate}
                      onChange={(e) => setResultForm((p) => ({ ...p, resultDate: e.target.value }))}
                    />
                  </Label>
                  <Label>
                    <span className="text-sm font-semibold">HPV result *</span>
                    <Select
                      className={inputClass}
                      value={resultForm.result}
                      onChange={(e) =>
                        setResultForm((p) => ({
                          ...p,
                          result: e.target.value,
                          hpvGenotype: e.target.value === "positive" ? p.hpvGenotype : "",
                        }))
                      }
                    >
                      <option value="">Select</option>
                      {RESULT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                  </Label>
                  {resultForm.result === "positive" && (
                    <Label className="sm:col-span-2">
                      <span className="text-sm font-semibold">HPV genotype *</span>
                      <Select
                        className={inputClass}
                        value={resultForm.hpvGenotype}
                        onChange={(e) => setResultForm((p) => ({ ...p, hpvGenotype: e.target.value }))}
                      >
                        {HPV_GENOTYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </Label>
                  )}
                  <Label className="sm:col-span-2">
                    <span className="text-sm font-semibold">Notes</span>
                    <textarea
                      className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm"
                      rows={3}
                      value={resultForm.resultNotes}
                      onChange={(e) => setResultForm((p) => ({ ...p, resultNotes: e.target.value }))}
                    />
                  </Label>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={saveResult}
                    disabled={busy}
                    className="h-11 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : selected.status === "result_released" ? "Update result" : "Save result"}
                  </Button>
                </div>
              </>
            )}

            {selected && resultSaved && (() => {
              const step = nextStepFor(resultSaved.result, resultSaved.hpvGenotype || "");
              return (
                <div className="space-y-4 text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Result recorded</h3>
                  <p className="text-sm text-gray-500">
                    {selected.client?.fullName || selected.clientId} · {resultSaved.result}
                    {resultSaved.hpvGenotype ? ` (HPV ${resultSaved.hpvGenotype})` : ""} · released {prettyDate(resultSaved.resultDate)}
                  </p>
                  <div className={`text-left text-sm rounded-xl border p-3 flex gap-2 ${toneClass[step.tone]}`}>
                    {step.tone === "warn" && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{step.text}</span>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button layout="outline" className="rounded-xl" onClick={() => setSelected(null)}>
                      Done
                    </Button>
                    {resultSaved.result !== "negative" && (
                      <Button
                        className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
                        onClick={() => goToClinical(selected.clientId)}
                      >
                        Continue clinical screening
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </Layout>
  );
}
