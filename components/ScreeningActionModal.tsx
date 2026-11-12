import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { Search, Loader2, CheckCircle, AlertTriangle, ClipboardCheck, Activity, Paperclip, X } from "lucide-react";
import toast from "react-hot-toast";

import api from "../lib/api";
import { friendlyError } from "../lib/apiError";
import { ageFromDob } from "./VisitDetailsFields";
import ResultAttachmentViewer from "./ResultAttachmentViewer";
import SampleDeleteButton from "./SampleDeleteButton";
import { HPV_RISK_OPTIONS, HPV_TRUENAT_CATEGORIES, VIRAL_LOAD_LABEL, hpvGroupCode, hpvRiskLabel } from "../lib/hpvRisk";
import { ACCEPTED_ATTACHMENTS, MAX_ATTACHMENT_MB, prepareImage } from "../lib/imageUpload";
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
  extraOptions,
  extraVisible,
} from "../lib/screeningTests";

// Route of the Stage 2 clinical screening page (it reads ?search= on load). Change if yours differs.
const CLINICAL_SCREENING_PATH = "/ncsr/clinical-screening";

type Tab = "collect" | "results";
type StatusFilter = "collected" | "result_released";

// Written out in full so Tailwind keeps these classes.
const LOAD_TONE: Record<string, string> = {
  very_low: "bg-green-100 text-green-800 border-green-500",
  low: "bg-yellow-100 text-yellow-800 border-yellow-500",
  medium: "bg-orange-100 text-orange-800 border-orange-500",
  high: "bg-red-100 text-red-700 border-red-500",
};

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

// Used when this page is shown inside the clinical screening page's result modal (?embed=1): no menu or sidebar.
type Props = {
  /** "collect" = Take a Sample / Perform Test, "result" = Record a Screening Result. */
  mode: "collect" | "result";
  testKey: string;
  clientId: string;
  onSaved?: (info: Record<string, any>) => void;
  /** "Close and continue". */
  onClose?: () => void;
};

/**
 * The sample-collection and result-entry forms, as a pop-up for the clinical screening page.
 * The test and the client are already known there, so there is no test picker, client search or tabs:
 * only the heading, the client's details and the form. (The Samples & Test Results page is separate.)
 */
export default function ScreeningActionModal({ mode, testKey: initialTestKey, clientId, onSaved, onClose }: Props) {
  const router = useRouter();
  const embed = true;

  const notifyParent = (type: "ncsr-lab-saved" | "ncsr-lab-close", extra: Record<string, any> = {}) => {
    if (type === "ncsr-lab-saved") onSaved?.(extra);
    else onClose?.();
  };
  const [tab, setTab] = useState<Tab>(mode === "result" ? "results" : "collect");
  const [busy, setBusy] = useState(false);

  // ── Collect tab ──────────────────────────────────────────────────────
  const [cancerType, setCancerType] = useState(findTest(initialTestKey)?.cancerType ?? "");
  const [testKey, setTestKey] = useState(initialTestKey);
  const test = findTest(testKey);

  const [lookupValue, setLookupValue] = useState("");
  const [client, setClient] = useState<any>(null);
  const [sample, setSample] = useState(emptySample());
  const [savedSample, setSavedSample] = useState<any>(null);

  // ── Results tab ──────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("collected");
  const [filterCancer, setFilterCancer] = useState(findTest(initialTestKey)?.cancerType ?? "");
  const [filterTest, setFilterTest] = useState(initialTestKey);
  const [listSearch, setListSearch] = useState(clientId);
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

  // Load the client's details once (the clinical screening page already identified the client).
  const [clientError, setClientError] = useState("");
  useEffect(() => {
    let cancelled = false;
    api
      .get("/clients/search/details", { params: { search: clientId } })
      .then(({ data }) => {
        if (cancelled) return;
        if (!data?.client) setClientError("Client not found.");
        else if (test && test.sex !== "any" && String(data.client.gender).toLowerCase() !== test.sex)
          setClientError(`${test.label} is only recorded for ${test.sex} clients.`);
        else setClient(data.client);
      })
      .catch(() => !cancelled && setClientError("Could not load the client's details."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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
      notifyParent("ncsr-lab-saved", { sampleId: data?.sample?.sampleId, kind: "sample" });
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

  // In the pop-up, open the only waiting sample straight away.
  useEffect(() => {
    if (embed && tab === "results" && !selected && statusFilter === "collected" && !listLoading && samples.length === 1) {
      openResultForm(samples[0]);
    }
  }, [embed, tab, samples, listLoading]);

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
  const isHpvPositive = selectedTest?.key === "hpv_dna" && effectiveResult === "positive";
  // Truenat cannot name the genotype: it reports a category (16/18, 31/33/35/45/52/58, or others) and a level.
  // Other platforms name the genotype directly.
  const useGroups = isHpvPositive && resultForm.meta.assay !== "Other platform";
  const groupCode = useGroups ? hpvGroupCode(resultForm.meta) : "";
  const effectiveDetail = useGroups ? groupCode : resultForm.detail;
  const needsDetail = !!selectedTest?.detail && selectedTest.detail.requiredFor.includes(effectiveResult);
  async function saveResult() {
    if (!selected || !selectedTest) return;
    const sampleDate = String(selected.sampleDate).slice(0, 10);

    for (const f of selectedTest.extraFields ?? []) {
      if (f.required && extraVisible(f, resultForm.meta) && !String(resultForm.meta[f.name] ?? "").trim()) {
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
    if (useGroups && !groupCode) {
      toast.error("Select the Truenat category: HPV-HR 16/18, HPV-HR 31/33/35/45/52/58 or Others.");
      return;
    }
    if (needsDetail && !effectiveDetail) {
      toast.error(`Select the ${selectedTest.detail!.label.toLowerCase()}.`);
      return;
    }
    if (isHpvPositive && !resultForm.meta.riskCategory) {
      toast.error("Select the viral load concentration (very low, low, medium or high).");
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
      if (selectedTest.extraFields?.length || isHpvPositive) {
        const meta: Record<string, any> = { ...resultForm.meta };
        // Answers to questions that no longer apply (e.g. discharge type when there is no discharge) are not saved.
        for (const f of selectedTest.extraFields ?? []) if (!extraVisible(f, meta)) delete meta[f.name];
        if (!isHpvPositive) {
          for (const k of ["riskCategory", "hrCategory", "ct", "riskSuggested", "riskOverridden", "hr1618", "level1618", "ct1618", "hrOther", "levelOther", "ctOther"]) delete meta[k];
        } else {
          for (const k of ["riskSuggested", "riskOverridden", "hr1618", "level1618", "ct1618", "hrOther", "levelOther", "ctOther"]) delete meta[k];
          if (!useGroups) { delete meta.hrCategory; delete meta.ct; }
        }
        payload.resultMeta = meta;
      }
      if (runInvalid) payload.result = null;
      else if (selectedTest.value) payload.resultValue = parseFloat(resultForm.resultValue);
      else payload.result = resultForm.result;
      if (selectedTest.detail && needsDetail) payload[selectedTest.detail.name] = effectiveDetail;

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
      notifyParent("ncsr-lab-saved", { sampleId: saved?.sampleId ?? selected?.sampleId, kind: "result" });
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
    <div>
      {/* Test and client, already known */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{test?.label ?? "Screening test"}</h3>
          {test && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              {test.kind === "procedure" ? "Procedure / imaging" : "Lab sample"}
            </span>
          )}
          {test && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">{cancerName(test.cancerType)}</span>
          )}
        </div>
        {client ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-gray-800 p-4 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="font-semibold text-green-900 dark:text-green-200">{client.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Client ID</p>
              <p className="font-mono text-gray-800 dark:text-gray-100 break-all">{client.clientId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sex · Age · Phone</p>
              <p className="text-gray-800 dark:text-gray-100 capitalize">
                {client.gender || "—"}
                {clientAge !== null && clientAge !== undefined ? ` · ${clientAge} yrs` : ""}
                {client.phoneNumber ? ` · ${client.phoneNumber}` : ""}
              </p>
            </div>
          </div>
        ) : clientError ? (
          <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{clientError}</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading client details…</p>
        )}
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
              <div>
                <SampleDeleteButton
                  sampleId={savedSample.sampleId}
                  label={`${test.label} · ${savedSample.sampleRef}`}
                  onDone={() => {
                    onSaved?.({ kind: "deleted" });
                    notifyParent("ncsr-lab-close");
                  }}
                />
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
                {!embed ? (
                  <Button layout="outline" className="rounded-xl" onClick={resetCollect}>
                    Record another {test.label}
                  </Button>
                ) : (
                  <Button
                    layout="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setFilterCancer(test.cancerType);
                      setFilterTest(test.key);
                      setListSearch(client?.clientId || "");
                      setStatusFilter("collected");
                      setSelected(null);
                      setTab("results");
                    }}
                  >
                    Record the result now
                  </Button>
                )}
                <Button className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" onClick={() => (embed ? notifyParent("ncsr-lab-close") : setTab("results"))}>
                  {embed ? "Close and continue" : "Go to results"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 3. Details */}
              {test && client && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">{test.kind === "procedure" ? "Test details" : "Sample details"}</h3>
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
        <div className="grid gap-4 items-start">
          <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 space-y-4 ${selected ? "hidden" : ""}`}>
            {embed ? (
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">Waiting for a result</h3>
                <p className="text-xs text-gray-500 mt-1">Choose the sample or test this result belongs to.</p>
              </div>
            ) : (
              <>
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

              </>
            )}

            <div className="space-y-2 max-h-[32rem] overflow-y-auto">
              {!listLoading && samples.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">
                  {statusFilter === "collected"
                    ? embed
                      ? "Nothing is waiting for a result for this test yet. Take the sample (or perform the test) first, then record its result."
                      : "Nothing is waiting for a result."
                    : "No results recorded yet."}
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
            {!selected && !listLoading && samples.length === 0 && (
              <div className="text-center py-4">
                <Button className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" onClick={() => setTab("collect")}>
                  {test?.kind === "procedure" ? "Perform the test now" : "Take the sample now"}
                </Button>
              </div>
            )}
            {!selected && samples.length > 0 && <p className="text-sm text-gray-500 py-6 text-center">Choose a sample above to record its result.</p>}
            {selected && samples.length > 1 && !resultSaved && (
              <button type="button" className="text-xs font-semibold text-green-700 hover:underline" onClick={() => setSelected(null)}>
                ← Choose a different sample
              </button>
            )}

            {selected && selectedTest && !resultSaved && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white break-words">
                      {selected.client?.fullName || selected.clientId}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedTest.label} · {selected.sampleRef} · {selectedTest.kind === "procedure" ? "performed" : "sample taken"}{" "}
                      {prettyDate(selected.sampleDate)}
                    </p>
                  </div>
                  {/* Wrong sample? Admins delete it; others send a deletion request. Soft delete, restorable. */}
                  <SampleDeleteButton
                    sampleId={selected.sampleId}
                    label={`${selectedTest.label} · ${selected.sampleRef}`}
                    onDone={() => {
                      setSelected(null);
                      loadSamples();
                      onSaved?.({ kind: "deleted" });
                    }}
                  />
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

                  {selectedTest.extraFields?.filter((f) => extraVisible(f, resultForm.meta)).map((f) => (
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
                          {extraOptions(f).map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
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
                        onChange={(e) => setResultForm((p) => ({ ...p, result: e.target.value, detail: "", meta: { ...p.meta, riskCategory: "" } }))}
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

                  {needsDetail && selectedTest.detail && !useGroups && (
                    <Label className="sm:col-span-2">
                      <span className="text-sm font-semibold">{selectedTest.detail.label} *</span>
                      <Select
                        className={inputClass}
                        value={resultForm.detail}
                        onChange={(e) =>
                          setResultForm((p) => ({
                            ...p,
                            detail: e.target.value,
                            // Suggest the risk category from the genotype; it can still be changed below.
                            meta: p.meta,
                          }))
                        }
                      >
                        <option value="">Select</option>
                        {selectedTest.detail.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </Label>
                  )}

                  {useGroups && (
                    <div className="sm:col-span-2">
                      <span className="text-sm font-semibold block mb-1">Category detected on the Truenat report *</span>
                      <div className="space-y-2" role="radiogroup" aria-label="Truenat HPV category">
                        {HPV_TRUENAT_CATEGORIES.map((c) => {
                          const on = resultForm.meta.hrCategory === c.value;
                          return (
                            <label
                              key={c.value}
                              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-3 cursor-pointer transition ${
                                on ? "border-red-400 bg-red-50 dark:bg-red-900/10" : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="truenatCategory"
                                checked={on}
                                onChange={() => setResultForm((p) => ({ ...p, meta: { ...p.meta, hrCategory: c.value } }))}
                              />
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        Truenat cannot say which genotype in the category it is, so only one category is recorded.
                      </p>
                    </div>
                  )}

                  {isHpvPositive && (
                    <div className="sm:col-span-2 space-y-4">
                      <div>
                        <span className="text-sm font-semibold block mb-1">{VIRAL_LOAD_LABEL} *</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Viral load concentration">
                          {HPV_RISK_OPTIONS.map((o) => {
                            const on = resultForm.meta.riskCategory === o.value;
                            return (
                              <button
                                key={o.value}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => setResultForm((p) => ({ ...p, meta: { ...p.meta, riskCategory: o.value } }))}
                                className={`rounded-xl border-2 px-2 py-2.5 text-sm font-semibold transition ${
                                  on ? LOAD_TONE[o.value] : "border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                              >
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">The concentration printed next to the detected category on the report.</p>
                      </div>
                      {useGroups && (
                        <Label className="block sm:max-w-xs">
                          <span className="text-sm font-semibold">Ct value <span className="text-gray-400 font-normal">(optional)</span></span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min={0}
                            max={60}
                            className={inputClass}
                            value={resultForm.meta.ct ?? ""}
                            onChange={(e) => setResultForm((p) => ({ ...p, meta: { ...p.meta, ct: e.target.value } }))}
                          />
                        </Label>
                      )}
                    </div>
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
                    {resultSaved.resultDetail ? ` · ${resultSaved.resultDetail}` : ""}
                    {(resultSaved.resultMeta?.riskCategory || (isHpvPositive && resultForm.meta.riskCategory)) ? ` · viral load ${hpvRiskLabel(resultSaved.resultMeta?.riskCategory || resultForm.meta.riskCategory).toLowerCase()}` : ""} · released {prettyDate(resultSaved.resultDate)}
                  </p>
                  <div className={`text-left text-sm rounded-xl border p-3 flex gap-2 ${toneClass[step.tone]}`}>
                    {step.tone === "warn" && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{step.text}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" onClick={() => notifyParent("ncsr-lab-close")}>
                      Close and continue
                    </Button>
                    {step.tone !== "ok" && !embed && (
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
    </div>
  );
}
