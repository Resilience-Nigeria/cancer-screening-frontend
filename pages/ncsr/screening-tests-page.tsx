import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { Search, Loader2, CheckCircle, AlertTriangle, ClipboardCheck, Activity, Paperclip, X } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { ageFromDob } from "../components/VisitDetailsFields";
import ResultAttachmentViewer from "../components/ResultAttachmentViewer";
import { ACCEPTED_ATTACHMENTS, MAX_ATTACHMENT_MB, prepareImage } from "../../lib/imageUpload";
import {
  CANCER_TYPES,
  ScreeningTest,
  cancerName,
  collectDateLabel,
  collectNoun,
  deriveResult,
  findTest,
  inconclusiveRun,
  nextStep,
  resultLabel,
  testsFor,
} from "../../lib/screeningTests";

// Route of the Stage 2 clinical screening page (it reads ?search= on load). Change if yours differs.
const CLINICAL_SCREENING_PATH = "/ncsr/clinical-screening";

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

const toneClass = {
  ok: "border-green-200 bg-green-50 text-green-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const severityChip: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  abnormal: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};

const emptySample = () => ({
  sampleDate: todayStr(),
  specimenType: "",
  collectionMethod: "",
  labSampleNumber: "",
  collectedBy: "",
  notes: "",
});

export default function ScreeningTestsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("collect");
  const [busy, setBusy] = useState(false);

  // ── Collect tab ──────────────────────────────────────────────────────
  const [cancerType, setCancerType] = useState("");
  const [testKey, setTestKey] = useState("");
  const test = findTest(testKey);

  const [lookupValue, setLookupValue] = useState("");
  const [client, setClient] = useState<any>(null);
  const [sample, setSample] = useState(emptySample());
  const [savedSample, setSavedSample] = useState<any>(null);

  // ── Results tab ──────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("collected");
  const [filterCancer, setFilterCancer] = useState("");
  const [filterTest, setFilterTest] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [samples, setSamples] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [resultForm, setResultForm] = useState<{ resultDate: string; result: string; resultValue: string; detail: string; resultNotes: string; meta: Record<string, any> }>({ resultDate: todayStr(), result: "", resultValue: "", detail: "", resultNotes: "", meta: {} });
  const [resultSaved, setResultSaved] = useState<any>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);

  const selectedTest = findTest(selected?.testType);
  const clientAge = useMemo(() => ageFromDob(client?.dateOfBirth?.slice(0, 10)), [client]);

  // Deep links: ?tab=results · ?cancer=cervical&test=hpv_dna · ?search=<clientId or phone>
  useEffect(() => {
    if (!router.isReady) return;
    const { tab: qTab, cancer, test: qTest, search } = router.query;
    if (qTab === "results") {
      setTab("results");
      // ?tab=results&search=<clientId> opens the pending list already filtered to that client
      if (typeof search === "string" && search) setListSearch(search);
    }
    if (typeof cancer === "string" && CANCER_TYPES.some((c) => c.value === cancer)) setCancerType(cancer);
    if (typeof qTest === "string" && findTest(qTest)) {
      setTestKey(qTest);
      setCancerType(findTest(qTest)!.cancerType);
    }
    if (typeof search === "string" && search && typeof qTest === "string" && findTest(qTest)) {
      setLookupValue(search);
      findClient(search, findTest(qTest));
    }
  }, [router.isReady]);

  function chooseCancer(value: string) {
    setCancerType(value);
    setTestKey("");
    setClient(null);
    setSavedSample(null);
  }

  function chooseTest(t: ScreeningTest) {
    setTestKey(t.key);
    setSavedSample(null);
    setSample(emptySample());
    // A different test may have different eligibility (e.g. prostate = male only), so re-check.
    if (client && t.sex !== "any" && String(client.gender).toLowerCase() !== t.sex) setClient(null);
  }

  async function findClient(override?: string, forTest: ScreeningTest | undefined = test) {
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
      if (forTest && forTest.sex !== "any" && String(data.client.gender).toLowerCase() !== forTest.sex) {
        setClient(null);
        toast.error(`${forTest.label} is only recorded for ${forTest.sex} clients.`);
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
    if (!client || !test) return;
    if (!sample.sampleDate) {
      toast.error(`Enter the ${collectDateLabel(test).toLowerCase()}.`);
      return;
    }
    if (sample.sampleDate > todayStr()) {
      toast.error("The date can't be in the future.");
      return;
    }
    if (test.specimenTypes?.length && !sample.specimenType) {
      toast.error("Select the specimen type.");
      return;
    }
    if (test.collectionMethods?.length && !sample.collectionMethod) {
      toast.error("Select the collection method.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/clients/${client.clientId}/screening-samples`, {
        testType: test.key,
        sampleDate: sample.sampleDate,
        specimenType: sample.specimenType || null,
        collectionMethod: sample.collectionMethod || null,
        labSampleNumber: sample.labSampleNumber.trim() || null,
        collectedBy: sample.collectedBy.trim() || null,
        notes: sample.notes.trim() || null,
      });
      setSavedSample(data?.sample ?? null);
      toast.success(`${test.label} ${collectNoun(test)} recorded.`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  function resetCollect() {
    setClient(null);
    setLookupValue("");
    setSavedSample(null);
    setSample(emptySample());
  }

  async function loadSamples() {
    setListLoading(true);
    try {
      const { data } = await api.get("/screening-samples", {
        params: {
          status: statusFilter,
          cancerType: filterCancer || undefined,
          testType: filterTest || undefined,
          search: listSearch.trim() || undefined,
        },
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
  }, [tab, statusFilter, filterCancer, filterTest]);

  function pickAttachment(file: File | null) {
    if (attachPreview) URL.revokeObjectURL(attachPreview);
    setAttachPreview("");
    if (!file) {
      setAttachFile(null);
      return;
    }
    const okType = /^image\/(jpeg|png|webp)$/.test(file.type) || file.type === "application/pdf";
    if (!okType) {
      toast.error("Choose a photo (JPG, PNG, WebP) or a PDF.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("That file is too large.");
      return;
    }
    setAttachFile(file);
    if (file.type.startsWith("image/")) setAttachPreview(URL.createObjectURL(file));
  }

  async function removeAttachment() {
    if (!selected) return;
    if (!window.confirm("Remove the attached image from this result?")) return;
    try {
      await api.delete(`/screening-samples/${selected.sampleId}/attachment`);
      setSelected((p: any) => ({ ...p, hasAttachment: false }));
      loadSamples();
      toast.success("Image removed.");
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not remove the image."));
    }
  }

  function openResultForm(s: any) {
    pickAttachment(null);
    setSelected(s);
    setResultSaved(null);
    setResultForm({
      resultDate: s.resultDate ? String(s.resultDate).slice(0, 10) : todayStr(),
      result: s.result || "",
      resultValue: s.resultValue != null ? String(s.resultValue) : "",
      detail: s.resultDetail || "",
      resultNotes: s.resultNotes || "",
      meta: s.resultMeta || {},
    });
  }

  // For PSA / AFP the category follows from the number entered.
  const derived = selectedTest?.value && resultForm.resultValue !== ""
    ? deriveResult(selectedTest, parseFloat(resultForm.resultValue))
    : null;
  const runInvalid = !!selectedTest && inconclusiveRun(selectedTest, resultForm.meta);
  const effectiveResult = runInvalid ? "" : selectedTest?.value ? derived || "" : resultForm.result;
  const needsDetail = !!selectedTest?.detail && selectedTest.detail.requiredFor.includes(effectiveResult);

  async function saveResult() {
    if (!selected || !selectedTest) return;
    const sampleDate = String(selected.sampleDate).slice(0, 10);

    for (const f of selectedTest.extraFields ?? []) {
      if (f.required && !String(resultForm.meta[f.name] ?? "").trim()) {
        toast.error(`Select or enter: ${f.label}.`);
        return;
      }
    }

    if (runInvalid) {
      // Nothing more to validate: an invalid run is saved as inconclusive.
    } else if (selectedTest.value) {
      const v = parseFloat(resultForm.resultValue);
      if (Number.isNaN(v)) {
        toast.error(`Enter the ${selectedTest.value.label}.`);
        return;
      }
      if (v < selectedTest.value.min || v > selectedTest.value.max) {
        toast.error(`${selectedTest.value.label} looks out of range.`);
        return;
      }
    } else if (!resultForm.result) {
      toast.error("Select the result.");
      return;
    }
    if (needsDetail && !resultForm.detail) {
      toast.error(`Select the ${selectedTest.detail!.label.toLowerCase()}.`);
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
      const payload: Record<string, any> = {
        resultDate: resultForm.resultDate,
        resultNotes: resultForm.resultNotes.trim() || null,
      };
      if (selectedTest.extraFields?.length) payload.resultMeta = resultForm.meta;
      if (runInvalid) payload.result = null;
      else if (selectedTest.value) payload.resultValue = parseFloat(resultForm.resultValue);
      else payload.result = resultForm.result;
      if (selectedTest.detail && needsDetail) payload[selectedTest.detail.name] = resultForm.detail;

      const { data } = await api.patch(`/screening-samples/${selected.sampleId}/result`, payload);
      let saved = data?.sample ?? { ...selected, ...payload, result: effectiveResult, resultDetail: resultForm.detail };
      toast.success("Result recorded.");

      // Optional printout image. The result is already saved, so an upload problem never loses it.
      if (attachFile) {
        try {
          const file = await prepareImage(attachFile);
          if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) throw new Error("too large");
          const form = new FormData();
          form.append("file", file);
          const up = await api.post(`/screening-samples/${selected.sampleId}/attachment`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          saved = up.data?.sample ?? { ...saved, hasAttachment: true };
          toast.success("Image attached.");
        } catch (e: any) {
          toast.error("The result is saved, but the image could not be uploaded. Open the sample again to retry.");
        }
        pickAttachment(null);
      }
      setResultSaved(saved);
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
  const pill = (active: boolean) =>
    `px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
      active ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
    }`;

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <PageTitle>Sample Collection & Test Results</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Record when a sample is taken or a test is performed, then enter the result once it is released. Covers
          breast, cervical, prostate, liver and colorectal screening tests.
        </p>
      </div>

      <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
        {([
          ["collect", "Collect sample", ClipboardCheck],
          ["results", "Enter results", Activity],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              tab === key ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ───────────── COLLECT ───────────── */}
      {tab === "collect" && (
        <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 space-y-6">
          {savedSample && test ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white capitalize">{collectNoun(test)} recorded</h3>
              <p className="text-sm text-gray-500">
                {test.label} · {client?.fullName} · {prettyDate(savedSample.sampleDate)}
              </p>
              <div className="inline-block rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-lg font-bold tracking-wider text-green-800 select-all">
                {savedSample.sampleRef}
              </div>
              <p className="text-xs text-gray-500">
                {test.kind === "procedure" ? "Write this reference on the request form." : "Write this reference on the sample and the lab form."}
              </p>
              {test.key === "hpv_dna" && (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-3 text-left max-w-md mx-auto">
                  <b>Tip:</b> when the lab loads this sample on the Truenat machine, type <b>{savedSample.sampleRef}</b> in the
                  machine&apos;s <b>Patient ID</b> field (not a running number like 001). The printout then matches this record
                  without any guessing.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button layout="outline" className="rounded-xl" onClick={resetCollect}>
                  Record another {test.label}
                </Button>
                <Button className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" onClick={() => setTab("results")}>
                  Go to results
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Choose the test */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">1. Choose the test</h3>
                <div className="flex flex-wrap gap-2">
                  {CANCER_TYPES.map((c) => (
                    <button key={c.value} type="button" onClick={() => chooseCancer(c.value)} className={pill(cancerType === c.value)}>
                      {c.label}
                    </button>
                  ))}
                </div>
                {cancerType && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {testsFor(cancerType).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => chooseTest(t)}
                        className={`text-left p-3 rounded-xl border transition-colors ${
                          testKey === t.key
                            ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{t.label}</p>
                        <p className="text-xs text-gray-500">
                          {t.kind === "procedure" ? "Procedure / imaging" : "Lab sample"}
                          {t.sex !== "any" ? ` · ${t.sex} clients` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {!cancerType && <p className="text-sm text-gray-500">Select a cancer type to see its tests.</p>}
              </div>

              {/* 2. Find the client */}
              {test && (
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">2. Find the client</h3>
                  <div className="flex gap-2">
                    <Input
                      className="rounded-2xl h-12 flex-1 min-w-0"
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
                      <p className="text-green-700 break-words">
                        {client.clientId} · {clientAge !== null && clientAge !== undefined ? `${clientAge} yrs · ` : ""}
                        {client.phoneNumber}
                        {client.phoneNotClients ? " (caregiver's number)" : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Details */}
              {test && client && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">3. {test.label} details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Label>
                      <span className="text-sm font-semibold">{collectDateLabel(test)} *</span>
                      <Input
                        type="date"
                        max={todayStr()}
                        className={inputClass}
                        value={sample.sampleDate}
                        onChange={(e) => setSample((p) => ({ ...p, sampleDate: e.target.value }))}
                      />
                    </Label>
                    {test.specimenTypes && test.specimenTypes.length > 0 && (
                      <Label>
                        <span className="text-sm font-semibold">Specimen type *</span>
                        <Select
                          className={inputClass}
                          value={sample.specimenType}
                          onChange={(e) => setSample((p) => ({ ...p, specimenType: e.target.value }))}
                        >
                          <option value="">Select</option>
                          {test.specimenTypes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Select>
                      </Label>
                    )}
                    {test.collectionMethods && test.collectionMethods.length > 0 && (
                      <Label>
                        <span className="text-sm font-semibold">Collection method *</span>
                        <Select
                          className={inputClass}
                          value={sample.collectionMethod}
                          onChange={(e) => setSample((p) => ({ ...p, collectionMethod: e.target.value }))}
                        >
                          <option value="">Select</option>
                          {test.collectionMethods.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </Select>
                      </Label>
                    )}
                    <Label>
                      <span className="text-sm font-semibold">
                        {test.kind === "procedure" ? "Request / accession number" : "Lab / barcode number"}{" "}
                        <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <Input
                        className={inputClass}
                        value={sample.labSampleNumber}
                        onChange={(e) => setSample((p) => ({ ...p, labSampleNumber: e.target.value }))}
                      />
                    </Label>
                    <Label>
                      <span className="text-sm font-semibold">
                        {test.kind === "procedure" ? "Performed by" : "Collected by"}{" "}
                        <span className="text-gray-400 font-normal">(optional)</span>
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
                        className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-base sm:text-sm"
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
                      className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Save ${collectNoun(test)}`}
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
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-start">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ["collected", "Awaiting result"],
                ["result_released", "Result recorded"],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setStatusFilter(key)} className={pill(statusFilter === key)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                className="rounded-2xl h-11"
                value={filterCancer}
                onChange={(e) => {
                  setFilterCancer(e.target.value);
                  setFilterTest("");
                }}
              >
                <option value="">All cancer types</option>
                {CANCER_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
              <Select className="rounded-2xl h-11" value={filterTest} onChange={(e) => setFilterTest(e.target.value)}>
                <option value="">All tests</option>
                {(filterCancer ? testsFor(filterCancer) : []).map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2">
              <Input
                className="rounded-2xl h-11 flex-1 min-w-0"
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
                  {statusFilter === "collected" ? "Nothing is waiting for a result." : "No results recorded yet."}
                </p>
              )}
              {samples.map((s) => {
                const t = findTest(s.testType);
                const waiting = daysSince(s.sampleDate);
                const active = selected?.sampleId === s.sampleId;
                return (
                  <button
                    key={s.sampleId}
                    type="button"
                    onClick={() => openResultForm(s)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      active ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white break-words">
                          {s.client?.fullName || s.clientId}
                        </p>
                        <p className="text-xs font-medium text-green-700">{t?.label ?? s.testType} · {cancerName(s.cancerType)}</p>
                        <p className="text-xs text-gray-500 break-all">
                          {s.clientId} · {s.sampleRef}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t?.kind === "procedure" ? "Performed" : "Taken"} {prettyDate(s.sampleDate)}
                        </p>
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
                        <span className={`shrink-0 max-w-[45%] text-xs font-semibold px-2 py-1 rounded-full ${severityChip[s.resultSeverity || "neutral"]}`}>
                          {resultLabel(t, s.result)}
                          {s.resultValue != null && t?.value ? ` · ${s.resultValue} ${t.value.unit}` : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 space-y-4">
            {!selected && <p className="text-sm text-gray-500 py-10 text-center">Select a sample to enter its result.</p>}

            {selected && selectedTest && !resultSaved && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white break-words">
                    {selected.client?.fullName || selected.clientId}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedTest.label} · {selected.sampleRef} · {selectedTest.kind === "procedure" ? "performed" : "sample taken"}{" "}
                    {prettyDate(selected.sampleDate)}
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

                  {selectedTest.extraFields?.map((f) => (
                    <Label key={f.name} className={f.name === "runStatus" ? "sm:col-span-2" : ""}>
                      <span className="text-sm font-semibold">
                        {f.label}
                        {f.required ? " *" : <span className="text-gray-400 font-normal"> (optional)</span>}
                      </span>
                      {f.type === "select" ? (
                        <Select
                          className={inputClass}
                          value={resultForm.meta[f.name] ?? ""}
                          onChange={(e) => setResultForm((p) => ({ ...p, meta: { ...p.meta, [f.name]: e.target.value } }))}
                        >
                          <option value="">Select</option>
                          {f.options?.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type={f.type === "number" ? "number" : "text"}
                          inputMode={f.type === "number" ? "decimal" : undefined}
                          step={f.type === "number" ? "0.01" : undefined}
                          className={inputClass}
                          autoComplete="off"
                          value={resultForm.meta[f.name] ?? ""}
                          onChange={(e) => setResultForm((p) => ({ ...p, meta: { ...p.meta, [f.name]: e.target.value } }))}
                        />
                      )}
                    </Label>
                  ))}

                  {runInvalid && (
                    <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm p-3">
                      The machine run is not valid, so this will be saved as <b>inconclusive</b> and a repeat test will be needed.
                    </div>
                  )}

                  {runInvalid ? null : selectedTest.value ? (
                    <Label>
                      <span className="text-sm font-semibold">
                        {selectedTest.value.label} ({selectedTest.value.unit}) *
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={selectedTest.value.min}
                        className={inputClass}
                        value={resultForm.resultValue}
                        onChange={(e) => setResultForm((p) => ({ ...p, resultValue: e.target.value }))}
                      />
                    </Label>
                  ) : (
                    <Label>
                      <span className="text-sm font-semibold">Result *</span>
                      <Select
                        className={inputClass}
                        value={resultForm.result}
                        onChange={(e) => setResultForm((p) => ({ ...p, result: e.target.value, detail: "" }))}
                      >
                        <option value="">Select</option>
                        {selectedTest.results.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </Label>
                  )}

                  {selectedTest.value && derived && (
                    <div className="sm:col-span-2">
                      <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${
                        severityChip[selectedTest.results.find((r) => r.value === derived)?.severity || "neutral"]
                      }`}>
                        {resultLabel(selectedTest, derived)}
                      </span>
                    </div>
                  )}

                  {needsDetail && selectedTest.detail && (
                    <Label className="sm:col-span-2">
                      <span className="text-sm font-semibold">{selectedTest.detail.label} *</span>
                      <Select
                        className={inputClass}
                        value={resultForm.detail}
                        onChange={(e) => setResultForm((p) => ({ ...p, detail: e.target.value }))}
                      >
                        <option value="">Select</option>
                        {selectedTest.detail.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </Label>
                  )}

                  <Label className="sm:col-span-2">
                    <span className="text-sm font-semibold">Notes</span>
                    <textarea
                      className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-base sm:text-sm"
                      rows={3}
                      value={resultForm.resultNotes}
                      onChange={(e) => setResultForm((p) => ({ ...p, resultNotes: e.target.value }))}
                    />
                  </Label>

                  {/* Optional printout / photo from the lab machine */}
                  <div className="sm:col-span-2 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-3 space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Result printout / photo{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </p>
                    {selected.hasAttachment && !attachFile && (
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-green-700 font-medium">An image is already attached.</span>
                        <button type="button" className="underline text-green-700 font-semibold" onClick={() => setViewerOpen(true)}>View</button>
                        <button type="button" className="underline text-red-600 font-semibold" onClick={removeAttachment}>Remove</button>
                      </div>
                    )}
                    {attachFile ? (
                      <div className="flex items-center gap-3">
                        {attachPreview ? (
                          <img src={attachPreview} alt="Selected printout" className="h-20 w-20 rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <span className="text-xs rounded-xl bg-gray-100 px-3 py-2">PDF</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-700 truncate">{attachFile.name}</p>
                          <p className="text-xs text-gray-500">{(attachFile.size / 1024 / 1024).toFixed(1)} MB · uploads when you save</p>
                        </div>
                        <button type="button" onClick={() => pickAttachment(null)} aria-label="Remove selected file">
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept={ACCEPTED_ATTACHMENTS}
                        onChange={(e) => pickAttachment(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-green-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-green-800"
                      />
                    )}
                    <p className="text-xs text-gray-500">Take a photo of the machine printout or choose a file. JPG, PNG, WebP or PDF.</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={saveResult}
                    disabled={busy}
                    className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : selected.status === "result_released" ? "Update result" : "Save result"}
                  </Button>
                </div>
              </>
            )}

            {selected && selectedTest && resultSaved && (() => {
              const step = nextStep(selectedTest, resultSaved.result, resultSaved.resultDetail, resultSaved.resultMeta ?? resultForm.meta);
              return (
                <div className="space-y-4 text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Result recorded</h3>
                  <p className="text-sm text-gray-500 break-words">
                    {selected.client?.fullName || selected.clientId} · {selectedTest.label}: {resultLabel(selectedTest, resultSaved.result)}
                    {resultSaved.resultValue != null && selectedTest.value ? ` (${resultSaved.resultValue} ${selectedTest.value.unit})` : ""}
                    {resultSaved.resultDetail ? ` · ${resultSaved.resultDetail}` : ""} · released {prettyDate(resultSaved.resultDate)}
                  </p>
                  <div className={`text-left text-sm rounded-xl border p-3 flex gap-2 ${toneClass[step.tone]}`}>
                    {step.tone === "warn" && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{step.text}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button layout="outline" className="rounded-xl" onClick={() => setSelected(null)}>
                      Done
                    </Button>
                    {step.tone !== "ok" && (
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
      {viewerOpen && selected && (
        <ResultAttachmentViewer
          sampleId={selected.sampleId}
          title={`${selectedTest?.label ?? "Result"} · ${selected.sampleRef}`}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </Layout>
  );
}
