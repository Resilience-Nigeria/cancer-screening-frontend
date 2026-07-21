import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Label, Select, Textarea } from "@roketid/windmill-react-ui";
import {
  Search, Loader2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle,
  FlaskConical, Microscope, Inbox,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

const CANCER_LABELS: Record<string, string> = {
  breast: "Breast", cervical: "Cervix", prostate: "Prostate",
  colorectal: "Colorectal", lung: "Lung", liver: "Liver", oral: "Oral",
};

const CANCER_TESTS: Record<string, string[]> = {
  breast: ["Mammography", "Ultrasound", "MRI", "Core Needle Biopsy"],
  cervical: ["Colposcopy", "Cervical Biopsy"],
  prostate: ["PSA", "MRI", "Prostate Biopsy"],
  colorectal: ["Colonoscopy", "Biopsy"],
  lung: ["Chest CT", "Bronchoscopy", "Biopsy"],
  liver: ["Ultrasound", "CT", "AFP", "Biopsy"],
  oral: ["Biopsy"],
};

const BLOOD_TESTS = ["CBC", "LFT", "RFT", "Tumour Markers"];

const STEPS = ["lookup", "consultation", "examination", "tests", "pathology", "done"] as const;
type StepKey = typeof STEPS[number];
const STEP_LABELS: Record<StepKey, string> = {
  lookup: "Find Client",
  consultation: "A. Consultation",
  examination: "B. Advanced Exam",
  tests: "C. Diagnostic Tests",
  pathology: "D. Pathology",
  done: "Complete",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DiagnosticEvaluationPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const currentKey = STEPS[stepIndex];

  const [pendingReferrals, setPendingReferrals] = useState<any[]>([]);
  const [lookupValue, setLookupValue] = useState("");
  const [notStage3Capable, setNotStage3Capable] = useState(false);

  const [clientId, setClientId] = useState("");
  const [referralId, setReferralId] = useState<number | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [priorVisits, setPriorVisits] = useState<any[]>([]);

  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [suspectedCancerType, setSuspectedCancerType] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(todayStr());
  const [consultationNotes, setConsultationNotes] = useState("");
  const [examFindings, setExamFindings] = useState("");
  const [testResults, setTestResults] = useState<Record<string, { done: boolean; date: string; result: string }>>({});
  const [bloodResults, setBloodResults] = useState<Record<string, { done: boolean; result: string }>>({});
  const [pathologyResult, setPathologyResult] = useState("");
  const [pathologyNotes, setPathologyNotes] = useState("");
  const [pathologyDate, setPathologyDate] = useState(todayStr());

  function goTo(key: StepKey) {
    setStepIndex(STEPS.indexOf(key));
  }
  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  useEffect(() => {
    fetchPendingReferrals();
  }, []);

  async function fetchPendingReferrals() {
    try {
      const { data } = await api.get("/diagnostic-evaluations/pending-referrals");
      setPendingReferrals(data.referrals || []);
    } catch (err: any) {
      if (err?.response?.status === 403) setNotStage3Capable(true);
    }
  }

  async function loadClientContext(cId: string, refId: number | null) {
    setBusy(true);
    try {
      const { data } = await api.get(`/diagnostic-evaluations/client-context/${cId}`);
      setClientInfo(data.client);
      setRiskProfile(data.riskProfile);
      setPriorVisits(data.visits || []);
      setClientId(cId);
      setReferralId(refId);
      goTo("consultation");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not find this client.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup() {
    if (!lookupValue.trim()) return;
    await loadClientContext(lookupValue.trim(), null);
  }

  async function startEvaluation() {
    if (!suspectedCancerType) {
      toast.error("Please select the suspected cancer type.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/diagnostic-evaluations", {
        clientId,
        referralId,
        suspectedCancerType,
        evaluationDate,
      });
      setEvaluationId(data.evaluation?.evaluationId);
      toast.success("Evaluation started.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not start the evaluation.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSectionAndContinue() {
    if (!evaluationId) return;
    setBusy(true);
    try {
      await api.patch(`/diagnostic-evaluations/${evaluationId}`, {
        consultationNotes,
        advancedExaminationFindings: examFindings,
      });
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTestsAndContinue() {
    if (!evaluationId) return;
    setBusy(true);
    try {
      await api.patch(`/diagnostic-evaluations/${evaluationId}`, {
        diagnosticTests: testResults,
        bloodInvestigations: bloodResults,
      });
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save test results.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPathology() {
    if (!evaluationId || !pathologyResult) {
      toast.error("Please select the pathology result.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/diagnostic-evaluations/${evaluationId}/pathology`, {
        histopathologyResult: pathologyResult,
        pathologyNotes,
        pathologyDate,
      });
      toast.success("Diagnostic evaluation complete.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not finalize pathology.");
    } finally {
      setBusy(false);
    }
  }

  const relevantTests = suspectedCancerType ? CANCER_TESTS[suspectedCancerType] || [] : [];

  if (notStage3Capable) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-16">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Stage 3 not enabled here</h3>
          <p className="text-sm text-gray-500 mt-2">
            Your facility isn't currently configured for Stage 3 (Diagnostic Evaluation). This is set per facility
            in the Facilities admin page under "Stage Capabilities" — ask your administrator to enable it if this
            facility should perform diagnostic evaluations.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Stage 3 — Diagnostic Evaluation</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Specialist review to confirm or exclude cancer for clients referred from Stage 2 screening.
        </p>
      </div>

      {!["lookup"].includes(currentKey) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {STEPS.map((key, i) => (
            <div
              key={key}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                i === stepIndex ? "bg-green-700 text-white" : i < stepIndex ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}
            >
              {STEP_LABELS[key]}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6">
        {currentKey === "lookup" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-green-700" /> Pending Referrals
              </h3>
              {pendingReferrals.length === 0 ? (
                <p className="text-sm text-gray-400">No pending Stage 2 → Stage 3 referrals right now.</p>
              ) : (
                <div className="space-y-2">
                  {pendingReferrals.map((r) => (
                    <button
                      key={r.referralId}
                      onClick={() => loadClientContext(r.client?.clientId, r.referralId)}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{r.client?.fullName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.client?.clientId} · Referred from {r.fromFacility?.facilityName} on {r.referralDate}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Or find a client directly</h3>
              <div className="flex gap-3">
                <Input
                  className="flex-1 rounded-2xl h-12"
                  placeholder="Client ID or phone number"
                  value={lookupValue}
                  onChange={(e) => setLookupValue(e.target.value)}
                />
                <Button onClick={handleLookup} disabled={busy} className="h-12 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {currentKey === "consultation" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">A. Specialist Consultation</h3>

            {clientInfo && (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4">
                <p className="text-sm font-bold text-gray-800 dark:text-white">{clientInfo.fullName}</p>
                <p className="text-xs text-gray-500">{clientInfo.clientId} · {clientInfo.age} yrs · {clientInfo.gender}</p>
              </div>
            )}

            <div className="rounded-2xl border border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Review Before Proceeding</p>

              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Risk Factors & Family History</p>
                {riskProfile ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    Family history: {riskProfile.familyHistory || "not recorded"} · Smoking: {riskProfile.smokingStatus || "not recorded"}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">No risk profile on file.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Previous Screening Findings</p>
                {priorVisits.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-1">No prior Stage 2 visits on file.</p>
                ) : (
                  priorVisits.slice(0, 3).map((v: any) => (
                    <p key={v.visitId} className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {v.visitDate}: {v.overallOutcome ? v.overallOutcome.replace(/_/g, " ") : "no outcome recorded"}
                    </p>
                  ))
                )}
              </div>
            </div>

            <Label>
              <span className="text-sm font-semibold">Suspected Cancer Type *</span>
              <Select className="mt-2 rounded-2xl h-12" value={suspectedCancerType} onChange={(e) => setSuspectedCancerType(e.target.value)}>
                <option value="">Select type</option>
                {Object.entries(CANCER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Label>

            <Label>
              <span className="text-sm font-semibold">Evaluation Date *</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} />
            </Label>

            <Label>
              <span className="text-sm font-semibold">Consultation Notes</span>
              <Textarea
                className="mt-2 rounded-2xl"
                rows={4}
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                placeholder="Specialist's review of symptoms, family history, risk factors, and previous findings..."
              />
            </Label>
          </div>
        )}

        {currentKey === "examination" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">B. Advanced Examination</h3>
            <p className="text-sm text-gray-500">Repeat focused examination for {CANCER_LABELS[suspectedCancerType]}.</p>
            <Label>
              <span className="text-sm font-semibold">Examination Findings</span>
              <Textarea
                className="mt-2 rounded-2xl"
                rows={6}
                value={examFindings}
                onChange={(e) => setExamFindings(e.target.value)}
                placeholder="Document focused examination findings..."
              />
            </Label>
          </div>
        )}

        {currentKey === "tests" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-green-700" /> C. Diagnostic Tests — {CANCER_LABELS[suspectedCancerType]}
              </h3>
              <div className="mt-4 space-y-3">
                {relevantTests.map((test) => (
                  <div key={test} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={testResults[test]?.done || false}
                        onChange={(e) =>
                          setTestResults((p) => ({ ...p, [test]: { ...p[test], done: e.target.checked } }))
                        }
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">{test}</span>
                    </label>
                    {testResults[test]?.done && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <Input
                          type="date"
                          className="rounded-xl h-10"
                          value={testResults[test]?.date || ""}
                          onChange={(e) => setTestResults((p) => ({ ...p, [test]: { ...p[test], date: e.target.value } }))}
                        />
                        <Input
                          className="rounded-xl h-10"
                          placeholder="Result / finding"
                          value={testResults[test]?.result || ""}
                          onChange={(e) => setTestResults((p) => ({ ...p, [test]: { ...p[test], result: e.target.value } }))}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">Blood Investigations <span className="text-xs font-normal text-gray-400">(where indicated)</span></h3>
              <div className="mt-3 space-y-3">
                {BLOOD_TESTS.map((test) => (
                  <div key={test} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={bloodResults[test]?.done || false}
                        onChange={(e) => setBloodResults((p) => ({ ...p, [test]: { ...p[test], done: e.target.checked } }))}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">{test}</span>
                    </label>
                    {bloodResults[test]?.done && (
                      <Input
                        className="rounded-xl h-10"
                        placeholder="Result"
                        value={bloodResults[test]?.result || ""}
                        onChange={(e) => setBloodResults((p) => ({ ...p, [test]: { ...p[test], result: e.target.value } }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentKey === "pathology" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Microscope className="w-5 h-5 text-green-700" /> D. Pathology
            </h3>
            <p className="text-sm text-gray-500">The definitive diagnosis, made by histopathology.</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "benign", label: "Benign" },
                { value: "pre_cancer", label: "Pre-cancer" },
                { value: "malignant", label: "Malignant" },
                { value: "inconclusive", label: "Inconclusive" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPathologyResult(opt.value)}
                  className={`p-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    pathologyResult === opt.value
                      ? opt.value === "malignant"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Label>
              <span className="text-sm font-semibold">Pathology Date *</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={pathologyDate} onChange={(e) => setPathologyDate(e.target.value)} />
            </Label>

            <Label>
              <span className="text-sm font-semibold">Pathology Notes</span>
              <Textarea className="mt-2 rounded-2xl" rows={4} value={pathologyNotes} onChange={(e) => setPathologyNotes(e.target.value)} />
            </Label>
          </div>
        )}

        {currentKey === "done" && (
          <div className="text-center py-10 space-y-3">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Diagnostic evaluation complete</h3>
            <p className="text-sm text-gray-500">
              Pathology result: <span className="font-semibold capitalize">{pathologyResult.replace(/_/g, " ")}</span>
            </p>
            {pathologyResult === "malignant" && (
              <p className="text-sm text-red-600 font-medium">Client's journey stage advanced to Treatment.</p>
            )}
            <Button
              onClick={() => router.push(`/ncsr/client-record?clientId=${clientId}`)}
              className="mt-4 h-12 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
            >
              View Client Record
            </Button>
          </div>
        )}

        {!["lookup", "done"].includes(currentKey) && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button layout="outline" onClick={back} className="h-11 px-5 rounded-2xl">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {currentKey === "consultation" && !evaluationId && (
              <Button onClick={startEvaluation} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start Evaluation <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "consultation" && evaluationId && (
              <Button onClick={saveSectionAndContinue} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "examination" && (
              <Button onClick={saveSectionAndContinue} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "tests" && (
              <Button onClick={saveTestsAndContinue} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "pathology" && (
              <Button onClick={submitPathology} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Diagnosis"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
