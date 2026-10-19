// Central configuration for the guided screening wizard.
// Everything that changes per cancer type lives here, so the wizard UI stays generic.

export type CancerType =
  | "cervical"
  | "breast"
  | "prostate"
  | "colorectal"
  | "liver";

import {
  PROSTATE_GROUPS,
  PROSTATE_MIN_AGE,
  PROSTATE_MAX_AGE_EXCLUSIVE,
} from "./prostateScreening";
export * from "./prostateScreening";

export type Gender = "male" | "female" | "any";

export type WizardField = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "tel" | "select" | "multiselect" | "checkbox" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  colSpan?: 1 | 2;
  min?: number;
  max?: number;
  step?: string;
  help?: string;
  // Display-only field (e.g. auto-calculated BMI); not user-editable
  readOnly?: boolean;
  // Conditional visibility based on the current values of the step's form
  showIf?: (v: Record<string, any>) => boolean;
  // Risk-profile fields only: the field is shown when at least one of these cancer types is
  // selected. Leave undefined for fields that apply to every cancer type.
  cancers?: CancerType[];
};

export type FieldGroup = {
  title?: string;
  description?: string;
  fields: WizardField[];
};

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const resultOptions = [
  { value: "suspicious", label: "Suspicious" },
  { value: "non_suspicious", label: "Non Suspicious" },
];

// ---------------------------------------------------------------------------
// Cancer types (with gender + age relevance, used to filter the selector)
// minAge / maxAge are INCLUSIVE and are the client's age in whole years today.
// Types without limits are always offered. Add limits here for any other type.
// ---------------------------------------------------------------------------

export type CancerTypeInfo = {
  value: CancerType;
  label: string;
  gender: Gender;
  blurb: string;
  minAge?: number;
  maxAge?: number;
};

export const CANCER_TYPES: CancerTypeInfo[] = [
  { value: "cervical", label: "Cervical", gender: "female", blurb: "VIA, Pap smear or HPV" },
  { value: "breast", label: "Breast", gender: "any", blurb: "CBE, mammography or ultrasound", minAge: 18, maxAge: 75 },
  {
    value: "prostate",
    label: "Prostate",
    gender: "male",
    blurb: "PSA, DRE and IPSS (men 45–74)",
    minAge: PROSTATE_MIN_AGE,
    maxAge: PROSTATE_MAX_AGE_EXCLUSIVE - 1, // protocol: 45 to under 75
  },
  { value: "colorectal", label: "Colorectal", gender: "any", blurb: "FIT, FOBT or colonoscopy" },
  { value: "liver", label: "Liver", gender: "any", blurb: "USS / AFP with viral status" },
];

export function cancerTypesForGender(gender?: string): CancerTypeInfo[] {
  const g = (gender || "").toLowerCase();
  if (g !== "male" && g !== "female") return CANCER_TYPES; // unknown → show all
  return CANCER_TYPES.filter((c) => c.gender === "any" || c.gender === g);
}

/**
 * Cancer types offered for this client: filtered by gender AND by age bracket.
 * When the age is unknown (no date of birth yet) nothing is hidden on age grounds.
 */
export function cancerTypesForClient(gender?: string, age?: number | null): CancerTypeInfo[] {
  return cancerTypesForGender(gender).filter((c) => {
    if (age === null || age === undefined) return true;
    if (c.minAge !== undefined && age < c.minAge) return false;
    if (c.maxAge !== undefined && age > c.maxAge) return false;
    return true;
  });
}

function ageRangeLabel(c: CancerTypeInfo): string {
  if (c.minAge !== undefined && c.maxAge !== undefined) return `${c.minAge}–${c.maxAge}`;
  if (c.minAge !== undefined) return `${c.minAge}+`;
  if (c.maxAge !== undefined) return `up to ${c.maxAge}`;
  return "any age";
}

/** Plain-language note listing the types hidden because of the client's age (or null). */
export function cancerAgeNotice(gender?: string, age?: number | null): string | null {
  if (age === null || age === undefined) return null;
  const shown = new Set(cancerTypesForClient(gender, age).map((c) => c.value));
  const hidden = cancerTypesForGender(gender).filter((c) => !shown.has(c.value));
  if (hidden.length === 0) return null;
  return `Not shown because of the client's age (${age}): ${hidden
    .map((c) => `${c.label} (eligible ages ${ageRangeLabel(c)})`)
    .join(", ")}.`;
}

export function cancerLabel(type?: CancerType | string): string {
  return CANCER_TYPES.find((c) => c.value === type)?.label ?? "Screening";
}

/** Options for "which cancer?" dropdowns (previous diagnosis, previous screening). */
export const CANCER_TYPE_SELECT_OPTIONS = [
  { value: "", label: "Select cancer type" },
  ...CANCER_TYPES.map((c) => ({ value: c.value, label: c.label })),
];

/**
 * Sensible default screening method per cancer type, used to pre-fill
 * a new screening entry when the type is first selected.
 */
export const DEFAULT_METHOD: Partial<Record<CancerType, string>> = {
  cervical: "via",
  breast: "cbe",
  colorectal: "fit",
  liver: "uss",
};

/**
 * Pre-fills a new screening entry with today's date, a default
 * "negative" result, and the default method for that cancer type (or
 * the CBE flag for breast, which uses a checkbox rather than a select).
 */
export function defaultScreeningFor(ct: CancerType): Record<string, any> {
  const base: Record<string, any> = {
    screeningDate: new Date().toISOString().split("T")[0],
    screeningResult: "negative",
  };
  if (ct === "breast") {
    base.methodCbe = true;
  } else if (DEFAULT_METHOD[ct]) {
    base.method = DEFAULT_METHOD[ct];
  }
  return base;
}

// ---------------------------------------------------------------------------
// Step 2 — Pre-screening counselling (persisted to /outcome)
// ---------------------------------------------------------------------------

export const PRE_COUNSELLING_FIELDS: WizardField[] = [
  { name: "preScreeningCounselingDate", label: "Counselling Date", type: "date", colSpan: 1 },
  { name: "preScreeningCounselor", label: "Counsellor Name / ID", type: "text", colSpan: 1, placeholder: "Enter counsellor name" },
];

// ---------------------------------------------------------------------------
// Comorbidities — multi-select (Hypertension / Diabetes / Obesity / Other).
// Stored as comorbiditiesJson (array of strings) on the risk profile, as before.
// ---------------------------------------------------------------------------

export const COMORBIDITY_OPTIONS = [
  { value: "hypertension", label: "Hypertension" },
  { value: "diabetes", label: "Diabetes" },
  { value: "obesity", label: "Obesity" },
  { value: "other", label: "Other" },
];

const COMORBIDITY_LABEL_TO_VALUE: Record<string, string> = {
  hypertension: "hypertension",
  diabetes: "diabetes",
  obesity: "obesity",
};

const COMORBIDITY_VALUE_TO_LABEL: Record<string, string> = {
  hypertension: "Hypertension",
  diabetes: "Diabetes",
  obesity: "Obesity",
};

/** Form state → the array the API stores. */
export function comorbiditiesToJson(risk: Record<string, any>): string[] {
  const raw = risk.comorbidities;
  const selected: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return selected.map((v) =>
    v === "other"
      ? String(risk.comorbiditiesOther ?? "").trim() || "Other"
      : COMORBIDITY_VALUE_TO_LABEL[v] ?? String(v)
  );
}

/**
 * Stored array → form state. Known conditions select their option; anything else is shown under
 * "Other" with the text preserved, so saving never silently drops existing data.
 */
export function comorbiditiesFromJson(raw: any): { comorbidities: string[]; comorbiditiesOther: string } {
  let list: any = raw;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.split(",");
    }
  }
  const items: string[] = Array.isArray(list) ? list.map((s) => String(s).trim()).filter(Boolean) : [];

  const comorbidities: string[] = [];
  const others: string[] = [];
  items.forEach((item) => {
    const known = COMORBIDITY_LABEL_TO_VALUE[item.toLowerCase()];
    if (known) {
      if (!comorbidities.includes(known)) comorbidities.push(known);
    } else {
      others.push(item);
    }
  });
  if (others.length) comorbidities.push("other");
  return { comorbidities, comorbiditiesOther: others.join(", ") };
}

/** Saved risk profile → form state (adds the comorbidity values). */
export function hydrateRiskProfile(profile: Record<string, any> | null | undefined): Record<string, any> {
  if (!profile) return {};
  const raw = profile.comorbiditiesJson ?? profile.comorbidities_json;
  return { ...profile, ...comorbiditiesFromJson(raw) };
}

/** Form state → risk-profile API payload (comorbidity array; dependent answers cleared when they no longer apply). */
export function buildRiskPayload(risk: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = { ...risk };
  payload.comorbiditiesJson = comorbiditiesToJson(risk);
  delete payload.comorbidities;
  delete payload.comorbiditiesOther;

  if (payload.previousCancer !== "yes") payload.previousCancerDetails = null;
  if (payload.previousScreening !== "yes") payload.previousScreeningDetails = null;
  if (payload.ionizingRadiationExposure !== "yes") {
    payload.ionizingRadiationType = null;
    payload.ionizingRadiationOther = null;
  } else if (payload.ionizingRadiationType !== "other") {
    payload.ionizingRadiationOther = null;
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Step 4 — Risk profile (dynamic). Posted to /risk-profile.
// Each field can be tagged with `cancers`; it is then shown only when one of those cancer
// types is selected (see getRiskGroupsFor). Tags follow RISK_FOCUS below:
//   cervical   → HIV status, smoking, family history
//   breast     → family history, alcohol, BMI (+ reproductive history)
//   prostate   → family history (age comes from the date of birth)
//   colorectal → family history, smoking, alcohol
//   liver      → hepatitis B/C status, alcohol
// Untagged fields (comorbidities) are shown for every cancer type.
// ---------------------------------------------------------------------------

/** Cancer types for which the weight / height / BMI inputs are shown on the guided wizard. */
export const BMI_RISK_CANCERS: CancerType[] = ["breast", "colorectal", "liver"];
export const showsBmiRisk = (types: CancerType[]) => types.some((t) => BMI_RISK_CANCERS.includes(t));

const commonRiskGroup: FieldGroup = {
  title: "Lifestyle & General Risk",
  fields: [
    {
      name: "familyHistory",
      label: "Family History of Cancer",
      type: "select",
      cancers: ["cervical", "breast", "prostate", "colorectal"],
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "unknown", label: "Unknown" },
      ],
      colSpan: 1,
    },
    {
      name: "smokingStatus",
      label: "Smoking Status",
      type: "select",
      colSpan: 1,
      cancers: ["cervical", "colorectal"],
      options: [
        { value: "non_smoker", label: "Non-smoker" },
        { value: "active_smoker", label: "Active smoker" },
        { value: "former_smoker", label: "Former smoker" },
        { value: "passive_smoker", label: "Passive smoker" },
      ],
    },
    {
      name: "cigarettesPerDay",
      label: "Cigarettes / Day",
      type: "number",
      min: 0,
      colSpan: 1,
      cancers: ["cervical", "colorectal"],
      showIf: (v) => v.smokingStatus === "active_smoker",
    },
    {
      name: "smokingDuration",
      label: "Smoking Duration (years)",
      type: "number",
      min: 0,
      colSpan: 1,
      cancers: ["cervical", "colorectal"],
      showIf: (v) => v.smokingStatus === "active_smoker",
    },
    {
      name: "alcoholFrequency",
      label: "Alcohol Frequency",
      type: "select",
      colSpan: 1,
      cancers: ["breast", "colorectal", "liver"],
      options: [
        { value: "never", label: "Never" },
        { value: "occasionally", label: "Occasionally" },
        { value: "weekly", label: "Weekly" },
        { value: "regularly", label: "Regularly" },
        { value: "daily", label: "Daily" },
      ],
    },
    {
      name: "alcoholUnitsPerWeek",
      label: "Alcohol Units / Week",
      type: "number",
      min: 0,
      colSpan: 1,
      cancers: ["breast", "colorectal", "liver"],
      showIf: (v) => v.alcoholFrequency && v.alcoholFrequency !== "never",
    },
    // Rendered via a dedicated dual-unit (metric/imperial) input on the guided wizard, not the generic renderer.
    { name: "weightKg", label: "Weight (kg)", type: "number", step: "0.1", min: 0, colSpan: 1, showIf: () => false },
    { name: "heightCm", label: "Height (cm)", type: "number", step: "0.1", min: 0, colSpan: 1, showIf: () => false },
    {
      name: "bmi",
      label: "BMI",
      type: "number",
      step: "0.1",
      colSpan: 1,
      readOnly: true,
      help: "Auto-calculated from weight and height",
      showIf: () => false,
    },
    {
      name: "comorbidities",
      label: "Comorbidities",
      type: "multiselect",
      colSpan: 2,
      options: COMORBIDITY_OPTIONS,
    },
    {
      name: "comorbiditiesOther",
      label: "Other comorbidity (specify)",
      type: "text",
      colSpan: 2,
      placeholder: "Type the condition",
      showIf: (v) => Array.isArray(v.comorbidities) && v.comorbidities.includes("other"),
    },
  ],
};

const infectiousGroup: FieldGroup = {
  title: "Infectious Disease Status",
  fields: [
    {
      name: "hivStatus",
      label: "HIV Status",
      type: "select",
      colSpan: 1,
      cancers: ["cervical"],
      options: [
        { value: "", label: "Not specified" },
        { value: "positive", label: "Positive" },
        { value: "negative", label: "Negative" },
        { value: "unknown", label: "Unknown" },
      ],
    },
    {
      name: "hbvStatus",
      label: "Hepatitis B Status",
      type: "select",
      colSpan: 1,
      required: true, // only ever shown for liver screening
      cancers: ["liver"],
      options: [
        { value: "", label: "Select" },
        { value: "positive", label: "Positive" },
        { value: "negative", label: "Negative" },
        { value: "unknown", label: "Unknown" },
      ],
    },
    {
      name: "hcvStatus",
      label: "Hepatitis C Status",
      type: "select",
      colSpan: 1,
      required: true, // only ever shown for liver screening
      cancers: ["liver"],
      options: [
        { value: "", label: "Select" },
        { value: "positive", label: "Positive" },
        { value: "negative", label: "Negative" },
        { value: "unknown", label: "Unknown" },
      ],
    },
  ],
};

// Per-cancer emphasis line shown at the top of the risk step.
export const RISK_FOCUS: Record<CancerType, string> = {
  cervical: "Cervical risk is driven by HIV status, smoking and family history.",
  breast: "Breast risk is driven by family history, alcohol and BMI.",
  prostate: "Prostate risk is driven by age and family history.",
  colorectal: "Colorectal risk is driven by family history, smoking and alcohol.",
  liver: "Liver risk is driven by hepatitis B/C status and alcohol — viral status is required.",
};

// Reproductive-history fields (menstruation, menopause, breastfeeding) only make sense for
// female clients being screened for breast cancer.
const BREAST_REPRODUCTIVE_FIELDS: WizardField[] = [
  {
    name: "ageAtFirstMenstruation",
    label: "Age at First Menstruation",
    type: "number",
    min: 0,
    max: 30,
    placeholder: "Age",
    cancers: ["breast"],
  },
  {
    name: "ageAtMenopause",
    label: "Age at Menopause (if applicable)",
    type: "number",
    min: 0,
    max: 100,
    placeholder: "Age",
    cancers: ["breast"],
  },
  {
    name: "breastfeedingHistory",
    label: "Breastfeeding History",
    type: "select",
    options: yesNo,
    colSpan: 1,
    cancers: ["breast"],
  },
  {
    name: "breastfeedingDuration",
    label: "Breastfeeding Duration (months)",
    type: "number",
    min: 0,
    colSpan: 1,
    cancers: ["breast"],
    showIf: (v) => v.breastfeedingHistory === "yes",
  },
];

/**
 * Risk-factor groups for the cancer type(s) selected. A field is shown only if it applies to at
 * least one selected type. The cervical-specific groups (CERVICAL_RISK_GROUPS) are appended by the
 * pages when cervical is selected.
 */
export function getRiskGroupsFor(cancerTypes: CancerType[], gender?: string): FieldGroup[] {
  const selected = cancerTypes ?? [];
  const applies = (f: WizardField) => !f.cancers || f.cancers.some((c) => selected.includes(c));

  const includeReproductive = selected.includes("breast") && gender !== "male";
  const basicGroup: FieldGroup = includeReproductive
    ? { ...commonRiskGroup, fields: [...commonRiskGroup.fields, ...BREAST_REPRODUCTIVE_FIELDS] }
    : commonRiskGroup;

  return [basicGroup, infectiousGroup]
    .map((g) => ({ ...g, fields: g.fields.filter(applies) }))
    .filter((g) => g.fields.length > 0);
}

/** Single-type convenience wrapper kept for older call sites. */
export function getRiskGroups(cancer: CancerType, gender?: string): FieldGroup[] {
  return getRiskGroupsFor([cancer], gender);
}

// ---------------------------------------------------------------------------
// HPV genotypes
// 16/18/35/45 route to ablation eligibility; every other genotype (and "Other") routes to
// colposcopy, as the old "Others" option did.
// ---------------------------------------------------------------------------
const HPV_GENOTYPES = ["16", "18", "31", "33", "35", "39", "45", "51", "52", "56", "58", "59", "66", "68"];
const HPV_GENOTYPE_OPTIONS = [
  { value: "", label: "Select" },
  ...HPV_GENOTYPES.map((g) => ({ value: g, label: g })),
  { value: "other", label: "Other" },
];
const ABLATION_GENOTYPES = ["16", "18", "35", "45"];
const needsColposcopy = (v: Record<string, any>) =>
  !!v.hpvGenotype && !ABLATION_GENOTYPES.includes(v.hpvGenotype);

// ---------------------------------------------------------------------------
// Step 5 — Screening modules (dynamic, posted to /visits/{id}/{type}-screening)
// screeningResult + screeningDate are standardised across every module.
// ---------------------------------------------------------------------------

const resultDateGroup = (methodField: WizardField): FieldGroup => ({
  title: "Screening Details",
  fields: [
    methodField,
    { name: "screeningDate", label: "Screening Date", type: "date", required: true, colSpan: 1 },
    {
      name: "screeningResult",
      label: "Screening Result",
      type: "select",
      options: resultOptions,
      required: true,
      colSpan: 2,
    },
  ],
});

export const SCREENING_GROUPS: Record<CancerType, FieldGroup[]> = {
  cervical: [
    {
      title: "Screening Methods",
      description: "Select all methods used during this encounter.",
      fields: [
        { name: "methodVia", label: "VIA", type: "checkbox", colSpan: 1 },
        { name: "methodPap", label: "Pap Smear", type: "checkbox", colSpan: 1 },
        { name: "methodHpv", label: "HPV", type: "checkbox", colSpan: 1 },
      ],
    },
    {
      title: "HPV",
      description: "Only relevant when HPV is selected above.",
      fields: [
        {
          name: "hpvResult",
          label: "HPV Result",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodHpv,
          options: [
            { value: "", label: "Select" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
            { value: "indeterminate", label: "Indeterminate" },
          ],
        },
        {
          name: "hpvGenotype",
          label: "HPV Genotype",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodHpv,
          options: HPV_GENOTYPE_OPTIONS,
        },
      ],
    },
    {
      title: "HPV Test Booking",
      description: "Book the client for an HPV test at a service facility.",
      fields: [
        { name: "hpvBookNow", label: "Book for HPV test", type: "checkbox", colSpan: 2 },
        {
          name: "hpvBookingDate",
          label: "HPV Appointment Date",
          type: "date",
          colSpan: 1,
          showIf: (v) => !!v.hpvBookNow,
        },
        {
          name: "hpvBookingFacilityId",
          label: "Facility",
          type: "select",
          colSpan: 1,
          options: [], // injected at render time from /services/hpv/facilities
          showIf: (v) => !!v.hpvBookNow,
        },
        {
          name: "hpvBookingNotes",
          label: "Booking Notes",
          type: "textarea",
          colSpan: 2,
          placeholder: "Any instructions or referral details",
          showIf: (v) => !!v.hpvBookNow,
        },
      ],
    },
    {
      title: "Ablation Eligibility",
      description:
        "Shown for HPV 16/18/35/45, and again if a colposcopy result below comes back positive.",
      fields: [
        {
          name: "ablationEligibility",
          label: "Eligible for Ablative Treatment",
          type: "select",
          colSpan: 2,
          showIf: (v) =>
            ABLATION_GENOTYPES.includes(v.hpvGenotype) || v.colposcopyResult === "positive",
          options: [
            { value: "", label: "Select" },
            { value: "eligible", label: "Eligible" },
            { value: "not_eligible", label: "Not Eligible" },
            { value: "suspicious_invasion", label: "Suspicious for Invasion" },
          ],
          help: "Eligible → book ablative treatment below. Not Eligible → book LEEP below. Suspicious for Invasion → automatically referred for evaluation & further management on save.",
        },

        // --- Eligible -> book ablative treatment ---
        {
          name: "ablationBookNow",
          label: "Book for Ablative Treatment",
          type: "checkbox",
          colSpan: 2,
          showIf: (v) => v.ablationEligibility === "eligible",
        },
        {
          name: "ablationBookingDate",
          label: "Ablation Appointment Date",
          type: "date",
          colSpan: 1,
          showIf: (v) => !!v.ablationBookNow,
        },
        {
          name: "ablationBookingFacilityId",
          label: "Facility",
          type: "select",
          colSpan: 1,
          options: [], // injected at render time from /services/ablation/facilities
          showIf: (v) => !!v.ablationBookNow,
        },
        {
          name: "ablationBookingNotes",
          label: "Booking Notes",
          type: "textarea",
          colSpan: 2,
          placeholder: "Any instructions or referral details",
          showIf: (v) => !!v.ablationBookNow,
        },

        // --- Not Eligible -> book LEEP, then histology ---
        {
          name: "leepBookNow",
          label: "Book for LEEP",
          type: "checkbox",
          colSpan: 2,
          showIf: (v) => v.ablationEligibility === "not_eligible",
        },
        {
          name: "leepBookingDate",
          label: "LEEP Appointment Date",
          type: "date",
          colSpan: 1,
          showIf: (v) => !!v.leepBookNow,
        },
        {
          name: "leepBookingFacilityId",
          label: "Facility",
          type: "select",
          colSpan: 1,
          options: [], // injected at render time from /services/leep/facilities
          showIf: (v) => !!v.leepBookNow,
        },
        {
          name: "leepBookingNotes",
          label: "Booking Notes",
          type: "textarea",
          colSpan: 2,
          placeholder: "Any instructions or referral details",
          showIf: (v) => !!v.leepBookNow,
        },
        {
          name: "histologyResult",
          label: "Histology Result",
          type: "select",
          colSpan: 2,
          showIf: (v) => !!v.leepBookNow,
          options: [
            { value: "", label: "Select" },
            { value: "cin1", label: "CIN1" },
            { value: "cin2", label: "CIN2" },
            { value: "cin3", label: "CIN3" },
            { value: "ais", label: "AIS" },
            { value: "cancer", label: "Cancer" },
          ],
          help: "Cancer automatically routes to referral for further evaluation on save.",
        },
      ],
    },
    {
      title: "Colposcopy (Other High-Risk HPV)",
      description: "Shown for any HPV genotype other than 16/18/35/45.",
      fields: [
        {
          name: "colposcopyBookNow",
          label: "Book for Colposcopy",
          type: "checkbox",
          colSpan: 2,
          showIf: needsColposcopy,
        },
        {
          name: "colposcopyBookingDate",
          label: "Colposcopy Appointment Date",
          type: "date",
          colSpan: 1,
          showIf: (v) => needsColposcopy(v) && !!v.colposcopyBookNow,
        },
        {
          name: "colposcopyBookingFacilityId",
          label: "Facility",
          type: "select",
          colSpan: 1,
          options: [], // injected at render time from /services/colposcopy/facilities
          showIf: (v) => needsColposcopy(v) && !!v.colposcopyBookNow,
        },
        {
          name: "colposcopyBookingNotes",
          label: "Booking Notes",
          type: "textarea",
          colSpan: 2,
          placeholder: "Any instructions or referral details",
          showIf: (v) => needsColposcopy(v) && !!v.colposcopyBookNow,
        },
      ],
    },
    {
      title: "Cervical Risk Factors",
      fields: [
        { name: "moreThanOnePartner", label: "More than 1 Sexual Partner", type: "select", options: yesNo, colSpan: 1 },
        { name: "ageAtFirstIntercourse", label: "Age at First Intercourse", type: "number", min: 0, max: 100, colSpan: 1 },
        { name: "numberOfChildbirths", label: "Number of Childbirths", type: "number", min: 0, colSpan: 1 },
        {
          name: "contraceptiveUse",
          label: "Contraceptive Use",
          type: "select",
          colSpan: 1,
          options: [
            { value: "", label: "Select" },
            { value: "none", label: "None" },
            { value: "oral_contraceptives", label: "Oral Contraceptives" },
            { value: "iud", label: "IUD" },
            { value: "barrier_methods", label: "Barrier Methods" },
            { value: "other", label: "Other" },
          ],
        },
      ],
    },
    {
      title: "Procedures & Follow-up",
      fields: [
        { name: "colposcopyDone", label: "Colposcopy done", type: "checkbox", colSpan: 1 },
        {
          name: "colposcopyResult",
          label: "Colposcopy Result",
          type: "select",
          colSpan: 2,
          showIf: (v) => !!v.colposcopyDone,
          options: [
            { value: "", label: "Select colposcopy result" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ],
          help: "Positive → re-opens the Ablation Eligibility step above. Negative → automatically referred for evaluation & further management on save.",
        },
        { name: "biopsyDone", label: "Biopsy done", type: "checkbox", colSpan: 1 },
        {
          name: "biopsyResult",
          label: "Biopsy Result",
          type: "select",
          colSpan: 2,
          showIf: (v) => !!v.biopsyDone,
          options: [
            { value: "", label: "Select biopsy result" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ],
        },
      ],
    },
    {
      title: "Screening Details",
      description: "Optional — record once the result is known.",
      fields: [
        { name: "screeningDate", label: "Screening Date", type: "date", colSpan: 1 },
        {
          name: "screeningResult",
          label: "Screening Result",
          type: "select",
          colSpan: 1,
          options: resultOptions,
        },
      ],
    },
  ],

  breast: [
    {
      title: "Screening Methods",
      description: "Select all methods used during this encounter.",
      fields: [
        { name: "methodCbe", label: "Clinical Breast Exam (CBE)", type: "checkbox", colSpan: 1 },
        { name: "methodMammography", label: "Mammography", type: "checkbox", colSpan: 1 },
        { name: "methodUltrasound", label: "Ultrasound (USS)", type: "checkbox", colSpan: 1 },
      ],
    },

    // CBE section: findings + breast health/symptoms (only when CBE is selected)
    {
      title: "Clinical Breast Exam (CBE)",
      description: "Document each breast independently and record relevant symptoms during the clinical exam.",
      fields: [
        {
          name: "leftCbeFinding",
          label: "Left Breast",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodCbe,
          options: [
            { value: "normal", label: "Normal" },
            { value: "suspicious", label: "Suspicious" },
          ],
        },
        {
          name: "rightCbeFinding",
          label: "Right Breast",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodCbe,
          options: [
            { value: "normal", label: "Normal" },
            { value: "suspicious", label: "Suspicious" },
          ],
        },
        {
          name: "breastLumps",
          label: "Breast Lumps",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodCbe,
          options: [
            { value: "", label: "Select" },
            { value: "current", label: "Current" },
            { value: "previous", label: "Previous" },
            { value: "none", label: "None" },
          ],
        },
        {
          name: "breastNippleDischarge",
          label: "Breast/Nipple Discharge",
          type: "select",
          options: yesNo,
          colSpan: 1,
          showIf: (v) => !!v.methodCbe,
        },
        {
          name: "dischargeType",
          label: "Discharge Type",
          type: "select",
          colSpan: 2,
          showIf: (v) => !!v.methodCbe && v.breastNippleDischarge === "yes",
          options: [
            { value: "", label: "Select type" },
            { value: "bloody", label: "Bloody" },
            { value: "clear", label: "Clear" },
            { value: "milky", label: "Milky" },
            { value: "purulent", label: "Purulent" },
            { value: "others", label: "Others" },
          ],
        },
        {
          name: "skinChanges",
          label: "Skin Appearance Changes",
          type: "select",
          options: yesNo,
          colSpan: 1,
          showIf: (v) => !!v.methodCbe,
        },
        {
          name: "breastPain",
          label: "Breast Pain",
          type: "select",
          options: yesNo,
          colSpan: 1,
          showIf: (v) => !!v.methodCbe,
        },
        {
          name: "previousBiopsy",
          label: "Previous Biopsy",
          type: "select",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unknown", label: "Unknown" },
          ],
          colSpan: 1,
          showIf: (v) => !!v.methodCbe,
        },
        {
          name: "previousBiopsyResult",
          label: "Previous Biopsy Result",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodCbe && v.previousBiopsy === "yes",
          options: [
            { value: "", label: "Select result" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
            { value: "inconclusive", label: "Inconclusive" },
            { value: "unknown", label: "Unknown" },
          ],
        },
      ],
    },

    {
      title: "Imaging Findings",
      description:
        "BI-RADS category, breast density, and overall finding — recorded per side (from mammography / ultrasound).",
      fields: [
        {
          name: "leftBiradsScore",
          label: "Left BI-RADS Score",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodMammography || !!v.methodUltrasound,
          options: [
            { value: "", label: "Select" },
            { value: "0", label: "BI-RADS 0 — Incomplete" },
            { value: "1", label: "BI-RADS 1 — Negative" },
            { value: "2", label: "BI-RADS 2 — Benign" },
            { value: "3", label: "BI-RADS 3 — Probably Benign" },
            { value: "4", label: "BI-RADS 4 — Suspicious" },
            { value: "5", label: "BI-RADS 5 — Highly Suggestive of Malignancy" },
            { value: "6", label: "BI-RADS 6 — Known Malignancy" },
          ],
        },
        {
          name: "rightBiradsScore",
          label: "Right BI-RADS Score",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodMammography || !!v.methodUltrasound,
          options: [
            { value: "", label: "Select" },
            { value: "0", label: "BI-RADS 0 — Incomplete" },
            { value: "1", label: "BI-RADS 1 — Negative" },
            { value: "2", label: "BI-RADS 2 — Benign" },
            { value: "3", label: "BI-RADS 3 — Probably Benign" },
            { value: "4", label: "BI-RADS 4 — Suspicious" },
            { value: "5", label: "BI-RADS 5 — Highly Suggestive of Malignancy" },
            { value: "6", label: "BI-RADS 6 — Known Malignancy" },
          ],
        },
        {
          name: "leftBreastDensity",
          label: "Left Breast Density (ACR)",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodMammography || !!v.methodUltrasound,
          options: [
            { value: "", label: "Select" },
            { value: "a", label: "A — Almost entirely fatty" },
            { value: "b", label: "B — Scattered fibroglandular" },
            { value: "c", label: "C — Heterogeneously dense" },
            { value: "d", label: "D — Extremely dense" },
          ],
        },
        {
          name: "rightBreastDensity",
          label: "Right Breast Density (ACR)",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodMammography || !!v.methodUltrasound,
          options: [
            { value: "", label: "Select" },
            { value: "a", label: "A — Almost entirely fatty" },
            { value: "b", label: "B — Scattered fibroglandular" },
            { value: "c", label: "C — Heterogeneously dense" },
            { value: "d", label: "D — Extremely dense" },
          ],
        },
        {
          name: "leftImagingFinding",
          label: "Left Overall Finding",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodMammography || !!v.methodUltrasound,
          options: [
            { value: "normal", label: "Normal" },
            { value: "suspicious", label: "Suspicious" },
          ],
        },
        {
          name: "rightImagingFinding",
          label: "Right Overall Finding",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.methodMammography || !!v.methodUltrasound,
          options: [
            { value: "normal", label: "Normal" },
            { value: "suspicious", label: "Suspicious" },
          ],
        },
      ],
    },

    {
      title: "Screening Details",
      fields: [
        { name: "screeningDate", label: "Screening Date", type: "date", colSpan: 1 },
        {
          name: "screeningResult",
          label: "Screening Result",
          type: "select",
          options: resultOptions,
          colSpan: 1,
        },
      ],
    },

    {
      title: "Procedures & Follow-up",
      fields: [
        { name: "biopsyDone", label: "Biopsy done (this visit)", type: "checkbox", colSpan: 1 },
        {
          name: "biopsyResult",
          label: "Biopsy Result",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.biopsyDone,
          options: [
            { value: "", label: "Select result" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ],
        },
        {
          name: "histologyResult",
          label: "Histology Result",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.biopsyDone && v.biopsyResult === "positive",
          options: [
            { value: "", label: "Select" },
            { value: "malignant", label: "Malignant" },
            { value: "benign", label: "Benign" },
          ],
          help: "Selecting Malignant automatically requests IHC and triggers referral.",
        },

        // --- IHC: requesting and booking are independent of each other ---
        { name: "ihcRequested", label: "IHC requested", type: "checkbox", colSpan: 2 },
        { name: "ihcBookNow", label: "Book IHC now", type: "checkbox", colSpan: 2 },
        {
          name: "ihcBookingDate",
          label: "IHC Appointment Date",
          type: "date",
          colSpan: 1,
          showIf: (v) => !!v.ihcBookNow,
        },
        {
          name: "ihcBookingFacilityId",
          label: "IHC Facility",
          type: "select",
          colSpan: 1,
          options: [], // injected at render time from /services/ihc/facilities
          showIf: (v) => !!v.ihcBookNow,
        },
        {
          name: "ihcBookingNotes",
          label: "Booking Notes",
          type: "textarea",
          colSpan: 2,
          placeholder: "Any instructions or referral details",
          showIf: (v) => !!v.ihcBookNow,
        },
        {
          name: "ihcResult",
          label: "IHC Result",
          type: "text",
          colSpan: 1,
          showIf: (v) => v.histologyResult === "malignant" || !!v.ihcRequested,
          placeholder: "e.g. ER+/PR+/HER2- (enter once available)",
          help: "Enter once the IHC result is available.",
        },

        {
          name: "biopsyBookNow",
          label: "Book biopsy now",
          type: "checkbox",
          colSpan: 2,
          showIf: (v) => !v.biopsyDone,
        },
        {
          name: "biopsyBookingDate",
          label: "Biopsy Appointment Date",
          type: "date",
          colSpan: 1,
          showIf: (v) => !!v.biopsyBookNow,
        },
        {
          name: "biopsyBookingFacilityId",
          label: "Facility",
          type: "select",
          colSpan: 1,
          options: [],
          showIf: (v) => !!v.biopsyBookNow,
        },
        {
          name: "biopsyBookingNotes",
          label: "Booking Notes",
          type: "textarea",
          colSpan: 2,
          placeholder: "Any instructions or referral details",
          showIf: (v) => !!v.biopsyBookNow,
        },
        {
          name: "treatmentReferral",
          label: "Treatment Referral",
          type: "select",
          colSpan: 1,
          showIf: (v) => v.screeningResult === "suspicious",
          options: [
            { value: "", label: "Select" },
            { value: "referred", label: "Referred" },
            { value: "not_referred", label: "Not Referred" },
          ],
        },
      ],
    },
  ],

  prostate: PROSTATE_GROUPS,

  colorectal: [
    resultDateGroup({
      name: "method",
      label: "Method",
      type: "select",
      required: true,
      colSpan: 1,
      options: [
        { value: "fit", label: "FIT" },
        { value: "fobt", label: "FOBT" },
        { value: "colonoscopy", label: "Colonoscopy" },
      ],
    }),

    {
      title: "Findings & Follow-up",
      fields: [
        { name: "polypDetected", label: "Polyp detected", type: "checkbox", colSpan: 2 },
        {
          name: "histology",
          label: "Histology",
          type: "select",
          colSpan: 1,
          showIf: (v) => !!v.polypDetected,
          options: [
            { value: "", label: "Select" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ],
        },
        {
          name: "treatmentReferral",
          label: "Treatment Referral",
          type: "select",
          colSpan: 1,
          options: [
            { value: "", label: "Select" },
            { value: "referred", label: "Referred" },
            { value: "not_referred", label: "Not Referred" },
          ],
        },
      ],
    },
  ],

  liver: [
    {
      title: "Viral Hepatitis Status",
      fields: [
        {
          name: "hbvStatus",
          label: "HBV Status",
          type: "select",
          required: true,
          colSpan: 1,
          options: [
            { value: "", label: "Select" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ],
        },
        {
          name: "hcvStatus",
          label: "HCV Status",
          type: "select",
          required: true,
          colSpan: 1,
          options: [
            { value: "", label: "Select" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ],
        },
      ],
    },
    {
      title: "Screening Details",
      fields: [
        {
          name: "method",
          label: "Method",
          type: "select",
          required: true,
          colSpan: 1,
          options: [
            { value: "uss", label: "USS (Ultrasound)" },
            { value: "afp", label: "AFP (Alpha-Fetoprotein)" },
          ],
        },
        { name: "screeningDate", label: "Screening Date", type: "date", colSpan: 1 },
        { name: "afpValue", label: "AFP Value (ng/mL)", type: "number", step: "0.1", colSpan: 1, showIf: (v) => v.method === "afp" },
        {
          name: "screeningResult",
          label: "Screening Result",
          type: "select",
          options: resultOptions,
          colSpan: 1,
        },
      ],
    },
    {
      title: "Findings & Follow-up",
      fields: [
        { name: "lesionDetected", label: "Lesion detected", type: "checkbox", colSpan: 2, showIf: (v) => v.method === "uss" },
        {
          name: "treatmentReferral",
          label: "Treatment Referral",
          type: "select",
          colSpan: 1,
          options: [
            { value: "", label: "Select" },
            { value: "referred", label: "Referred" },
            { value: "not_referred", label: "Not Referred" },
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Step 6 — Outcome (conditional on screening result). Posted to /outcome.
// ---------------------------------------------------------------------------

export const OUTCOME_GROUPS: FieldGroup[] = [
  {
    title: "Post-Screening Counselling",
    fields: [
      { name: "postScreeningCounselingDate", label: "Counselling Date", type: "date", colSpan: 1 },
      { name: "postScreeningCounselor", label: "Counsellor Name / ID", type: "text", colSpan: 1 },
    ],
  },
  {
    title: "Follow-up (Negative Result)",
    description: "Shown when the screening result is negative.",
    fields: [
      {
        name: "nextFollowUpDate",
        label: "Next Follow-up Date",
        type: "date",
        colSpan: 1,
        showIf: (v) => v.screeningResult === "negative",
      },
      {
        name: "followUpEstablished",
        label: "Follow-up Established",
        type: "select",
        options: yesNo,
        colSpan: 1,
        showIf: (v) => v.screeningResult === "negative",
      },
    ],
  },
  {
    title: "Diagnosis & Treatment (Positive Result)",
    description: "Shown when the screening result is positive.",
    fields: [
      {
        name: "diagnosis",
        label: "Diagnosis",
        type: "text",
        colSpan: 2,
        showIf: (v) => v.screeningResult === "positive",
      },
      {
        name: "cancerStage",
        label: "Cancer Stage",
        type: "select",
        colSpan: 1,
        showIf: (v) => v.screeningResult === "positive",
        options: [
          { value: "", label: "Select stage" },
          { value: "stage_0", label: "Stage 0" },
          { value: "stage_1", label: "Stage 1" },
          { value: "stage_2", label: "Stage 2" },
          { value: "stage_3", label: "Stage 3" },
          { value: "stage_4", label: "Stage 4" },
        ],
      },
      {
        name: "diagnosisDate",
        label: "Diagnosis Date",
        type: "date",
        colSpan: 1,
        showIf: (v) => v.screeningResult === "positive",
      },
      {
        name: "treatmentCommenced",
        label: "Treatment Commenced?",
        type: "select",
        options: yesNo,
        colSpan: 1,
        showIf: (v) => v.screeningResult === "positive",
      },
      {
        name: "treatmentCommencementDate",
        label: "Commencement Date",
        type: "date",
        colSpan: 1,
        showIf: (v) => v.screeningResult === "positive" && v.treatmentCommenced === "yes",
      },
      {
        name: "treatmentType",
        label: "Treatment Type",
        type: "select",
        colSpan: 1,
        showIf: (v) => v.screeningResult === "positive" && v.treatmentCommenced === "yes",
        options: [
          { value: "", label: "Select" },
          { value: "surgery", label: "Surgery" },
          { value: "chemotherapy", label: "Chemotherapy" },
          { value: "radiotherapy", label: "Radiotherapy" },
          { value: "hormonal", label: "Hormonal Therapy" },
          { value: "immunotherapy", label: "Immunotherapy" },
          { value: "combination", label: "Combination Therapy" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "treatmentFacility",
        label: "Treatment Facility",
        type: "text",
        colSpan: 1,
        showIf: (v) => v.screeningResult === "positive" && v.treatmentCommenced === "yes",
      },
    ],
  },
  {
    title: "Remarks",
    fields: [{ name: "remarks", label: "General Remarks", type: "textarea", colSpan: 2 }],
  },
];