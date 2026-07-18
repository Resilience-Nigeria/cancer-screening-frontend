"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select, Textarea, Label } from "@roketid/windmill-react-ui";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserPlus,
  ClipboardCheck,
  Stethoscope,
  Activity,
  FileText,
  ShieldCheck,
  Building2,
  Search,
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
  PRE_COUNSELLING_FIELDS,
  getRiskGroups,
  RISK_FOCUS,
  SCREENING_GROUPS,
  OUTCOME_GROUPS,
  WizardField,
  FieldGroup,
} from "../../lib/screeningWizardConfig";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
const ENDPOINTS = {
  createClient: () => `/clients`,
  updateClient: (clientId: string) => `/clients/${clientId}`,
  createVisit: (clientId: string) => `/clients/${clientId}/visits`,
  screening: (visitId: number, type: CancerType) => `/visits/${visitId}/${type}-screening`,
  riskProfile: (clientId: string) => `/clients/${clientId}/risk-profile`,
  outcome: (clientId: string) => `/clients/${clientId}/outcome`,
  facilities: () => `/facilities`,
  findClient: () => `/clients/search/details`,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Step = { key: string; label: string; icon: any };

type Facility = {
  facilityId: number | string;
  facilityName: string;
  facilityState?: string;
  facilityLga?: string;
  facilityAddress?: string;
  navigatorName?: string;
  navigatorPhone?: string;
  isTreatmentCenter?: boolean;
};

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
const BASE_STEPS: Step[] = [
  { key: "precounsel",   label: "Pre-Counselling", icon: ClipboardCheck },
  { key: "clientlookup", label: "Client Search",   icon: Search         },
  { key: "biodata",      label: "Biodata",         icon: UserPlus       },
  { key: "cancer",       label: "Cancer Types",    icon: Activity       },
  { key: "risk",         label: "Risk Profile",    icon: ShieldCheck    },
  { key: "screening",    label: "Screening",       icon: Stethoscope    },
  { key: "outcome",      label: "Outcome",         icon: FileText       },
];

const REFERRAL_STEP: Step = { key: "referral", label: "Referral", icon: Building2 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const today = () => new Date().toISOString().split("T")[0];
const dateOnly = (v?: string | null) => (v ? String(v).split("T")[0] : "");

const DEFAULT_METHOD: Partial<Record<CancerType, string>> = {
  cervical:   "via",
  breast:     "cbe",
  colorectal: "fit",
  liver:      "uss",
};

function defaultScreeningFor(ct: CancerType): Record<string, any> {
  const base: Record<string, any> = {
    screeningDate:   today(),
    screeningResult: "negative",
  };
  if (ct === "breast") {
    base.methodCbe = true;
  } else if (DEFAULT_METHOD[ct]) {
    base.method = DEFAULT_METHOD[ct];
  }
  return base;
}

const SCREENING_INT_FIELDS = [
  "ageAtFirstIntercourse",
  "numberOfChildbirths",
  "breastfeedingDuration",
  "ageAtFirstMenstruation",
  "ageAtMenopause",
  "ipssScore",
  "biopsyBookingFacilityId",
];
const SCREENING_FLOAT_FIELDS = ["psaLevel", "afpValue"];

function withoutReferral(groups: FieldGroup[]): FieldGroup[] {
  return groups
    .map((g) => ({
      ...g,
      fields: g.fields.filter((f) => f.name !== "treatmentReferral"),
    }))
    .filter((g) => g.fields.length > 0);
}

function buildScreeningPayload(
  data: Record<string, any>,
  referralValue?: string
): Record<string, any> {
  const p: Record<string, any> = { ...data };

  // Derive primary method from breast checkboxes
  if (p.methodMammography) p.method = "mammography";
  else if (p.methodUltrasound) p.method = "uss";
  else if (p.methodCbe !== undefined) p.method = "cbe";

  delete p.methodCbe;
  delete p.methodMammography;
  delete p.methodUltrasound;

  if (referralValue) p.treatmentReferral = referralValue;

  // result alias
  if (p.screeningResult !== undefined && p.result === undefined) p.result = p.screeningResult;
  if (p.result !== undefined && p.screeningResult === undefined) p.screeningResult = p.result;

  // Only send treatment referral for suspicious results
  if (p.screeningResult !== "suspicious") p.treatmentReferral = null;

  SCREENING_INT_FIELDS.forEach((k) => {
    if (k in p) p[k] = p[k] === "" || p[k] == null ? null : parseInt(p[k]);
  });
  SCREENING_FLOAT_FIELDS.forEach((k) => {
    if (k in p) p[k] = p[k] === "" || p[k] == null ? null : parseFloat(p[k]);
  });

  return p;
}

// ---------------------------------------------------------------------------
// FieldRenderer
// ---------------------------------------------------------------------------
function FieldRenderer({
  field,
  value,
  values,
  hasError,
  onChange,
}: {
  field: WizardField;
  value: any;
  values: Record<string, any>;
  hasError?: boolean;
  onChange: (name: string, value: any) => void;
}) {
  if (field.showIf && !field.showIf(values)) return null;

  const span      = field.colSpan === 2 ? "sm:col-span-2" : "";
  const errorRing = hasError ? "ring-2 ring-red-400 border-red-400 focus:ring-red-400" : "";

  if (field.type === "checkbox") {
    return (
      <label className={`flex items-center gap-2 ${span}`}>
        <Input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(field.name, e.target.checked)}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label}
        </span>
      </label>
    );
  }

  return (
    <Label className={span}>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </span>

      {field.type === "select" ? (
        <Select
          className={`mt-2 rounded-2xl h-12 shadow-sm ${errorRing}`}
          value={value ?? ""}
          onChange={(e) => onChange(field.name, e.target.value)}
        >
          {!field.options?.some((o) => o.value === "") && <option value="">Select</option>}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea
          className={`mt-2 rounded-2xl shadow-sm ${errorRing}`}
          rows={4}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      ) : (
        <Input
          className={`mt-2 rounded-2xl h-12 shadow-sm ${errorRing} ${
            field.readOnly ? "bg-gray-50 dark:bg-gray-700 cursor-not-allowed" : ""
          }`}
          type={field.type}
          value={value ?? ""}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          readOnly={field.readOnly}
          disabled={field.readOnly}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      )}

      {hasError ? (
        <span className="mt-1 block text-xs text-red-500">This field is required.</span>
      ) : field.help ? (
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{field.help}</span>
      ) : null}
    </Label>
  );
}

// ---------------------------------------------------------------------------
// GroupedForm
// ---------------------------------------------------------------------------
function GroupedForm({
  groups,
  values,
  errors,
  onChange,
}: {
  groups: FieldGroup[];
  values: Record<string, any>;
  errors: Record<string, boolean>;
  onChange: (name: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {groups.map((group, gi) => {
        const anyVisible = group.fields.some((f) => !f.showIf || f.showIf(values));
        if (!anyVisible) return null;
        return (
          <div key={gi}>
            {group.title && (
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {group.title}
              </h4>
            )}
            {group.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{group.description}</p>
            )}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {group.fields.map((f) => (
                <FieldRenderer
                  key={f.name}
                  field={f}
                  value={values[f.name]}
                  values={values}
                  hasError={!!errors[f.name]}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// collectMissing
// ---------------------------------------------------------------------------
function collectMissing(
  groups: FieldGroup[],
  values: Record<string, any>
): { name: string; label: string }[] {
  const missing: { name: string; label: string }[] = [];
  groups.forEach((g) =>
    g.fields.forEach((f) => {
      if (f.showIf && !f.showIf(values)) return;
      const empty =
        values[f.name] === undefined ||
        values[f.name] === ""       ||
        values[f.name] === null;
      if (f.required && empty) missing.push({ name: f.name, label: f.label });
    })
  );
  return missing;
}

// ---------------------------------------------------------------------------
// Wizard Component
// ---------------------------------------------------------------------------
export default function ScreeningWizard() {
const initialBiodata = () => ({
  fullName:          "",
  nin:               "",
  gender:            "",
  dateOfBirth:       "",
  phoneNumber:       "",
  screeningCategory: "",
  stateOfOrigin:     "",
  lgaOfOrigin:       "",
  stateOfResidence:  "",
  lgaOfResidence:    "",
  address:           "",
  landmark:          "",
  registrationDate:  today(),
});

const initialPreCounsel = () => ({
  preScreeningCounselingDate: today(),
  preScreeningCounselor:      "",
  preScreeningConsent:        "",
});

const initialReferral = () => ({
  facilityId:   "",
  facilityName: "",
  referralDate: today(),
  notes:        "",
});

  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [clientId, setClientId] = useState<string>("");
  const [visitId,  setVisitId]  = useState<number | null>(null);

  const [cancerTypes, setCancerTypes] = useState<CancerType[]>([]);

  const [biodata, setBiodata] = useState<Record<string, any>>(initialBiodata());

  const [preCounsel, setPreCounsel] = useState<Record<string, any>>(initialPreCounsel());

  const [risk,      setRisk]      = useState<Record<string, any>>({});
  const [screenings, setScreenings] = useState<Record<string, Record<string, any>>>({});

  const [referral, setReferral] = useState<Record<string, any>>(initialReferral());
  const [outcome, setOutcome] = useState<Record<string, any>>({});

  const [treatmentReferral, setTreatmentReferral] = useState<string>("not_referred");

  const [biodataErrors,   setBiodataErrors]   = useState<Record<string, boolean>>({});
  const [riskErrors,      setRiskErrors]      = useState<Record<string, boolean>>({});
  const [screeningErrors, setScreeningErrors] = useState<Record<string, Record<string, boolean>>>({});

  const [facilities,     setFacilities]     = useState<Facility[]>([]);
  const [facilitySearch, setFacilitySearch] = useState("");

  // Referral state
  const [referralFacilities,  setReferralFacilities]  = useState<Facility[]>([]);
  const [referralType,        setReferralType]         = useState<
    "screening_to_confirmation" | "confirmation_to_treatment"
  >("screening_to_confirmation");
  const [referralNotes,       setReferralNotes]        = useState("");
  const [referralSubmitting,  setReferralSubmitting]   = useState(false);

  // Client lookup state
  const [lookupValue,     setLookupValue]     = useState("");
  const [lookupLoading,   setLookupLoading]   = useState(false);
  const [clientFound,     setClientFound]     = useState(false);
  const [lookupAttempted, setLookupAttempted] = useState(false);
  const isExistingClient = !!clientId;

  // ---------------------------------------------------------------------------
  // Derived values — declared BEFORE any useEffect that references them
  // ---------------------------------------------------------------------------
  const positiveTypes = Array.isArray(cancerTypes)
    ? cancerTypes.filter((ct) => screenings[ct]?.screeningResult === "positive")
    : [];

  const anyPositive   = positiveTypes.length > 0;
  const anySuspicious = Array.isArray(cancerTypes) &&
    cancerTypes.some((ct) => screenings[ct]?.screeningResult === "suspicious");

  const overallResult = anyPositive
    ? "positive"
    : anySuspicious
    ? "suspicious"
    : "negative";

  const outcomeCancerType = (positiveTypes[0] || cancerTypes[0] || "") as CancerType | "";

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load referral facilities when positive result exists
  useEffect(() => {
    if (!anyPositive) return;
    (async () => {
      try {
        const { data } = await api.get("/facilities", {
          params: { types: "main_hub,treatment_center" },
        });
        setReferralFacilities(data?.facilities ?? data?.data ?? []);
      } catch {}
    })();
  }, [anyPositive]);

  // Load existing client from query param — guard with router.isReady.
  // Also handles the "fresh session" case: whenever this param changes
  // (including becoming empty, e.g. navigating here for a NEW client
  // right after finishing a previous client's screening), every piece
  // of client-scoped state is reset first so nothing leaks between
  // clients within the same mounted wizard instance.
  useEffect(() => {
    if (!router.isReady) return;
    const qId = router.query.clientId as string | undefined;

    // Always start from a clean slate before (re)hydrating.
    setClientId("");
    setVisitId(null);
    setCancerTypes([]);
    setBiodata(initialBiodata());
    setPreCounsel(initialPreCounsel());
    setRisk({});
    setScreenings({});
    setReferral(initialReferral());
    setOutcome({});
    setTreatmentReferral("not_referred");
    setBiodataErrors({});
    setRiskErrors({});
    setScreeningErrors({});
    setLookupValue("");
    setClientFound(false);
    setLookupAttempted(false);
    setStepIndex(0);

    if (!qId) return;

    (async () => {
      setBusy(true);
      try {
        const { data } = await api.get(`/clients/${qId}`);
        const c = data?.client || data?.data;
        setClientId(c.clientId ?? c.id);
        setBiodata((prev) => ({
          ...prev,
          fullName:          c.fullName          ?? c.full_name          ?? "",
          nin:               c.nin               ?? "",
          gender:            c.gender            ?? "",
          dateOfBirth:       dateOnly(c.dateOfBirth ?? c.date_of_birth),
          phoneNumber:       c.phoneNumber       ?? c.phone_number       ?? "",
          screeningCategory: c.screeningCategory ?? c.screening_category ?? "",
          stateOfOrigin:     c.stateOfOrigin     ?? c.state_of_origin    ?? "",
          lgaOfOrigin:       c.lgaOfOrigin       ?? c.lga_of_origin      ?? "",
          stateOfResidence:  c.stateOfResidence  ?? c.state_of_residence ?? "",
          lgaOfResidence:    c.lgaOfResidence    ?? c.lga_of_residence   ?? "",
          address:           c.address           ?? "",
          landmark:          c.landmark          ?? "",
          registrationDate:  dateOnly(c.registrationDate ?? c.registration_date) || today(),
        }));
        const rp =
          (c.risk_profiles && c.risk_profiles[0]) ||
          (c.riskProfiles  && c.riskProfiles[0])  ||
          null;
        if (rp) {
          setRisk({
            familyHistory:      rp.familyHistory      ?? "",
            smokingStatus:      rp.smokingStatus      ?? "",
            cigarettesPerDay:   rp.cigarettesPerDay   ?? "",
            smokingDuration:    rp.smokingDuration     ?? "",
            alcoholFrequency:   rp.alcoholFrequency   ?? rp.alcoholConsumption ?? "",
            alcoholUnitsPerWeek:rp.alcoholUnitsPerWeek ?? "",
            weightKg:           rp.weightKg           ?? "",
            heightCm:           rp.heightCm           ?? "",
            weightInput:        rp.weightKg           ?? "",
            weightUnit:         "kg",
            heightInput:        rp.heightCm           ?? "",
            heightUnit:         "cm",
            bmi:                rp.bmi                ?? "",
            hivStatus:          rp.hivStatus          ?? "",
            hbvStatus:          rp.hbvStatus          ?? "",
            hcvStatus:          rp.hcvStatus          ?? "",
            comorbidities: Array.isArray(rp.comorbiditiesJson)
              ? rp.comorbiditiesJson.join(", ")
              : "",
            ageAtFirstMenstruation: rp.ageAtFirstMenstruation ?? "",
            ageAtMenopause:         rp.ageAtMenopause         ?? "",
            breastfeedingHistory:   rp.breastfeedingHistory   ?? "",
            breastfeedingDuration:  rp.breastfeedingDuration  ?? "",
            previousBreastSurgery:  rp.previousBreastSurgery  ?? "",
          });
        }
        setStepIndex(1);
      } catch {
        toast.error("Could not load that client; starting a new record.");
      } finally {
        setBusy(false);
      }
    })();
  }, [router.isReady, router.query.clientId]);

  // Load all facilities for the biopsy booking and referral dropdowns
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(ENDPOINTS.facilities());
        const list: Facility[] = data?.facilities || data?.data || [];
        setFacilities(list.filter((f) => f.isTreatmentCenter !== false));
      } catch {}
    })();
  }, []);

  // Dual-unit (metric/imperial) input support — the user enters weight/height
  // in whichever unit they prefer; we convert to the canonical weightKg /
  // heightCm fields that the BMI calc and backend already expect.
  useEffect(() => {
    const raw = parseFloat(risk.weightInput);
    const kg = raw > 0
      ? (risk.weightUnit === "lb" ? raw * 0.45359237 : raw)
      : null;
    const kgStr = kg !== null ? kg.toFixed(1) : "";
    setRisk((prev) => (prev.weightKg === kgStr ? prev : { ...prev, weightKg: kgStr }));
  }, [risk.weightInput, risk.weightUnit]);

  useEffect(() => {
    const raw = parseFloat(risk.heightInput);
    const cm = raw > 0
      ? (risk.heightUnit === "ft" ? raw * 30.48 : raw)
      : null;
    const cmStr = cm !== null ? cm.toFixed(1) : "";
    setRisk((prev) => (prev.heightCm === cmStr ? prev : { ...prev, heightCm: cmStr }));
  }, [risk.heightInput, risk.heightUnit]);

  // Auto-calculate BMI
  useEffect(() => {
    const w   = parseFloat(risk.weightKg);
    const hM  = parseFloat(risk.heightCm) / 100;
    const bmi = w > 0 && hM > 0 ? (w / (hM * hM)).toFixed(1) : "";
    setRisk((prev) => (prev.bmi === bmi ? prev : { ...prev, bmi }));
  }, [risk.weightKg, risk.heightCm]);

  // ---------------------------------------------------------------------------
  // Memos — all guarded against empty arrays
  // ---------------------------------------------------------------------------
  const steps = useMemo(() => {
    if (!Array.isArray(cancerTypes)) return BASE_STEPS;
    const positive = cancerTypes.some(
      (ct) => screenings[ct]?.screeningResult === "positive"
    );
    if (positive) {
      const idx  = BASE_STEPS.findIndex((s) => s.key === "outcome");
      const copy = [...BASE_STEPS];
      copy.splice(idx, 0, REFERRAL_STEP);
      return copy;
    }
    return BASE_STEPS;
  }, [cancerTypes, screenings]);

  const availableCancers = useMemo(
    () => cancerTypesForGender(biodata.gender ?? ""),
    [biodata.gender]
  );

  const riskGroups = useMemo(() => {
    if (!Array.isArray(cancerTypes) || !cancerTypes.length) return [];
    return getRiskGroups(
      cancerTypes.includes("liver")
        ? "liver"
        : (cancerTypes[0] as CancerType)
    );
  }, [cancerTypes]);

  // ---------------------------------------------------------------------------
  // Field setters
  // ---------------------------------------------------------------------------
  function setBiodataField(name: string, value: any) {
    setBiodata((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "stateOfOrigin")    next.lgaOfOrigin    = "";
      if (name === "stateOfResidence") next.lgaOfResidence = "";
      return next;
    });
    setBiodataErrors((prev) => (prev[name] ? { ...prev, [name]: false } : prev));
  }

  function setRiskField(name: string, value: any) {
    setRisk((prev) => ({ ...prev, [name]: value }));
    setRiskErrors((prev) => (prev[name] ? { ...prev, [name]: false } : prev));
  }

  function toggleCancer(ct: CancerType) {
    setCancerTypes((prev) =>
      prev.includes(ct) ? prev.filter((x) => x !== ct) : [...prev, ct]
    );
    setScreenings((prev) =>
      prev[ct] ? prev : { ...prev, [ct]: defaultScreeningFor(ct) }
    );
  }

  function setScreeningField(ct: CancerType, name: string, value: any) {
    setScreenings((prev) => ({
      ...prev,
      [ct]: { ...(prev[ct] || {}), [name]: value },
    }));
    setScreeningErrors((prev) => {
      const ctErr = prev[ct];
      if (ctErr && ctErr[name]) return { ...prev, [ct]: { ...ctErr, [name]: false } };
      return prev;
    });
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  async function persistBiodata(): Promise<boolean> {
    const required = [
      "fullName", "gender", "dateOfBirth", "phoneNumber", "screeningCategory",
      "stateOfOrigin", "lgaOfOrigin", "stateOfResidence", "lgaOfResidence", "registrationDate",
    ];
    const missing = required.filter((k) => !biodata[k]);
    if (missing.length) {
      setBiodataErrors(Object.fromEntries(missing.map((k) => [k, true])));
      toast.error("Please complete all required biodata fields.");
      return false;
    }
    setBiodataErrors({});
    setBusy(true);
    try {
      if (clientId) {
        await api.patch(ENDPOINTS.updateClient(clientId), biodata);
      } else {
        const { data } = await api.post(ENDPOINTS.createClient(), biodata);
        const created  = data?.client || data?.data;
        setClientId(created.clientId ?? created.id);
      }
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save client.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function persistRisk(): Promise<boolean> {
    if (!cancerTypes.length) return false;
    const missing = collectMissing(riskGroups, risk);
    if (missing.length) {
      setRiskErrors(Object.fromEntries(missing.map((m) => [m.name, true])));
      toast.error(`Required: ${missing.map((m) => m.label).join(", ")}`);
      return false;
    }
    setRiskErrors({});
    setBusy(true);
    try {
      const payload: Record<string, any> = { ...risk };
      ["cigarettesPerDay", "smokingDuration", "alcoholUnitsPerWeek",
       "ageAtFirstMenstruation", "ageAtMenopause", "breastfeedingDuration"].forEach(
        (k) => (payload[k] = payload[k] ? parseInt(payload[k]) : null)
      );
      ["weightKg", "heightCm", "bmi"].forEach(
        (k) => (payload[k] = payload[k] ? parseFloat(payload[k]) : null)
      );
      payload.comorbiditiesJson = risk.comorbidities
        ? String(risk.comorbidities).split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      delete payload.comorbidities;
      delete payload.weightInput;
      delete payload.weightUnit;
      delete payload.heightInput;
      delete payload.heightUnit;
      await api.post(ENDPOINTS.riskProfile(clientId), payload);
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save risk profile.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function ensureVisit(): Promise<number | null> {
    if (visitId) return visitId;
    try {
      const { data } = await api.post(ENDPOINTS.createVisit(clientId), {
        visitType:        biodata.screeningCategory === "follow_up" ? "follow_up" : "initial",
        visitDate:        today(),
        notes:            `${cancerTypes.map((c) => cancerLabel(c)).join(", ")} screening`,
        treatmentReferral: treatmentReferral || "not_referred",
      });
      const v  = data?.visit || data?.data || data;
      let   id = v?.visitId ?? v?.id ?? data?.visitId ?? data?.id ?? null;
      if (!id) {
        try {
          const { data: cdata } = await api.get(`/clients/${clientId}`);
          const c      = cdata?.client || cdata?.data || cdata;
          const visits = c?.visits || [];
          const last   = visits[visits.length - 1];
          id = last?.visitId ?? last?.id ?? null;
        } catch {}
      }
      if (!id) {
        toast.error("Visit was created but its ID wasn't returned. Please try again.");
        return null;
      }
      setVisitId(id);
      return id;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not create visit.");
      return null;
    }
  }

  async function persistScreening(): Promise<boolean> {
    if (!cancerTypes.length) return false;
    const newErrors: Record<string, Record<string, boolean>> = {};
    let firstMsg = "";
    cancerTypes.forEach((ct) => {
      const missing = collectMissing(SCREENING_GROUPS[ct], screenings[ct] || {});
      if (missing.length) {
        newErrors[ct] = Object.fromEntries(missing.map((m) => [m.name, true]));
        if (!firstMsg) firstMsg = `${cancerLabel(ct)} — ${missing.map((m) => m.label).join(", ")}`;
      }
    });
    if (Object.keys(newErrors).length) {
      setScreeningErrors(newErrors);
      toast.error(`Required: ${firstMsg}`);
      return false;
    }
    setScreeningErrors({});
    setBusy(true);
    try {
      const id = await ensureVisit();
      if (!id) return false;
      for (const ct of cancerTypes) {
        try {
          await api.post(
            ENDPOINTS.screening(id, ct),
            buildScreeningPayload(screenings[ct] || {}, treatmentReferral || "not_referred")
          );
        } catch (err: any) {
          toast.error(
            `${cancerLabel(ct)} screening could not be saved: ${
              err?.response?.data?.message || "please check the fields."
            }`
          );
          return false;
        }
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function persistOutcome(): Promise<boolean> {
    setBusy(true);
    try {
      const screeningDate   = (outcomeCancerType && screenings[outcomeCancerType]?.screeningDate) || today();
      const referredFacility = referral.facilityName || outcome.treatmentFacility;
      const payload: Record<string, any> = {
        ...preCounsel,
        ...outcome,
        screeningResult:    overallResult,
        screeningDate,
        cancerType:         outcomeCancerType,
        treatmentFacility:  referredFacility,
        cancerConfirmed:    overallResult === "positive" ? "yes" : "no",
        linkageToTreatment: referral.facilityName || outcome.treatmentCommenced === "yes" ? "yes" : "no",
      };
      await api.put(ENDPOINTS.outcome(clientId), payload);
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save outcome.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Client lookup
  // ---------------------------------------------------------------------------
  async function searchClient() {
    if (!lookupValue.trim()) { toast.error("Enter a phone number or client ID"); return; }
    setLookupLoading(true);
    setLookupAttempted(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.findClient()}?search=${lookupValue}`);
      const client   = data?.client || data?.data;
      if (!client) {
        setClientFound(false);
        toast.success("Client not found. Please complete biodata registration.");
        return;
      }
      setClientFound(true);
      setClientId(client.clientId ?? client.id);
      setBiodata((prev) => ({
        ...prev,
        fullName:         client.fullName        ?? "",
        nin:              client.nin             ?? "",
        gender:           client.gender          ?? "",
        dateOfBirth:      dateOnly(client.dateOfBirth),
        phoneNumber:      client.phoneNumber     ?? "",
        screeningCategory:"follow_up",
        stateOfOrigin:    client.stateOfOrigin   ?? "",
        lgaOfOrigin:      client.lgaOfOrigin     ?? "",
        stateOfResidence: client.stateOfResidence ?? "",
        lgaOfResidence:   client.lgaOfResidence   ?? "",
        address:          client.address          ?? "",
        landmark:         client.landmark         ?? "",
        registrationDate: dateOnly(client.registrationDate) || today(),
      }));
      toast.success("Client record found");
    } catch {
      setClientFound(false);
      toast.success("Client not found. Continue with biodata registration.");
    } finally {
      setLookupLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  async function handleNext() {
    const key = steps[stepIndex].key;

    if (key === "biodata") {
      if (!clientId) { if (!(await persistBiodata())) return; }
    }

    if (key === "precounsel") {
      if (preCounsel.preScreeningConsent === "no") {
        toast.error("Screening cannot proceed without the client's consent.");
        return;
      }
      if (preCounsel.preScreeningConsent !== "yes") {
        toast.error("Please record whether consent was obtained.");
        return;
      }
    }

    if (key === "cancer" && cancerTypes.length === 0) {
      toast.error("Select at least one cancer type to screen for.");
      return;
    }

    if (key === "risk"      && !(await persistRisk()))      return;
    if (key === "screening" && !(await persistScreening())) return;

    if (key === "referral") {
      if (!referral.facilityId) {
        toast.error("Select a facility to refer this client to.");
        return;
      }
      setReferralSubmitting(true);
      try {
        await api.post(`/clients/${clientId}/referrals`, {
          toFacilityId: referral.facilityId,
          referralType,
          notes:        referralNotes || null,
        });
        toast.success("Client referred successfully. Notifications sent.");
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Referral failed.");
        setReferralSubmitting(false);
        return;
      }
      setReferralSubmitting(false);
    }

    if (key === "outcome") {
      if (!(await persistOutcome())) return;
      toast.success("Screening encounter completed.");
      router.push(`/ncsr/client-details?clientId=${clientId}`);
      return;
    }

    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const currentKey      = steps[stepIndex].key;
  const isLast          = stepIndex === steps.length - 1;
  const consentDenied   = preCounsel.preScreeningConsent === "no";
  const filteredFacilities = facilities.filter((f) =>
    f.facilityName.toLowerCase().includes(facilitySearch.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Layout>
      {/* ── Hero banner ── */}
      <div className="mb-6">
        <PageTitle>New Screening Encounter</PageTitle>
        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-4 py-5 sm:px-8 sm:py-7 text-white">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
              National Cancer Screening Register
            </div>
            <h2 className="mt-3 text-lg sm:text-2xl font-bold leading-tight">
              Guided screening — one client, one fluid flow
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-green-100">
              Screen for one or several cancers in a single encounter. Each step saves before moving on.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        {/* Mobile progress bar */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {steps[stepIndex].label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {stepIndex + 1} of {steps.length}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop step pills */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto">
          {steps.map((s, i) => {
            const Icon   = s.icon;
            const done   = i < stepIndex;
            const active = i === stepIndex;
            return (
              <React.Fragment key={s.key}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold ${
                    active ? "bg-green-700 text-white"
                    : done  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    :         "bg-gray-100 text-gray-400 dark:bg-gray-700"
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm whitespace-nowrap ${
                    active ? "font-semibold text-gray-900 dark:text-white"
                    :        "text-gray-500 dark:text-gray-400"
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="h-px w-6 bg-gray-200 dark:bg-gray-700 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Step body ── */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">

        {/* PRE-COUNSELLING */}
        {currentKey === "precounsel" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Pre-Screening Counselling
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Counselling and consent are recorded before any test is performed.
            </p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {PRE_COUNSELLING_FIELDS.map((f) => (
                <FieldRenderer
                  key={f.name}
                  field={f}
                  value={preCounsel[f.name]}
                  values={preCounsel}
                  onChange={(n, val) => setPreCounsel((prev) => ({ ...prev, [n]: val }))}
                />
              ))}
            </div>
            {consentDenied && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  Consent was not obtained. Screening cannot proceed until the client consents.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CLIENT LOOKUP */}
        {currentKey === "clientlookup" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Search Existing Client
            </h3>
            <p className="text-sm text-gray-500">
              Enter a Client ID or Phone Number. Existing client information will be loaded automatically.
            </p>
            <div className="flex gap-3">
              <Input
                className="h-12 rounded-2xl"
                placeholder="Client ID or Phone Number"
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") searchClient(); }}
              />
              <Button onClick={searchClient} disabled={lookupLoading}>
                {lookupLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />
                }
              </Button>
            </div>
            {lookupAttempted && clientFound && (
              <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4">
                <p className="font-semibold text-green-700 dark:text-green-300">Existing client found</p>
                <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{biodata.fullName}</p>
                <p className="text-sm text-gray-500">{biodata.phoneNumber}</p>
              </div>
            )}
            {lookupAttempted && !clientFound && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4">
                <p className="font-semibold text-amber-700 dark:text-amber-300">No matching client found</p>
                <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                  Click Continue to register a new client.
                </p>
              </div>
            )}
          </div>
        )}

        {/* BIODATA */}
        {currentKey === "biodata" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Client Biodata</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Label className="sm:col-span-2">
                <span className="text-sm font-semibold">Full Name *</span>
                <Input
                  className={`mt-2 rounded-2xl h-12 ${biodataErrors.fullName ? "ring-2 ring-red-400 border-red-400" : ""}`}
                  value={biodata.fullName}
                  onChange={(e) => setBiodataField("fullName", e.target.value)}
                  placeholder="Enter full name"
                  disabled={isExistingClient}
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">NIN (optional)</span>
                <Input
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.nin}
                  onChange={(e) => setBiodataField("nin", e.target.value)}
                  placeholder="National Identification Number"
                  inputMode="numeric"
                  maxLength={11}
                  type="number"
                  disabled={isExistingClient}
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Gender *</span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${biodataErrors.gender ? "ring-2 ring-red-400 border-red-400" : ""}`}
                  value={biodata.gender}
                  onChange={(e) => setBiodataField("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Date of Birth *</span>
                <Input
                  type="date"
                  className={`mt-2 rounded-2xl h-12 ${biodataErrors.dateOfBirth ? "ring-2 ring-red-400 border-red-400" : ""}`}
                  max={today()}
                  value={biodata.dateOfBirth}
                  onChange={(e) => setBiodataField("dateOfBirth", e.target.value)}
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Phone Number *</span>
                <Input
                  type="tel"
                  className={`mt-2 rounded-2xl h-12 ${biodataErrors.phoneNumber ? "ring-2 ring-red-400 border-red-400" : ""}`}
                  value={biodata.phoneNumber}
                  onChange={(e) => setBiodataField("phoneNumber", e.target.value)}
                  placeholder="Enter phone number"
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Screening Category *</span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${biodataErrors.screeningCategory ? "ring-2 ring-red-400 border-red-400" : ""}`}
                  value={biodata.screeningCategory}
                  onChange={(e) => setBiodataField("screeningCategory", e.target.value)}
                >
                  <option value="">Select category</option>
                  <option value="new_client">New Client</option>
                  <option value="follow_up">Follow Up</option>
                </Select>
              </Label>

              {/* State + LGA of Origin */}
              <div className="sm:col-span-2 grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">State of Origin *</span>
                  <Select
                    className={`mt-2 rounded-2xl h-12 ${biodataErrors.stateOfOrigin ? "ring-2 ring-red-400 border-red-400" : ""}`}
                    value={biodata.stateOfOrigin}
                    onChange={(e) => setBiodataField("stateOfOrigin", e.target.value)}
                  >
                    <option value="">Select State</option>
                    {nigerianStates.map((s) => (
                      <option key={s.code} value={s.name}>{s.name}</option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  <span className="text-sm font-semibold">LGA of Origin *</span>
                  <Select
                    className={`mt-2 rounded-2xl h-12 ${biodataErrors.lgaOfOrigin ? "ring-2 ring-red-400 border-red-400" : ""}`}
                    value={biodata.lgaOfOrigin}
                    disabled={!biodata.stateOfOrigin}
                    onChange={(e) => setBiodataField("lgaOfOrigin", e.target.value)}
                  >
                    <option value="">Select LGA</option>
                    {biodata.stateOfOrigin
                      ? lgasByState[getStateCode(biodata.stateOfOrigin)]?.map((lga) => (
                          <option key={lga} value={lga}>{lga}</option>
                        ))
                      : biodata.lgaOfOrigin && (
                          <option value={biodata.lgaOfOrigin}>{biodata.lgaOfOrigin}</option>
                        )}
                  </Select>
                </Label>
              </div>

              {/* State + LGA of Residence */}
              <div className="sm:col-span-2 grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">State of Residence *</span>
                  <Select
                    className={`mt-2 rounded-2xl h-12 ${biodataErrors.stateOfResidence ? "ring-2 ring-red-400 border-red-400" : ""}`}
                    value={biodata.stateOfResidence}
                    onChange={(e) => setBiodataField("stateOfResidence", e.target.value)}
                  >
                    <option value="">Select State</option>
                    {nigerianStates.map((s) => (
                      <option key={s.code} value={s.name}>{s.name}</option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  <span className="text-sm font-semibold">LGA of Residence *</span>
                  <Select
                    className={`mt-2 rounded-2xl h-12 ${biodataErrors.lgaOfResidence ? "ring-2 ring-red-400 border-red-400" : ""}`}
                    value={biodata.lgaOfResidence}
                    disabled={!biodata.stateOfResidence}
                    onChange={(e) => setBiodataField("lgaOfResidence", e.target.value)}
                  >
                    <option value="">Select LGA</option>
                    {biodata.stateOfResidence
                      ? lgasByState[getStateCode(biodata.stateOfResidence)]?.map((lga) => (
                          <option key={lga} value={lga}>{lga}</option>
                        ))
                      : biodata.lgaOfResidence && (
                          <option value={biodata.lgaOfResidence}>{biodata.lgaOfResidence}</option>
                        )}
                  </Select>
                </Label>
              </div>

              <Label className="sm:col-span-2">
                <span className="text-sm font-semibold">Residential Address</span>
                <Textarea
                  className="mt-2 rounded-2xl"
                  rows={2}
                  value={biodata.address}
                  onChange={(e) => setBiodataField("address", e.target.value)}
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Landmark</span>
                <Input
                  className="mt-2 rounded-2xl h-12"
                  value={biodata.landmark}
                  onChange={(e) => setBiodataField("landmark", e.target.value)}
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Registration Date *</span>
                <Input
                  type="date"
                  className={`mt-2 rounded-2xl h-12 ${biodataErrors.registrationDate ? "ring-2 ring-red-400 border-red-400" : ""}`}
                  value={biodata.registrationDate}
                  onChange={(e) => setBiodataField("registrationDate", e.target.value)}
                />
              </Label>
            </div>
          </div>
        )}

        {/* CANCER TYPE SELECTION */}
        {currentKey === "cancer" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Select Cancer Type(s) to Screen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose one or more — options are filtered by the client&apos;s gender.
              Each selected module gets its own screening form.
            </p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {availableCancers.map((c) => {
                const selected = cancerTypes.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCancer(c.value)}
                    className={`text-left rounded-2xl border p-4 transition-all ${
                      selected
                        ? "border-green-600 ring-2 ring-green-200 dark:ring-green-900 bg-green-50/50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 dark:text-white">{c.label}</span>
                      <span className={`flex items-center justify-center w-5 h-5 rounded-md border ${
                        selected
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-300 dark:border-gray-600"
                      }`}>
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{c.blurb}</p>
                  </button>
                );
              })}
            </div>
            {cancerTypes.length > 0 && (
              <p className="text-sm text-green-700 dark:text-green-300">
                Selected: {cancerTypes.map((c) => cancerLabel(c)).join(", ")}
              </p>
            )}
          </div>
        )}

        {/* RISK PROFILE */}
        {currentKey === "risk" && cancerTypes.length > 0 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Risk Profile</h3>
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
              {cancerTypes.length === 1
                ? RISK_FOCUS[cancerTypes[0]]
                : "Risk factors relevant to all selected screenings are collected once below."}
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Weight</span>
                <div className="mt-2 flex gap-2">
                  <Input
                    className="rounded-2xl h-12 shadow-sm flex-1 min-w-0"
                    type="number"
                    step="0.1"
                    min={0}
                    value={risk.weightInput ?? ""}
                    placeholder={risk.weightUnit === "lb" ? "e.g. 154" : "e.g. 70"}
                    onChange={(e) => setRiskField("weightInput", e.target.value)}
                  />
                  <Select
                    className="rounded-2xl h-12 shadow-sm shrink-0"
                    style={{ width: "5.5rem" }}
                    value={risk.weightUnit ?? "kg"}
                    onChange={(e) => setRiskField("weightUnit", e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </Select>
                </div>
              </Label>
              <Label>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Height</span>
                <div className="mt-2 flex gap-2">
                  <Input
                    className="rounded-2xl h-12 shadow-sm flex-1 min-w-0"
                    type="number"
                    step="0.1"
                    min={0}
                    value={risk.heightInput ?? ""}
                    placeholder={risk.heightUnit === "ft" ? "e.g. 5.6" : "e.g. 170"}
                    onChange={(e) => setRiskField("heightInput", e.target.value)}
                  />
                  <Select
                    className="rounded-2xl h-12 shadow-sm shrink-0"
                    style={{ width: "5.5rem" }}
                    value={risk.heightUnit ?? "cm"}
                    onChange={(e) => setRiskField("heightUnit", e.target.value)}
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft</option>
                  </Select>
                </div>
                {risk.heightUnit === "ft" && (
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                    Use decimal feet, e.g. 5 ft 6 in = 5.5
                  </span>
                )}
              </Label>
              <Label>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">BMI</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                  type="text"
                  value={risk.bmi ?? ""}
                  readOnly
                  disabled
                />
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  Auto-calculated from weight and height
                </span>
              </Label>
            </div>
            <GroupedForm
              groups={riskGroups}
              values={risk}
              errors={riskErrors}
              onChange={setRiskField}
            />
          </div>
        )}

        {/* SCREENING */}
        {currentKey === "screening" && cancerTypes.length > 0 && (
          <div className="space-y-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Screening</h3>

            {cancerTypes.map((ct) => {
              // Inject facility options into breast biopsy booking field
              const groups = withoutReferral(SCREENING_GROUPS[ct]).map((g) => {
                if (ct !== "breast") return g;
                return {
                  ...g,
                  fields: g.fields.map((f) =>
                    f.name === "biopsyBookingFacilityId"
                      ? {
                          ...f,
                          options: [
                            { value: "", label: "Select facility" },
                            ...facilities.map((fac) => ({
                              value: String(fac.facilityId),
                              label: fac.facilityName,
                            })),
                          ],
                        }
                      : f
                  ),
                };
              });

              return (
                <div
                  key={ct}
                  className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Stethoscope className="w-4 h-4 text-green-600" />
                    <h4 className="font-semibold text-gray-800 dark:text-white">
                      {cancerLabel(ct)} Screening
                    </h4>
                  </div>
                  <GroupedForm
                    groups={groups}
                    values={screenings[ct] || {}}
                    errors={screeningErrors[ct] || {}}
                    onChange={(n, val) => setScreeningField(ct, n, val)}
                  />
                </div>
              );
            })}

            {/* Shared treatment referral */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold text-gray-800 dark:text-white">Treatment Referral</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Applies to {cancerTypes.length > 1 ? "all selected screenings" : "this screening"}.
              </p>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Treatment Referral
                  </span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={treatmentReferral}
                    onChange={(e) => setTreatmentReferral(e.target.value)}
                  >
                    <option value="referred">Referred</option>
                    <option value="not_referred">Not Referred</option>
                  </Select>
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* REFERRAL */}
        {currentKey === "referral" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Refer Client</h3>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              {positiveTypes.length === 1 ? (
                <>{cancerLabel(positiveTypes[0])} result was suspicious.</>
              ) : (
                <>Suspicious results: {positiveTypes.map((c) => cancerLabel(c)).join(", ")}.</>
              )}{" "}
              Select the facility to refer this client to.
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Referral Type</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={referralType}
                  onChange={(e) => setReferralType(e.target.value as any)}
                >
                  <option value="screening_to_confirmation">To Main Hub — Confirmation Screening</option>
                  <option value="confirmation_to_treatment">To Treatment Centre</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Notes (optional)</span>
                <Input
                  className="mt-2 rounded-2xl h-12"
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="Any notes for the receiving facility"
                />
              </Label>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-11 h-12 rounded-2xl"
                placeholder="Search facilities"
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
              />
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 max-h-72 overflow-y-auto">
              {referralFacilities
                .filter((f) => f.facilityName.toLowerCase().includes(facilitySearch.toLowerCase()))
                .map((f) => {
                  const selected = String(referral.facilityId) === String(f.facilityId);
                  return (
                    <button
                      key={f.facilityId}
                      type="button"
                      onClick={() =>
                        setReferral((prev) => ({
                          ...prev,
                          facilityId:   f.facilityId,
                          facilityName: f.facilityName,
                        }))
                      }
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        selected
                          ? "border-green-600 ring-2 ring-green-200 dark:ring-green-900 bg-green-50/50"
                          : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{f.facilityName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[f.facilityLga, f.facilityState].filter(Boolean).join(", ")}
                          </p>
                          {f.navigatorName && (
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                              Navigator: {f.navigatorName}
                            </p>
                          )}
                        </div>
                        {selected && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* OUTCOME */}
        {currentKey === "outcome" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Screening Outcome</h3>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
              This platform is a clinical decision support tool — it documents
              findings and guides next steps. It does not diagnose. Outcomes
              and referrals below must be interpreted and confirmed by a
              trained navigator or clinician.
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {cancerTypes.map((ct) => (
                <div key={ct} className="flex items-center justify-between">
                  <span>{cancerLabel(ct)}</span>
                  <span className={`font-semibold capitalize ${
                    screenings[ct]?.screeningResult === "positive"
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-700 dark:text-green-400"
                  }`}>
                    {screenings[ct]?.screeningResult || "—"}
                  </span>
                </div>
              ))}
              {referral.facilityName && (
                <div className="pt-1">
                  Referred to <span className="font-semibold">{referral.facilityName}</span>.
                </div>
              )}
            </div>
            <GroupedForm
              groups={OUTCOME_GROUPS}
              values={{ ...outcome, screeningResult: overallResult }}
              errors={{}}
              onChange={(n, val) => setOutcome((prev) => ({ ...prev, [n]: val }))}
            />
          </div>
        )}
      </div>

      {/* ── Footer navigation ── */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          layout="outline"
          className="rounded-2xl h-11 w-full sm:w-auto"
          onClick={handleBack}
          disabled={stepIndex === 0 || busy}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </span>
        </Button>

        <Button
          className="rounded-2xl h-11 w-full sm:w-auto bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
          onClick={handleNext}
          disabled={busy || referralSubmitting || (currentKey === "precounsel" && consentDenied)}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {(busy || referralSubmitting) && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLast ? "Finish & Save" : "Save & Continue"}
            {!isLast && !busy && !referralSubmitting && <ChevronRight className="w-4 h-4" />}
          </span>
        </Button>
      </div>
    </Layout>
  );
}