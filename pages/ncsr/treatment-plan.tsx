import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Label, Select, Textarea } from "@roketid/windmill-react-ui";
import {
  Search, Loader2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle,
  Inbox, ClipboardList, Users, Target, Award, HeartHandshake, X,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import TreatmentModalitiesPanel from "../components/TreatmentModalitiesPanel";
import api from "../../lib/api";

const STEPS = ["lookup", "review", "staging", "mdt", "intent", "modalities", "outcome", "done"] as const;
type StepKey = typeof STEPS[number];
const STEP_LABELS: Record<StepKey, string> = {
  lookup: "Find Client",
  review: "4.1 Review",
  staging: "4.3 Staging",
  mdt: "4.4 MDT",
  intent: "4.5 Intent",
  modalities: "4.6 Modalities",
  outcome: "4.8-4.9 Outcome",
  done: "Complete",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const MDT_PARTICIPANT_OPTIONS = [
  "Surgical Oncologist", "Medical Oncologist", "Radiation Oncologist", "Pathologist",
  "Radiologist", "Oncology Nurse", "Palliative Care Physician", "Pharmacist",
  "Dietitian", "Social Worker", "Psychologist",
];

const SURVIVORSHIP_OPTIONS = [
  "Recurrence surveillance", "Second primary cancer screening", "Late treatment effects management",
  "Rehabilitation", "Fertility counselling", "Nutrition support", "Mental health support",
  "Return-to-work assessment", "Lifestyle counselling",
];

export default function TreatmentPlanPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const currentKey = STEPS[stepIndex];
  const [showModalitiesModal, setShowModalitiesModal] = useState(false);

  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [lookupValue, setLookupValue] = useState("");
  const [notStage4Capable, setNotStage4Capable] = useState(false);

  const [clientId, setClientId] = useState("");
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);

  const [planId, setPlanId] = useState<number | null>(null);
  const [planStatus, setPlanStatus] = useState<string>("active");
  const [treatmentRecordsCount, setTreatmentRecordsCount] = useState(0);

  const [performanceStatusScale, setPerformanceStatusScale] = useState("");
  const [performanceStatusValue, setPerformanceStatusValue] = useState("");
  const [comorbidities, setComorbidities] = useState("");
  const [patientPreferencesNotes, setPatientPreferencesNotes] = useState("");
  const [consentObtained, setConsentObtained] = useState(false);
  const [consentDate, setConsentDate] = useState(todayStr());

  const [tStage, setTStage] = useState("");
  const [nStage, setNStage] = useState("");
  const [mStage, setMStage] = useState("");
  const [clinicalStage, setClinicalStage] = useState("");
  const [histologicalType, setHistologicalType] = useState("");
  const [tumourGrade, setTumourGrade] = useState("");
  const [biomarkers, setBiomarkers] = useState("");

  const [mdtParticipants, setMdtParticipants] = useState<string[]>([]);
  const [mdtDate, setMdtDate] = useState(todayStr());
  const [mdtDecisionNotes, setMdtDecisionNotes] = useState("");
  const [clinicalTrialEligible, setClinicalTrialEligible] = useState(false);

  const [treatmentIntent, setTreatmentIntent] = useState("");

  const [treatmentOutcome, setTreatmentOutcome] = useState("");
  const [outcomeDate, setOutcomeDate] = useState(todayStr());
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [survivorshipItems, setSurvivorshipItems] = useState<string[]>([]);

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
    fetchPendingEvaluations();
  }, []);

  async function fetchPendingEvaluations() {
    try {
      const { data } = await api.get("/treatment-plans/pending-evaluations");
      setPendingEvaluations(data.evaluations || []);
    } catch (err: any) {
      if (err?.response?.status === 403) setNotStage4Capable(true);
    }
  }

  function applyExistingPlan(plan: any) {
    setPlanId(plan.treatmentPlanId);
    setPlanStatus(plan.status);
    setPerformanceStatusScale(plan.performanceStatusScale || "");
    setPerformanceStatusValue(plan.performanceStatusValue || "");
    setComorbidities(plan.comorbidities || "");
    setPatientPreferencesNotes(plan.patientPreferencesNotes || "");
    setConsentObtained(!!plan.consentObtained);
    setConsentDate(plan.consentDate || todayStr());
    setTStage(plan.tStage || "");
    setNStage(plan.nStage || "");
    setMStage(plan.mStage || "");
    setClinicalStage(plan.clinicalStage || "");
    setHistologicalType(plan.histologicalType || "");
    setTumourGrade(plan.tumourGrade || "");
    setBiomarkers(Array.isArray(plan.biomarkers) ? plan.biomarkers.join(", ") : "");
    setMdtParticipants(plan.mdtParticipants || []);
    setMdtDate(plan.mdtDate || todayStr());
    setMdtDecisionNotes(plan.mdtDecisionNotes || "");
    setClinicalTrialEligible(!!plan.clinicalTrialEligible);
    setTreatmentIntent(plan.treatmentIntent || "");
    setTreatmentOutcome(plan.treatmentOutcome || "");
    setOutcomeDate(plan.outcomeDate || todayStr());
    setOutcomeNotes(plan.outcomeNotes || "");
    setSurvivorshipItems(Array.isArray(plan.survivorshipPlan) ? plan.survivorshipPlan : []);
    setTreatmentRecordsCount(plan.treatmentRecords?.length || 0);
  }

  async function loadClientContext(cId: string, evalId: number | null) {
    setBusy(true);
    try {
      const { data } = await api.get(`/treatment-plans/client-context/${cId}`);
      setClientInfo(data.client);
      setRiskProfile(data.riskProfile);
      setEvaluation(data.evaluation);
      setClientId(data.client?.clientId ?? cId);
      setEvaluationId(evalId ?? data.evaluation?.evaluationId ?? null);

      if (data.existingPlan) {
        applyExistingPlan(data.existingPlan);
        toast.success("Resuming existing treatment plan — your previous entries are shown below.");
      } else {
        setPlanId(null);
      }

      goTo("review");
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

  async function startPlan() {
    setBusy(true);
    try {
      const { data } = await api.post("/treatment-plans", { clientId, evaluationId });
      setPlanId(data.plan?.treatmentPlanId);
      await saveReview(data.plan?.treatmentPlanId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not start the treatment plan.");
      setBusy(false);
    }
  }

  async function saveReview(pId?: number | null) {
    const id = pId ?? planId;
    if (!id) return;
    setBusy(true);
    try {
      await api.patch(`/treatment-plans/${id}`, {
        performanceStatusScale: performanceStatusScale || null,
        performanceStatusValue,
        comorbidities,
        patientPreferencesNotes,
        consentObtained,
        consentDate,
      });
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveStaging() {
    if (!planId) return;
    setBusy(true);
    try {
      await api.patch(`/treatment-plans/${planId}`, {
        tStage, nStage, mStage,
        clinicalStage: clinicalStage || null,
        histologicalType, tumourGrade,
        biomarkers: biomarkers ? biomarkers.split(",").map((b) => b.trim()) : [],
      });
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save staging.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMdt() {
    if (!planId) return;
    setBusy(true);
    try {
      await api.patch(`/treatment-plans/${planId}`, {
        mdtParticipants, mdtDate, mdtDecisionNotes, clinicalTrialEligible,
      });
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save MDT review.");
    } finally {
      setBusy(false);
    }
  }

  async function saveIntent() {
    if (!planId || !treatmentIntent) {
      toast.error("Please select a treatment intent.");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/treatment-plans/${planId}`, { treatmentIntent });
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOutcome() {
    if (!planId || !treatmentOutcome) {
      toast.error("Please select the treatment outcome.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/treatment-plans/${planId}/outcome`, {
        treatmentOutcome, outcomeDate, outcomeNotes,
        survivorshipPlan: survivorshipItems,
      });
      toast.success("Treatment outcome recorded — follow-up schedule generated.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not finalize outcome.");
    } finally {
      setBusy(false);
    }
  }

  function toggleFromList(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  if (notStage4Capable) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-16">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Stage 4 not enabled here</h3>
          <p className="text-sm text-gray-500 mt-2">
            Your facility isn't currently configured for Stage 4 (Treatment & Care Management). This is set per
            facility in the Facilities admin page under "Stage Capabilities".
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Stage 4 — Treatment & Care Management</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Multidisciplinary treatment planning, delivery, monitoring, and long-term follow-up.
        </p>
      </div>

      {currentKey !== "lookup" && (
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
                <Inbox className="w-5 h-5 text-green-700" /> Cancer-Confirmed Cases Awaiting Treatment
              </h3>
              {pendingEvaluations.length === 0 ? (
                <p className="text-sm text-gray-400">No cancer-confirmed cases awaiting a treatment plan.</p>
              ) : (
                <div className="space-y-2">
                  {pendingEvaluations.map((e) => (
                    <button
                      key={e.evaluationId}
                      onClick={() => loadClientContext(e.client?.clientId, e.evaluationId)}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{e.client?.fullName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {e.client?.clientId} · {e.suspectedCancerType} · Confirmed on {e.pathologyDate}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Or find a client directly</h3>
              <p className="text-xs text-gray-400 mb-3">
                If this client already has a treatment plan, it will open with everything you'd already entered.
              </p>
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

        {currentKey === "review" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-700" /> 4.1 Review of Diagnostic Findings
            </h3>

            {clientInfo && (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{clientInfo.fullName}</p>
                  <p className="text-xs text-gray-500">{clientInfo.clientId} · {clientInfo.age} yrs · {clientInfo.gender}</p>
                </div>
                {planId && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                    Resuming plan #{planId} ({planStatus})
                  </span>
                )}
              </div>
            )}

            {evaluation && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Stage 3 Findings on File</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Suspected: {evaluation.suspectedCancerType} · Histopathology: <span className="font-semibold capitalize">{evaluation.histopathologyResult?.replace(/_/g, " ")}</span>
                  {evaluation.decisionPathway && <> · Decision: <span className="font-semibold capitalize">{evaluation.decisionPathway.replace(/_/g, " ")}</span></>}
                </p>
                {evaluation.pathologyNotes && <p className="text-sm text-gray-600 dark:text-gray-400">{evaluation.pathologyNotes}</p>}
              </div>
            )}

            {riskProfile && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Comorbidities on risk profile: {riskProfile.comorbidities || "none recorded"}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Label>
                <span className="text-sm font-semibold">Performance Status Scale</span>
                <Select className="mt-2 rounded-2xl h-12" value={performanceStatusScale} onChange={(e) => setPerformanceStatusScale(e.target.value)}>
                  <option value="">Select scale</option>
                  <option value="ecog">ECOG</option>
                  <option value="karnofsky">Karnofsky</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Score / Value</span>
                <Input className="mt-2 rounded-2xl h-12" value={performanceStatusValue} onChange={(e) => setPerformanceStatusValue(e.target.value)} placeholder="e.g. 1 or 90" />
              </Label>
            </div>

            <Label>
              <span className="text-sm font-semibold">Comorbidities</span>
              <Textarea className="mt-2 rounded-2xl" rows={2} value={comorbidities} onChange={(e) => setComorbidities(e.target.value)} />
            </Label>

            <Label>
              <span className="text-sm font-semibold">Patient Preferences</span>
              <Textarea className="mt-2 rounded-2xl" rows={2} value={patientPreferencesNotes} onChange={(e) => setPatientPreferencesNotes(e.target.value)} />
            </Label>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={consentObtained} onChange={(e) => setConsentObtained(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
                <span className="text-sm font-semibold">Informed consent obtained</span>
              </label>
              {consentObtained && (
                <Input type="date" className="rounded-xl h-10" value={consentDate} onChange={(e) => setConsentDate(e.target.value)} />
              )}
            </div>
          </div>
        )}

        {currentKey === "staging" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-green-700" /> 4.3 Cancer Staging
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Label>
                <span className="text-sm font-semibold">T Stage</span>
                <Input className="mt-2 rounded-2xl h-12" value={tStage} onChange={(e) => setTStage(e.target.value)} placeholder="e.g. T2" />
              </Label>
              <Label>
                <span className="text-sm font-semibold">N Stage</span>
                <Input className="mt-2 rounded-2xl h-12" value={nStage} onChange={(e) => setNStage(e.target.value)} placeholder="e.g. N1" />
              </Label>
              <Label>
                <span className="text-sm font-semibold">M Stage</span>
                <Input className="mt-2 rounded-2xl h-12" value={mStage} onChange={(e) => setMStage(e.target.value)} placeholder="e.g. M0" />
              </Label>
            </div>
            <Label>
              <span className="text-sm font-semibold">Clinical Stage</span>
              <Select className="mt-2 rounded-2xl h-12" value={clinicalStage} onChange={(e) => setClinicalStage(e.target.value)}>
                <option value="">Select stage</option>
                {["I", "II", "III", "IV"].map((s) => <option key={s} value={s}>Stage {s}</option>)}
              </Select>
            </Label>
            <Label>
              <span className="text-sm font-semibold">Histological Type</span>
              <Input className="mt-2 rounded-2xl h-12" value={histologicalType} onChange={(e) => setHistologicalType(e.target.value)} />
            </Label>
            <Label>
              <span className="text-sm font-semibold">Tumour Grade</span>
              <Input className="mt-2 rounded-2xl h-12" value={tumourGrade} onChange={(e) => setTumourGrade(e.target.value)} />
            </Label>
            <Label>
              <span className="text-sm font-semibold">Biomarkers <span className="text-xs font-normal text-gray-400">(comma-separated, e.g. ER+, PR+, HER2-)</span></span>
              <Input className="mt-2 rounded-2xl h-12" value={biomarkers} onChange={(e) => setBiomarkers(e.target.value)} />
            </Label>
          </div>
        )}

        {currentKey === "mdt" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-green-700" /> 4.4 Multidisciplinary Team (MDT) Review
            </h3>
            <div>
              <p className="text-sm font-semibold mb-2">Participants</p>
              <div className="flex flex-wrap gap-2">
                {MDT_PARTICIPANT_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggleFromList(mdtParticipants, setMdtParticipants, p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      mdtParticipants.includes(p) ? "bg-green-700 text-white border-green-700" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Label>
              <span className="text-sm font-semibold">MDT Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={mdtDate} onChange={(e) => setMdtDate(e.target.value)} />
            </Label>
            <Label>
              <span className="text-sm font-semibold">Decision Notes</span>
              <Textarea className="mt-2 rounded-2xl" rows={4} value={mdtDecisionNotes} onChange={(e) => setMdtDecisionNotes(e.target.value)} placeholder="Confirmed diagnosis, stage, treatment intent, recommended plan..." />
            </Label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={clinicalTrialEligible} onChange={(e) => setClinicalTrialEligible(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
              <span className="text-sm font-semibold">Eligible for clinical trial</span>
            </label>
          </div>
        )}

        {currentKey === "intent" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">4.5 Treatment Planning — Intent</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { value: "curative", label: "Curative", desc: "Aim is complete eradication of disease" },
                { value: "neoadjuvant", label: "Neoadjuvant", desc: "Treatment before surgery (chemo/radiotherapy)" },
                { value: "adjuvant", label: "Adjuvant", desc: "Treatment after surgery to reduce recurrence" },
                { value: "disease_control", label: "Disease Control", desc: "Slow progression where cure is unlikely" },
                { value: "palliative", label: "Palliative", desc: "Improve quality of life and relieve symptoms" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTreatmentIntent(opt.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${
                    treatmentIntent === opt.value ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentKey === "modalities" && planId && (
          <div className="space-y-5 text-center py-6">
            <Award className="w-10 h-10 mx-auto text-green-700" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">4.6 Treatment Modalities</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Record each treatment a patient receives (Surgery, Chemotherapy, Radiotherapy, Hormonal Therapy,
              Immunotherapy, Targeted Therapy, Palliative Care) — a patient may have more than one.
            </p>
            {treatmentRecordsCount > 0 && (
              <p className="text-sm font-semibold text-green-700">{treatmentRecordsCount} treatment record{treatmentRecordsCount === 1 ? "" : "s"} saved so far.</p>
            )}
            <Button onClick={() => setShowModalitiesModal(true)} className="h-12 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
              Manage Treatment Modalities
            </Button>
          </div>
        )}

        {currentKey === "outcome" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-green-700" /> 4.8-4.9 Treatment Outcome & Survivorship Care
            </h3>
            <Label>
              <span className="text-sm font-semibold">Treatment Outcome *</span>
              <Select className="mt-2 rounded-2xl h-12" value={treatmentOutcome} onChange={(e) => setTreatmentOutcome(e.target.value)}>
                <option value="">Select outcome</option>
                <option value="complete_response">Complete Response</option>
                <option value="partial_response">Partial Response</option>
                <option value="stable_disease">Stable Disease</option>
                <option value="progressive_disease">Progressive Disease</option>
                <option value="recurrence">Recurrence</option>
                <option value="remission">Remission</option>
                <option value="disease_free">Disease-Free</option>
                <option value="deceased">Deceased</option>
                <option value="lost_to_followup">Lost to Follow-up</option>
              </Select>
            </Label>
            <Label>
              <span className="text-sm font-semibold">Outcome Date *</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={outcomeDate} onChange={(e) => setOutcomeDate(e.target.value)} />
            </Label>
            <Label>
              <span className="text-sm font-semibold">Outcome Notes</span>
              <Textarea className="mt-2 rounded-2xl" rows={3} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} />
            </Label>

            <div>
              <p className="text-sm font-semibold mb-2">Survivorship Care Plan</p>
              <div className="flex flex-wrap gap-2">
                {SURVIVORSHIP_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleFromList(survivorshipItems, setSurvivorshipItems, s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      survivorshipItems.includes(s) ? "bg-green-700 text-white border-green-700" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Finalizing this will automatically generate the follow-up schedule (1, 3, 6, 12 months, then annually).
              </p>
            </div>
          </div>
        )}

        {currentKey === "done" && (
          <div className="text-center py-10 space-y-3">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Treatment plan complete</h3>
            {planId && (
              <Button
                onClick={() => router.push(`/ncsr/follow-up-schedules`)}
                className="mt-4 h-12 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
              >
                View Follow-up Schedule
              </Button>
            )}
          </div>
        )}

        {!["lookup", "done", "modalities"].includes(currentKey) && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button layout="outline" onClick={back} className="h-11 px-5 rounded-2xl">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {currentKey === "review" && (
              <Button onClick={() => (planId ? saveReview() : startPlan())} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "staging" && (
              <Button onClick={saveStaging} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "mdt" && (
              <Button onClick={saveMdt} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "intent" && (
              <Button onClick={saveIntent} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to Modalities <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
            {currentKey === "outcome" && (
              <Button onClick={submitOutcome} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Outcome"}
              </Button>
            )}
          </div>
        )}

        {currentKey === "modalities" && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button layout="outline" onClick={back} className="h-11 px-5 rounded-2xl">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={next} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
              Continue to Outcome <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {showModalitiesModal && planId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">4.6 Treatment Modalities</h3>
              <button
                onClick={() => setShowModalitiesModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <TreatmentModalitiesPanel
              planId={planId}
              onRecordsChange={(records) => setTreatmentRecordsCount(records.length)}
            />
            <div className="flex justify-end pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
              <Button onClick={() => setShowModalitiesModal(false)} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                Done — Return to Treatment Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
