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

const YES_NO_UNKNOWN = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" },
];

const SYMPTOM_ITEMS = [
  { key: "lump", label: "Lump / mass" },
  { key: "pain", label: "Pain" },
  { key: "bleeding", label: "Abnormal bleeding" },
  { key: "discharge", label: "Discharge" },
  { key: "weightLoss", label: "Unexplained weight loss" },
  { key: "fatigue", label: "Fatigue" },
  { key: "other", label: "Other concerning symptom" },
];

const FAMILY_HISTORY_ITEMS = [
  { key: "breast", label: "Breast cancer" },
  { key: "cervical", label: "Cervical cancer" },
  { key: "prostate", label: "Prostate cancer" },
  { key: "colorectal", label: "Colorectal cancer" },
  { key: "liver", label: "Liver cancer" },
  { key: "other", label: "Other cancer" },
];

/** ICD-oriented cancer detail options by suspected type (extend as needed) */
const ICD_CANCER_DETAILS: Record<string, { value: string; label: string }[]> = {
  breast: [
    { value: "C50.9", label: "C50.9 — Malignant neoplasm of breast, unspecified" },
    { value: "C50.0", label: "C50.0 — Nipple and areola" },
    { value: "C50.1", label: "C50.1 — Central portion of breast" },
    { value: "C50.2", label: "C50.2 — Upper-inner quadrant" },
    { value: "C50.3", label: "C50.3 — Lower-inner quadrant" },
    { value: "C50.4", label: "C50.4 — Upper-outer quadrant" },
    { value: "C50.5", label: "C50.5 — Lower-outer quadrant" },
    { value: "C50.8", label: "C50.8 — Overlapping lesion of breast" },
  ],
  cervical: [
    { value: "C53.9", label: "C53.9 — Malignant neoplasm of cervix uteri, unspecified" },
    { value: "C53.0", label: "C53.0 — Endocervix" },
    { value: "C53.1", label: "C53.1 — Exocervix" },
    { value: "C53.8", label: "C53.8 — Overlapping lesion of cervix uteri" },
  ],
  prostate: [
    { value: "C61", label: "C61 — Malignant neoplasm of prostate" },
  ],
  colorectal: [
    { value: "C18.9", label: "C18.9 — Colon, unspecified" },
    { value: "C18.0", label: "C18.0 — Caecum" },
    { value: "C18.2", label: "C18.2 — Ascending colon" },
    { value: "C18.7", label: "C18.7 — Sigmoid colon" },
    { value: "C19", label: "C19 — Rectosigmoid junction" },
    { value: "C20", label: "C20 — Rectum" },
  ],
  liver: [
    { value: "C22.0", label: "C22.0 — Liver cell carcinoma" },
    { value: "C22.1", label: "C22.1 — Intrahepatic bile duct carcinoma" },
    { value: "C22.9", label: "C22.9 — Liver, unspecified" },
  ],
  lung: [
    { value: "C34.9", label: "C34.9 — Bronchus or lung, unspecified" },
    { value: "C34.1", label: "C34.1 — Upper lobe, bronchus or lung" },
    { value: "C34.3", label: "C34.3 — Lower lobe, bronchus or lung" },
  ],
  oral: [
    { value: "C06.9", label: "C06.9 — Mouth, unspecified" },
    { value: "C02.9", label: "C02.9 — Tongue, unspecified" },
    { value: "C03.9", label: "C03.9 — Gum, unspecified" },
  ],
};

const CANCER_LABELS: Record<string, string> = {
  breast: "Breast", cervical: "Cervix", prostate: "Prostate",
  colorectal: "Colorectal",  liver: "Liver",
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

const STEPS = ["lookup", "consultation", "examination", "tests", "pathology", "decision", "done"] as const;
type StepKey = typeof STEPS[number];
// const STEP_LABELS: Record<StepKey, string> = {
//   lookup: "Find Client",
//   consultation: "A. Consultation",
//   examination: "B. Advanced Exam",
//   tests: "C. Diagnostic Tests",
//   pathology: "D. Pathology",
//   decision: "Final Decision",
//   done: "Complete",
// };

const STEP_LABELS: Record<StepKey, string> = {
  lookup: "A. Find Client",
  consultation: "B. Consultation",
  examination: "C. Clinical Exam",
  tests: "D. Test Results",
  pathology: "E. Pathology",
  decision: "F. Final Diagnosis",
  done: "Complete",
};

const PATHOLOGY_TO_DECISION: Record<string, string> = {
  benign: "no_cancer",
  pre_cancer: "pre_cancerous",
  malignant: "cancer_confirmed",
  inconclusive: "repeat_biopsy",
};

const DECISION_OPTIONS = [
  {
    value: "no_cancer",
    label: "No Cancer Detected",
    desc: "Benign, normal, infection, inflammatory, fibroadenoma, BPE, benign cervical changes",
  },
  {
    value: "pre_cancerous",
    label: "Pre-cancerous Disease",
    desc: "CIN, adenomatous polyps, oral leukoplakia with dysplasia, Barrett's with dysplasia",
  },
  {
    value: "cancer_confirmed",
    label: "Cancer Confirmed",
    desc: "Proceeds to Stage 4 for staging, MDT review, and treatment",
  },
  {
    value: "repeat_biopsy",
    label: "Repeat Biopsy",
    desc: "Pathology was inconclusive — a repeat biopsy is required before a definitive decision can be made",
  },
];




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
  const [decisionPathway, setDecisionPathway] = useState("");
  const [managementNotes, setManagementNotes] = useState("");
  const [routineRecallDate, setRoutineRecallDate] = useState("");
  const [procedurePerformed, setProcedurePerformed] = useState("");
  const [procedureComplications, setProcedureComplications] = useState("");
  const [surveillanceNotes, setSurveillanceNotes] = useState("");

  const [symptomChecklist, setSymptomChecklist] = useState<Record<string, string>>({});
const [familyHistoryChecklist, setFamilyHistoryChecklist] = useState<Record<string, string>>({});
const [icdCancerCode, setIcdCancerCode] = useState("");


// useEffect(() => {
//   if (pathologyResult === "malignant") {
//     if (decisionPathway === "no_cancer") setDecisionPathway("cancer_confirmed");
//   }
// }, [pathologyResult]);

useEffect(() => {
  const mapped = PATHOLOGY_TO_DECISION[pathologyResult];
  if (mapped) setDecisionPathway(mapped);
}, [pathologyResult]);


async function submitDecision() {
  const expected = PATHOLOGY_TO_DECISION[pathologyResult];
  if (!evaluationId || !decisionPathway || decisionPathway !== expected) {
    toast.error("Decision pathway must match the recorded pathology result.");
    return;
  }
  if (pathologyResult === "malignant" && !icdCancerCode) {
    toast.error("Please select the ICD cancer classification.");
    return;
  }
  setBusy(true);
  try {
    await api.post(`/diagnostic-evaluations/${evaluationId}/decision`, {
      decisionPathway,
      managementNotes,
      routineRecallDate: routineRecallDate || null,
      procedurePerformed,
      procedureComplications,
      surveillanceNotes,
      icdCancerCode: icdCancerCode || null,
      symptomChecklist,
      familyHistoryChecklist,
    });
    toast.success("Clinical decision recorded — evaluation complete.");
    next();
  } catch (err: any) {
    toast.error(err?.response?.data?.message ?? "Could not save the decision.");
  } finally {
    setBusy(false);
  }
}
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

  useEffect(() => {
    if (!router.isReady) return;
    const qClientId = router.query.clientId;
    if (typeof qClientId === "string" && qClientId) {
      const qReferralId = typeof router.query.referralId === "string" ? Number(router.query.referralId) : null;
      loadClientContext(qClientId, qReferralId);
    }
  }, [router.isReady]);

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
      // Use the resolved client's actual ID, not the raw search input —
      // that input could be a phone number now that lookup supports both.
      setClientId(data.client?.clientId ?? cId);
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
      toast.success("Pathology result recorded.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not finalize pathology.");
    } finally {
      setBusy(false);
    }
  }

  // async function submitDecision() {
  //   if (!evaluationId || !decisionPathway) {
  //     toast.error("Please select a decision pathway.");
  //     return;
  //   }
  //   setBusy(true);
  //   try {
  //     await api.post(`/diagnostic-evaluations/${evaluationId}/decision`, {
  //       decisionPathway,
  //       managementNotes,
  //       routineRecallDate: routineRecallDate || null,
  //       procedurePerformed,
  //       procedureComplications,
  //       surveillanceNotes,
  //     });
  //     toast.success("Clinical decision recorded — evaluation complete.");
  //     next();
  //   } catch (err: any) {
  //     toast.error(err?.response?.data?.message ?? "Could not save the decision.");
  //   } finally {
  //     setBusy(false);
  //   }
  // }

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
    {STEPS.map((key, i) => {
      const canJump = i < stepIndex && key !== "done"; // completed steps only
      return (
        <button
          key={key}
          type="button"
          disabled={!canJump}
          onClick={() => canJump && goTo(key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            i === stepIndex
              ? "bg-green-700 text-white"
              : i < stepIndex
              ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-default"
          }`}
          title={canJump ? `Return to ${STEP_LABELS[key]}` : undefined}
        >
          {STEP_LABELS[key]}
        </button>
      );
    })}
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
    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
      B. Specialist Consultation
    </h3>

    {clientInfo && (
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4">
        <p className="text-sm font-bold text-gray-800 dark:text-white">
          {clientInfo.fullName}
        </p>
        <p className="text-xs text-gray-500">
          {clientInfo.clientId} · {clientInfo.age} yrs · {clientInfo.gender}
        </p>
      </div>
    )}

    {/* Screening findings — single reference block */}
    <div className="rounded-2xl border border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 space-y-3">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
        Screening findings (Stage 2 — reference)
      </p>

      <div>
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          Risk Factors & Family History
        </p>
        {riskProfile ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Family history: {riskProfile.familyHistory || "not recorded"} · Smoking:{" "}
            {riskProfile.smokingStatus || "not recorded"}
          </p>
        ) : (
          <p className="text-sm text-gray-400 mt-1">No risk profile on file.</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          Previous Screening Findings
        </p>
        {priorVisits.length === 0 ? (
          <p className="text-sm text-gray-400 mt-1">No prior Stage 2 visits on file.</p>
        ) : (
          priorVisits.slice(0, 3).map((v: any) => (
            <p key={v.visitId} className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {v.visitDate}:{" "}
              {v.overallOutcome
                ? v.overallOutcome.replace(/_/g, " ")
                : "no outcome recorded"}
            </p>
          ))
        )}
      </div>
    </div>

    <Label>
      <span className="text-sm font-semibold">Suspected Cancer Type *</span>
      <Select
        className="mt-2 rounded-2xl h-12"
        value={suspectedCancerType}
        onChange={(e) => setSuspectedCancerType(e.target.value)}
      >
        <option value="">Select type</option>
        {Object.entries(CANCER_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
    </Label>

    <Label>
      <span className="text-sm font-semibold">Evaluation Date *</span>
      <Input
        type="date"
        className="mt-2 rounded-2xl h-12"
        value={evaluationDate}
        onChange={(e) => setEvaluationDate(e.target.value)}
      />
    </Label>

    {/* Simplified symptom checklist */}
    <div>
      <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
        Symptoms checklist
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Tick what applies — reduces free-text burden.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SYMPTOM_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-2 p-2 rounded-xl border border-gray-100 dark:border-gray-700"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
            <Select
              className="rounded-xl h-9 w-28 text-sm"
              value={symptomChecklist[item.key] || ""}
              onChange={(e) =>
                setSymptomChecklist((p) => ({ ...p, [item.key]: e.target.value }))
              }
            >
              <option value="">—</option>
              {YES_NO_UNKNOWN.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>

    {/* Simplified family history checklist */}
    <div>
      <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
        Family history of cancer
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FAMILY_HISTORY_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-2 p-2 rounded-xl border border-gray-100 dark:border-gray-700"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
            <Select
              className="rounded-xl h-9 w-28 text-sm"
              value={familyHistoryChecklist[item.key] || ""}
              onChange={(e) =>
                setFamilyHistoryChecklist((p) => ({ ...p, [item.key]: e.target.value }))
              }
            >
              <option value="">—</option>
              {YES_NO_UNKNOWN.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>

    <Label>
      <span className="text-sm font-semibold">Consultation Notes</span>
      <Textarea
        className="mt-2 rounded-2xl"
        rows={4}
        value={consultationNotes}
        onChange={(e) => setConsultationNotes(e.target.value)}
        placeholder="Optional free-text notes after the checklists..."
      />
    </Label>
  </div>
)}

        {currentKey === "examination" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">C. Advanced Examination</h3>
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
                <FlaskConical className="w-5 h-5 text-green-700" /> D. Diagnostic Tests — {CANCER_LABELS[suspectedCancerType]}
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
              <Microscope className="w-5 h-5 text-green-700" /> E. Pathology
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

 {currentKey === "decision" && (
  <div className="space-y-5">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">E. Final Clinical Decision</h3>
    <p className="text-sm text-gray-500">
      Pathology: <span className="font-semibold capitalize">{pathologyResult.replace(/_/g, " ")}</span>
      {" · "}
      Exam & tests remain on earlier steps (use the step chips to edit).
    </p>

    {/* Decision pathway is determined by pathology, not chosen manually */}
    {(() => {
      const determined = DECISION_OPTIONS.find((o) => o.value === decisionPathway);
      if (!determined) return null;
      return (
        <div className={`p-4 rounded-xl border-2 ${
          determined.value === "cancer_confirmed"
            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
            : "border-green-600 bg-green-50 dark:bg-green-900/20"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-4 h-4 ${determined.value === "cancer_confirmed" ? "text-red-600" : "text-green-600"}`} />
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{determined.label}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">{determined.desc}</p>
          <p className="text-xs text-gray-400 mt-2 italic">
            Determined automatically from the pathology result recorded in the previous step.
          </p>
        </div>
      );
    })()}

    {/* ICD details — required for malignant */}
    {pathologyResult === "malignant" && (
      <Label>
        <span className="text-sm font-semibold">Cancer details (ICD) *</span>
        <Select
          className="mt-2 rounded-2xl h-12"
          value={icdCancerCode}
          onChange={(e) => setIcdCancerCode(e.target.value)}
        >
          <option value="">Select ICD classification</option>
          {(ICD_CANCER_DETAILS[suspectedCancerType] || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Label>
    )}

    {/* Repeat biopsy — booking details */}
    {pathologyResult === "inconclusive" && (
      <Label>
        <span className="text-sm font-semibold">Repeat Biopsy Date</span>
        <Input
          type="date"
          className="mt-2 rounded-2xl h-12"
          value={routineRecallDate}
          onChange={(e) => setRoutineRecallDate(e.target.value)}
        />
      </Label>
    )}

    <Label>
      <span className="text-sm font-semibold">Management Notes</span>
      <Textarea
        className="mt-2 rounded-2xl"
        rows={3}
        value={managementNotes}
        onChange={(e) => setManagementNotes(e.target.value)}
      />
    </Label>
  </div>
)}

   

        {currentKey === "done" && (
          <div className="text-center py-10 space-y-3">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Diagnostic evaluation complete</h3>
            <p className="text-sm text-gray-500">
              Decision: <span className="font-semibold capitalize">{decisionPathway.replace(/_/g, " ")}</span>
            </p>
           {decisionPathway === "cancer_confirmed" && (
  <p className="text-sm text-green-700 font-medium">Client is now in the Stage 4 treatment queue.</p>
)}
{decisionPathway === "repeat_biopsy" && (
  <p className="text-sm text-amber-700 font-medium">
    Client needs to return for a repeat biopsy{routineRecallDate ? ` on ${routineRecallDate}` : ""}.
  </p>
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
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "decision" && (
              <Button onClick={submitDecision} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Decision"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
