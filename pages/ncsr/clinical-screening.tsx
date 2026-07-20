import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Input,
  Label,
  Select,
} from "@roketid/windmill-react-ui";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { nigerianStates, lgasByState, getStateCode } from "../../lib/nigerianstates";
import {
  CancerType,
  cancerTypesForGender,
  cancerLabel,
  getRiskGroups,
  SCREENING_GROUPS,
  FieldGroup,
} from "../../lib/screeningWizardConfig";
import { GroupedForm, buildScreeningPayload } from "../components/ScreningWizard";

// ---------------------------------------------------------------------------
// Medical history confirm-checklist — Stage 2, Section C
// ---------------------------------------------------------------------------
const yesNoUnknown = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" },
];

const OCCUPATION_OPTIONS = [
  "Farmer/Agriculture",
  "Trader/Business Owner",
  "Civil Servant",
  "Teacher/Educator",
  "Healthcare Worker",
  "Artisan/Skilled Trade",
  "Driver/Transport",
  "Military/Security",
  "Religious Worker",
  "Student",
  "Homemaker",
  "Retired",
  "Unemployed",
  "Other",
];

const NEXT_OF_KIN_RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Other Relative",
  "Friend",
  "Other",
];

const MEDICAL_HISTORY_GROUP: FieldGroup = {
  title: "Medical History — Confirm",
  description: "Review and confirm with the client. Infection status, family history, and comorbidities (including diabetes/hypertension) are covered in the previous step — this section covers the rest.",
  fields: [
    { name: "previousCancer", label: "Previous cancer diagnosis", type: "select", options: yesNoUnknown, colSpan: 1 },
    { name: "previousCancerDetails", label: "Details (if yes)", type: "text", colSpan: 1, showIf: (v) => v.previousCancer === "yes" },
    { name: "previousSurgeries", label: "Previous surgeries", type: "select", options: yesNoUnknown, colSpan: 1 },
    { name: "previousSurgeriesDetails", label: "Details (if yes)", type: "text", colSpan: 1, showIf: (v) => v.previousSurgeries === "yes" },
    { name: "previousScreening", label: "Previous cancer screening", type: "select", options: yesNoUnknown, colSpan: 1 },
    { name: "previousScreeningDetails", label: "Details (if yes)", type: "text", colSpan: 1, showIf: (v) => v.previousScreening === "yes" },
  ],
};

// ---------------------------------------------------------------------------
// Physical examination — Stage 2, Section E
// ---------------------------------------------------------------------------
const EXAM_GROUPS: FieldGroup[] = [
  {
    title: "Basic Observations",
    fields: [
      { name: "heightCm", label: "Height (cm)", type: "number", step: "0.1", colSpan: 1 },
      { name: "weightKg", label: "Weight (kg)", type: "number", step: "0.1", colSpan: 1 },
      { name: "bmi", label: "BMI", type: "number", step: "0.1", colSpan: 1, readOnly: true, help: "Auto-calculated" },
      { name: "bloodPressureSystolic", label: "BP Systolic (mmHg)", type: "number", colSpan: 1 },
      { name: "bloodPressureDiastolic", label: "BP Diastolic (mmHg)", type: "number", colSpan: 1 },
      { name: "pulse", label: "Pulse (bpm)", type: "number", colSpan: 1 },
      { name: "temperatureCelsius", label: "Temperature (°C)", type: "number", step: "0.1", colSpan: 1 },
    ],
  },
  {
    title: "General Examination",
    fields: [
      { name: "pallor", label: "Pallor", type: "select", options: [{ value: "yes", label: "Present" }, { value: "no", label: "Absent" }], colSpan: 1 },
      { name: "weightLossNoted", label: "Weight loss noted", type: "select", options: [{ value: "yes", label: "Present" }, { value: "no", label: "Absent" }], colSpan: 1 },
      { name: "enlargedLymphNodes", label: "Enlarged lymph nodes", type: "select", options: [{ value: "yes", label: "Present" }, { value: "no", label: "Absent" }], colSpan: 1 },
      { name: "enlargedLymphNodesSite", label: "Site (if present)", type: "text", colSpan: 1, showIf: (v) => v.enlargedLymphNodes === "yes" },
      { name: "jaundice", label: "Jaundice", type: "select", options: [{ value: "yes", label: "Present" }, { value: "no", label: "Absent" }], colSpan: 1 },
      { name: "notes", label: "Additional notes", type: "textarea", colSpan: 2 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Outcome classification — Stage 2, Section G
// ---------------------------------------------------------------------------
const OUTCOME_OPTIONS: { value: string; label: string; description: string; tone: string }[] = [
  { value: "normal", label: "Normal", description: "No suspicious findings. Routine screening.", tone: "border-green-200 bg-green-50 text-green-800" },
  { value: "low_suspicion", label: "Low Suspicion", description: "Minor abnormalities. Repeat screening in 6–12 months or per protocol.", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "suspicious", label: "Suspicious", description: "Positive screening test. Refer to secondary/tertiary hospital.", tone: "border-orange-200 bg-orange-50 text-orange-800" },
  { value: "urgent_referral", label: "Urgent Referral", description: "Severe symptoms. Same-day referral.", tone: "border-red-200 bg-red-50 text-red-800" },
];

const STEPS = [
  "lookup", "registration", "riskVerify", "medicalHistory",
  "cancerTypeSelect", "screening", "physicalExam", "outcome", "done",
] as const;
type StepKey = typeof STEPS[number];

const STEP_LABELS: Record<StepKey, string> = {
  lookup: "Find Client",
  registration: "A. Registration",
  riskVerify: "B. Risk Assessment",
  medicalHistory: "C. Medical History",
  cancerTypeSelect: "Cancer Type(s)",
  screening: "D+F. Symptoms & Tests",
  physicalExam: "E. Physical Exam",
  outcome: "G. Outcome",
  done: "Complete",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ClinicalScreeningPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // Lookup
  const [lookupValue, setLookupValue] = useState("");

  // Client / visit
  const [clientId, setClientId] = useState<string>("");
  const [visitId, setVisitId] = useState<number | null>(null);

  const [biodata, setBiodata] = useState<Record<string, any>>({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    phoneNumber: "",
    email: "",
    address: "",
    stateOfResidence: "",
    lgaOfResidence: "",
    occupation: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
    nextOfKinRelationship: "",
  });

  const [risk, setRisk] = useState<Record<string, any>>({});
  const [cancerTypes, setCancerTypes] = useState<CancerType[]>([]);
  const [screenings, setScreenings] = useState<Record<string, Record<string, any>>>({});
  const [examination, setExamination] = useState<Record<string, any>>({});
  const [outcome, setOutcome] = useState<{ overallOutcome: string; outcomeNotes: string; repeatScreeningDate: string }>({
    overallOutcome: "",
    outcomeNotes: "",
    repeatScreeningDate: "",
  });

  const currentKey = STEPS[stepIndex];

  const availableCancerTypes = useMemo(
    () => cancerTypesForGender(biodata.gender),
    [biodata.gender]
  );

  const riskGroupsForVerify = useMemo(() => {
    const primaryType = cancerTypes[0] || availableCancerTypes[0]?.value || "breast";
    return getRiskGroups(primaryType as CancerType);
  }, [cancerTypes, availableCancerTypes]);

  // Prefill physical exam weight/height from the risk profile (Stage 1 /
  // Section B) once it's available, so the nurse isn't re-measuring/re-typing
  // values already on file — still editable if today's reading differs.
  useEffect(() => {
    if (!risk.weightKg && !risk.heightCm) return;
    setExamination((prev) => ({
      ...prev,
      weightKg: prev.weightKg || risk.weightKg || "",
      heightCm: prev.heightCm || risk.heightCm || "",
    }));
  }, [risk.weightKg, risk.heightCm]);

  // Auto-calc BMI for physical exam
  useEffect(() => {
    const w = parseFloat(examination.weightKg);
    const hM = parseFloat(examination.heightCm) / 100;
    const bmi = w > 0 && hM > 0 ? (w / (hM * hM)).toFixed(1) : "";
    setExamination((prev) => (prev.bmi === bmi ? prev : { ...prev, bmi }));
  }, [examination.weightKg, examination.heightCm]);

  function goTo(key: StepKey) {
    setStepIndex(STEPS.indexOf(key));
  }
  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  // ── Lookup ───────────────────────────────────────────────────────────
  async function handleLookup() {
    if (!lookupValue.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.get(`/clients/search/details`, { params: { search: lookupValue.trim() } });
      const found = data?.client;
      if (found) {
        setClientId(found.clientId);
        setBiodata({
          fullName: found.fullName || "",
          dateOfBirth: found.dateOfBirth?.slice(0, 10) || "",
          gender: found.gender || "",
          phoneNumber: found.phoneNumber || "",
          email: found.email || "",
          address: found.address || "",
          stateOfResidence: found.stateOfResidence || "",
          lgaOfResidence: found.lgaOfResidence || "",
          occupation: found.occupation || "",
          nextOfKinName: found.nextOfKinName || "",
          nextOfKinPhone: found.nextOfKinPhone || "",
          nextOfKinRelationship: found.nextOfKinRelationship || "",
        });
        toast.success("Client found — details pre-filled below.");
      } else {
        toast("No matching client — continuing as a new registration.", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Lookup failed. You can continue as a new registration.");
    } finally {
      setBusy(false);
      goTo("registration");
    }
  }

  // ── A. Registration ──────────────────────────────────────────────────
  async function submitRegistration() {
    if (!biodata.fullName || !biodata.gender || !biodata.phoneNumber) {
      toast.error("Full name, sex, and phone number are required.");
      return;
    }
    setBusy(true);
    try {
      let cId = clientId;
      if (cId) {
        await api.put(`/clients/${cId}`, biodata);
      } else {
        const { data } = await api.post(`/clients`, biodata);
        cId = data?.client?.clientId ?? data?.clientId;
        setClientId(cId);
      }

      const { data: visitData } = await api.post(`/clients/${cId}/visits`, {
        visitDate: todayStr(),
        visitType: "initial",
      });
      setVisitId(visitData?.visit?.visitId ?? visitData?.visitId);

      // Pull any existing risk profile (e.g. from a prior Bloom self-assessment)
      try {
        const { data: rp } = await api.get(`/clients/${cId}/risk-profile`);
        const profile = rp?.risk_profile ?? rp?.riskProfile ?? rp?.data ?? rp;
        if (profile) setRisk((prev) => ({ ...prev, ...profile }));
      } catch {
        // no existing profile — fine, start blank
      }

      toast.success("Client registered and visit created.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save registration.");
    } finally {
      setBusy(false);
    }
  }

  // ── B + C. Risk verify & medical history (same risk-profile record) ───
  async function submitRiskAndHistory() {
    if (!clientId) return;
    setBusy(true);
    try {
      await api.post(`/clients/${clientId}/risk-profile`, risk);
      toast.success("Risk assessment and medical history saved.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save risk assessment.");
    } finally {
      setBusy(false);
    }
  }

  // ── D + F. Symptoms & cancer-specific tests ────────────────────────────
  async function submitScreenings() {
    if (!visitId) return;
    setBusy(true);
    try {
      for (const ct of cancerTypes) {
        await api.post(`/visits/${visitId}/${ct}-screening`, buildScreeningPayload(screenings[ct] || {}));
      }
      toast.success("Screening findings saved.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save one or more screening records.");
    } finally {
      setBusy(false);
    }
  }

  // ── E. Physical examination ────────────────────────────────────────────
  async function submitExamination() {
    if (!visitId) return;
    setBusy(true);
    try {
      await api.post(`/visits/${visitId}/examination`, examination);
      toast.success("Physical examination saved.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save the examination.");
    } finally {
      setBusy(false);
    }
  }

  // ── G. Outcome classification ──────────────────────────────────────────
  async function submitOutcome() {
    if (!visitId) return;
    if (!outcome.overallOutcome) {
      toast.error("Please select an outcome classification.");
      return;
    }
    if (outcome.overallOutcome === "low_suspicion" && !outcome.repeatScreeningDate) {
      toast.error("Please set a repeat screening date for Low Suspicion outcomes.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/visits/${visitId}/outcome`, outcome);
      toast.success("Screening outcome recorded.");
      next();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save the outcome.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Stage 2 — Clinical Screening (PHC)</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          For use by a nurse, CHEW, or trained screening officer at the point of care.
        </p>
      </div>

      {/* Step progress */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((key, i) => (
          <div
            key={key}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              i === stepIndex
                ? "bg-green-700 text-white"
                : i < stepIndex
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {STEP_LABELS[key]}
          </div>
        ))}
      </div>

      <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6">
        {currentKey === "lookup" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Find an existing client</h3>
            <p className="text-sm text-gray-500">
              Search by phone number or Client ID — for example, someone who already completed a Bloom
              self-assessment. If nothing matches, you'll continue as a new registration.
            </p>
            <div className="flex gap-2">
              <Input
                className="rounded-2xl h-12 flex-1"
                placeholder="Phone number or Client ID"
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
              />
              <Button
                onClick={handleLookup}
                disabled={busy}
                className="h-12 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => goTo("registration")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              <UserPlus className="w-4 h-4" /> Skip — register a new client
            </button>
          </div>
        )}

        {currentKey === "registration" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">A. Registration</h3>
            <div className="grid grid-cols-2 gap-4">
              <Label className="col-span-2">
                <span className="text-sm font-semibold">Full Name *</span>
                <Input
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.fullName}
                  onChange={(e) => setBiodata((p) => ({ ...p, fullName: e.target.value }))}
                />
              </Label>
              <Label>
                <span className="text-sm font-semibold">Date of Birth</span>
                <Input
                  type="date"
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.dateOfBirth}
                  onChange={(e) => setBiodata((p) => ({ ...p, dateOfBirth: e.target.value }))}
                />
              </Label>
              <Label>
                <span className="text-sm font-semibold">Sex *</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.gender}
                  onChange={(e) => setBiodata((p) => ({ ...p, gender: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Phone Number *</span>
                <Input
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.phoneNumber}
                  onChange={(e) => setBiodata((p) => ({ ...p, phoneNumber: e.target.value }))}
                />
              </Label>
              <Label>
                <span className="text-sm font-semibold">Email Address <span className="text-gray-400 font-normal">(optional)</span></span>
                <Input
                  type="email"
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.email}
                  onChange={(e) => setBiodata((p) => ({ ...p, email: e.target.value }))}
                />
              </Label>
              <Label>
                <span className="text-sm font-semibold">Occupation</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.occupation}
                  onChange={(e) => setBiodata((p) => ({ ...p, occupation: e.target.value }))}
                >
                  <option value="">Select occupation</option>
                  {OCCUPATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </Select>
              </Label>
              <Label className="col-span-2">
                <span className="text-sm font-semibold">Address</span>
                <Input
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.address}
                  onChange={(e) => setBiodata((p) => ({ ...p, address: e.target.value }))}
                />
              </Label>
              <Label>
                <span className="text-sm font-semibold">State</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.stateOfResidence}
                  onChange={(e) => setBiodata((p) => ({ ...p, stateOfResidence: e.target.value, lgaOfResidence: "" }))}
                >
                  <option value="">Select state</option>
                  {nigerianStates.map((s) => (
                    <option key={s.code} value={s.name}>{s.name}</option>
                  ))}
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">LGA</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.lgaOfResidence}
                  disabled={!biodata.stateOfResidence}
                  onChange={(e) => setBiodata((p) => ({ ...p, lgaOfResidence: e.target.value }))}
                >
                  <option value="">Select LGA</option>
                  {biodata.stateOfResidence &&
                    lgasByState[getStateCode(biodata.stateOfResidence)]?.map((lga) => (
                      <option key={lga} value={lga}>{lga}</option>
                    ))}
                </Select>
              </Label>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Next of Kin</p>
              <div className="grid grid-cols-3 gap-4">
                <Label>
                  <span className="text-sm font-semibold">Name</span>
                  <Input
                    className="mt-2 rounded-2xl h-12"
                    value={biodata.nextOfKinName}
                    onChange={(e) => setBiodata((p) => ({ ...p, nextOfKinName: e.target.value }))}
                  />
                </Label>
                <Label>
                  <span className="text-sm font-semibold">Phone</span>
                  <Input
                    className="mt-2 rounded-2xl h-12"
                    value={biodata.nextOfKinPhone}
                    onChange={(e) => setBiodata((p) => ({ ...p, nextOfKinPhone: e.target.value }))}
                  />
                </Label>
                <Label>
                  <span className="text-sm font-semibold">Relationship</span>
                  <Select
                    className="mt-2 rounded-2xl h-12"
                    value={biodata.nextOfKinRelationship}
                    onChange={(e) => setBiodata((p) => ({ ...p, nextOfKinRelationship: e.target.value }))}
                  >
                    <option value="">Select relationship</option>
                    {NEXT_OF_KIN_RELATIONSHIP_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </Label>
              </div>
            </div>
          </div>
        )}

        {currentKey === "riskVerify" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">B. Verify Risk Assessment</h3>
            <p className="text-sm text-gray-500">
              Review the responses from Stage 1 (if any) and update as needed.
            </p>
            <GroupedForm
              groups={riskGroupsForVerify}
              values={risk}
              errors={{}}
              onChange={(name, value) => setRisk((p) => ({ ...p, [name]: value }))}
            />
          </div>
        )}

        {currentKey === "medicalHistory" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">C. Medical History</h3>
            <GroupedForm
              groups={[MEDICAL_HISTORY_GROUP]}
              values={risk}
              errors={{}}
              onChange={(name, value) => setRisk((p) => ({ ...p, [name]: value }))}
            />
          </div>
        )}

        {currentKey === "cancerTypeSelect" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Which cancer type(s) are being screened today?</h3>
            <div className="grid grid-cols-2 gap-3">
              {availableCancerTypes.map((ct) => {
                const selected = cancerTypes.includes(ct.value);
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() =>
                      setCancerTypes((prev) =>
                        prev.includes(ct.value) ? prev.filter((t) => t !== ct.value) : [...prev, ct.value]
                      )
                    }
                    className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-800"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentKey === "screening" && (
          <div className="space-y-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">D + F. Symptom Assessment & Screening Tests</h3>
            {cancerTypes.length === 0 && (
              <p className="text-sm text-amber-600">No cancer type selected — go back and select at least one.</p>
            )}
            {cancerTypes.map((ct) => (
              <div key={ct} className="border-t border-gray-100 dark:border-gray-700 pt-6 first:border-t-0 first:pt-0">
                <p className="text-sm font-bold text-green-700 uppercase tracking-wide mb-3">{cancerLabel(ct)}</p>
                <GroupedForm
                  groups={SCREENING_GROUPS[ct] || []}
                  values={screenings[ct] || {}}
                  errors={{}}
                  onChange={(name, value) =>
                    setScreenings((prev) => ({ ...prev, [ct]: { ...(prev[ct] || {}), [name]: value } }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {currentKey === "physicalExam" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">E. Physical Examination</h3>
            <GroupedForm
              groups={EXAM_GROUPS}
              values={examination}
              errors={{}}
              onChange={(name, value) => setExamination((p) => ({ ...p, [name]: value }))}
            />
          </div>
        )}

        {currentKey === "outcome" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">G. Screening Outcome</h3>
            <div className="grid grid-cols-1 gap-3">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome((p) => ({ ...p, overallOutcome: opt.value }))}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                    outcome.overallOutcome === opt.value ? opt.tone + " border-2" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-xs mt-0.5 opacity-80">{opt.description}</p>
                </button>
              ))}
            </div>
            {outcome.overallOutcome === "low_suspicion" && (
              <Label>
                <span className="text-sm font-semibold">Repeat screening date *</span>
                <Input
                  type="date"
                  className="mt-2 rounded-2xl h-12"
                  value={outcome.repeatScreeningDate}
                  onChange={(e) => setOutcome((p) => ({ ...p, repeatScreeningDate: e.target.value }))}
                />
              </Label>
            )}
            <Label>
              <span className="text-sm font-semibold">Notes</span>
              <textarea
                className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm"
                rows={3}
                value={outcome.outcomeNotes}
                onChange={(e) => setOutcome((p) => ({ ...p, outcomeNotes: e.target.value }))}
              />
            </Label>
          </div>
        )}

        {currentKey === "done" && (
          <div className="text-center py-10 space-y-3">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Stage 2 screening complete</h3>
            <p className="text-sm text-gray-500">
              {outcome.overallOutcome === "urgent_referral" || outcome.overallOutcome === "suspicious" ? (
                <span className="inline-flex items-center gap-1.5 text-red-600 font-semibold">
                  <AlertTriangle className="w-4 h-4" /> This client needs referral — please action promptly.
                </span>
              ) : (
                "All findings have been saved to the client's record."
              )}
            </p>
            <Button
              onClick={() => router.push(`/ncsr/client-record?clientId=${clientId}`)}
              className="mt-4 h-12 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
            >
              View Client Record
            </Button>
          </div>
        )}

        {/* Navigation */}
        {currentKey !== "lookup" && currentKey !== "done" && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {currentKey === "registration" && (
              <Button onClick={submitRegistration} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="inline-flex items-center gap-1">Save & Continue <ChevronRight className="w-4 h-4" /></span>}
              </Button>
            )}
            {currentKey === "riskVerify" && (
              <Button onClick={submitRiskAndHistory} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
              </Button>
            )}
            {currentKey === "medicalHistory" && (
              <Button onClick={submitRiskAndHistory} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
              </Button>
            )}
            {currentKey === "cancerTypeSelect" && (
              <Button onClick={next} disabled={cancerTypes.length === 0} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                Continue
              </Button>
            )}
            {currentKey === "screening" && (
              <Button onClick={submitScreenings} disabled={busy || cancerTypes.length === 0} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
              </Button>
            )}
            {currentKey === "physicalExam" && (
              <Button onClick={submitExamination} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
              </Button>
            )}
            {currentKey === "outcome" && (
              <Button onClick={submitOutcome} disabled={busy} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finish"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
