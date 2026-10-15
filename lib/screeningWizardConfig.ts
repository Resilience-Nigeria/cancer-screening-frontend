// Central configuration for the guided screening wizard.
// Everything that changes per cancer type lives here, so the wizard UI stays generic.

export type CancerType =
  | "cervical"
  | "breast"
  | "prostate"
  | "colorectal"
  | "liver";

  import { PROSTATE_GROUPS } from "./prostateScreening";
export * from "./prostateScreening";

export type Gender = "male" | "female" | "any";

export type WizardField = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "tel" | "select" | "checkbox" | "textarea";
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
  // { value: "negative", label: "Negative" },
  // { value: "positive", label: "Positive" },
  { value: "suspicious", label: "Suspicious" },
  { value: "non_suspicious", label: "Non Suspicious" },
];

// ---------------------------------------------------------------------------
// Cancer types (with gender relevance, used to filter the selector)
// ---------------------------------------------------------------------------

export const CANCER_TYPES: {
  value: CancerType;
  label: string;
  gender: Gender;
  blurb: string;
}[] = [
  { value: "cervical", label: "Cervical", gender: "female", blurb: "VIA, Pap smear or HPV" },
  { value: "breast", label: "Breast", gender: "any", blurb: "CBE, mammography or ultrasound" },
  { value: "prostate", label: "Prostate", gender: "male", blurb: "PSA, DRE and IPSS (men 45–74)" },
  { value: "colorectal", label: "Colorectal", gender: "any", blurb: "FIT, FOBT or colonoscopy" },
  { value: "liver", label: "Liver", gender: "any", blurb: "USS / AFP with viral status" },
];

export function cancerTypesForGender(gender?: string): typeof CANCER_TYPES {
  const g = (gender || "").toLowerCase();
  if (g !== "male" && g !== "female") return CANCER_TYPES; // unknown → show all
  return CANCER_TYPES.filter((c) => c.gender === "any" || c.gender === g);
}

export function cancerLabel(type?: CancerType | string): string {
  return CANCER_TYPES.find((c) => c.value === type)?.label ?? "Screening";
}

/**
 * Sensible default screening method per cancer type, used to pre-fill
 * a new screening entry when the type is first selected - saves a
 * click for the most common method rather than leaving it blank.
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
// Step 4 — Risk profile (dynamic). Posted to /risk-profile.
// Only columns that the risk-profile endpoint accepts are used here.
// ---------------------------------------------------------------------------

const commonRiskGroup: FieldGroup = {
  title: "Lifestyle & General Risk",
  fields: [
    {
      name: "familyHistory",
      label: "Family History of Cancer",
      type: "select",
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
      showIf: (v) => v.smokingStatus === "active_smoker",
    },
    {
      name: "smokingDuration",
      label: "Smoking Duration (years)",
      type: "number",
      min: 0,
      colSpan: 1,
      showIf: (v) => v.smokingStatus === "active_smoker",
    },
    {
      name: "alcoholFrequency",
      label: "Alcohol Frequency",
      type: "select",
      colSpan: 1,
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
      showIf: (v) => v.alcoholFrequency && v.alcoholFrequency !== "never",
    },
    // Rendered via a dedicated dual-unit (metric/imperial) input below, not the generic renderer.
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
      label: "Comorbidities (comma separated)",
      type: "text",
      colSpan: 2,
      placeholder: "e.g. Diabetes, Hypertension",
      help: "Separate multiple conditions with commas",
    },
  ],
};



const infectiousGroup = (required: boolean): FieldGroup => ({
  title: "Infectious Disease Status",
  fields: [
    {
      name: "hivStatus",
      label: "HIV Status",
      type: "select",
      colSpan: 1,
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
      required,
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
      required,
      options: [
        { value: "", label: "Select" },
        { value: "positive", label: "Positive" },
        { value: "negative", label: "Negative" },
        { value: "unknown", label: "Unknown" },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// Prostate screening decision logic (National Prostate Cancer Screening
// Algorithm). Symptom triage → PSA-deferment check → PSA/DRE thresholds.
// Kept here as pure, exported helpers so both wizard pages (the guided
// wizard and the Stage 2 clinical screening flow) share one implementation.
// ---------------------------------------------------------------------------

/** Warning symptoms that mean a man should not be routed through routine screening. */
// export const PROSTATE_SYMPTOM_FIELDS = [
//   "delayStartingUrination",
//   "poorUrinaryStream",
//   "frequentDayUrination",
//   "nocturia",
//   "incompleteEmptying",
//   "bloodInUrine",
//   "inabilityToPassUrine",
//   "urgeIncontinence",
//   "inabilityToHoldUrine",
//   "terminalDribbling",
//   "bonePainHipBack",
//   "unexplainedWeightLoss",
// ] as const;

// /** Conditions that can transiently raise PSA and should defer testing. */
// export const PROSTATE_DEFERMENT_FIELDS = [
//   "recentDre",
//   "recentEjaculation",
//   "recentUrinaryInfection",
//   "recentVigorousExercise",
// ] as const;

// export function computeProstateSymptomatic(v: Record<string, any>): boolean {
//   return PROSTATE_SYMPTOM_FIELDS.some((f) => v[f] === "yes");
// }

// export function computeProstatePsaDeferred(v: Record<string, any>): boolean {
//   return PROSTATE_DEFERMENT_FIELDS.some((f) => v[f] === "yes");
// }

// export type ProstateOutcome = {
//   screeningPathway: "Symptomatic" | "Asymptomatic";
//   psaEligibility: "Deferred" | "Eligible" | "";
//   screeningResult: "suspicious" | "non_suspicious" | "";
//   treatmentReferral: "referred" | "not_referred" | "";
//   recommendedAction: string;
// };

// /**
//  * Pure implementation of the prostate screening decision tree:
//  *  1. Symptomatic → exit routine screening, refer to the clinical/diagnostic pathway.
//  *  2. Asymptomatic + a PSA-deferment condition → defer PSA, manage condition, recall.
//  *  3. Asymptomatic + eligible:
//  *       PSA > 3 or DRE suspicious           → abnormal screen, automatic urology referral
//  *       PSA 1–3, DRE not suspicious          → counsel, risk-adapted repeat PSA (recall)
//  *       PSA < 1, DRE not suspicious          → negative/low risk, risk-adapted recall
//  */
// export function computeProstateOutcome(v: Record<string, any>): ProstateOutcome {
//   if (computeProstateSymptomatic(v)) {
//     return {
//       screeningPathway: "Symptomatic",
//       psaEligibility: "",
//       screeningResult: "suspicious",
//       treatmentReferral: "referred",
//       recommendedAction:
//         "Symptomatic — exit routine screening. Refer to the clinical diagnostic / specialist pathway.",
//     };
//   }

//   if (computeProstatePsaDeferred(v)) {
//     return {
//       screeningPathway: "Asymptomatic",
//       psaEligibility: "Deferred",
//       screeningResult: "",
//       treatmentReferral: "not_referred",
//       recommendedAction:
//         "PSA deferred — a condition present can transiently raise PSA. Manage the condition and recall for PSA testing.",
//     };
//   }

//   const psa =
//     v.psaLevel !== undefined && v.psaLevel !== null && v.psaLevel !== ""
//       ? parseFloat(v.psaLevel)
//       : null;
//   const dreSuspicious = v.dreResult === "positive";

//   if (psa === null) {
//     return {
//       screeningPathway: "Asymptomatic",
//       psaEligibility: "Eligible",
//       screeningResult: "",
//       treatmentReferral: "not_referred",
//       recommendedAction: "Eligible for PSA testing — enter the PSA level (± DRE) to classify the screen.",
//     };
//   }

//   if (psa > 3 || dreSuspicious) {
//     return {
//       screeningPathway: "Asymptomatic",
//       psaEligibility: "Eligible",
//       screeningResult: "suspicious",
//       treatmentReferral: "referred",
//       recommendedAction:
//         "Abnormal screen (PSA > 3 ng/mL and/or DRE suspicious) — automatic urology referral.",
//     };
//   }

//   if (psa >= 1) {
//     return {
//       screeningPathway: "Asymptomatic",
//       psaEligibility: "Eligible",
//       screeningResult: "non_suspicious",
//       treatmentReferral: "not_referred",
//       recommendedAction:
//         "PSA 1–3 ng/mL, DRE not suspicious — counsel and schedule a risk-adapted repeat PSA (digital recall).",
//     };
//   }

//   return {
//     screeningPathway: "Asymptomatic",
//     psaEligibility: "Eligible",
//     screeningResult: "non_suspicious",
//     treatmentReferral: "not_referred",
//     recommendedAction: "PSA < 1 ng/mL, DRE not suspicious — negative/low risk. Routine risk-adapted recall.",
//   };
// }

// Per-cancer emphasis line shown at the top of the risk step.
export const RISK_FOCUS: Record<CancerType, string> = {
  cervical: "Cervical risk is driven by HIV status, smoking and family history.",
  breast: "Breast risk is driven by family history, alcohol and BMI.",
  prostate: "Prostate risk is driven by age and family history.",
  colorectal: "Colorectal risk is driven by family history, smoking and alcohol.",
  liver: "Liver risk is driven by hepatitis B/C status and alcohol — viral status is required.",
};

// export function getRiskGroups(cancer: CancerType): FieldGroup[] {
//   // Liver requires viral status; others keep it optional.
//   return [commonRiskGroup, infectiousGroup(cancer === "liver")];
// }


export function getRiskGroups(cancer: CancerType, gender?: string): FieldGroup[] {
  // Reproductive-history fields (menstruation, menopause, breastfeeding) only
  // make sense for female clients — guard on gender as well as cancer type so
  // a male client screened for breast cancer (breast is gender "any"), or a
  // step that hasn't collected a cancer-type selection yet and falls back to
  // "breast", never gets asked these questions.
  const includeReproductiveFields = cancer === "breast" && gender !== "male";
  const basicGroup: FieldGroup =
    includeReproductiveFields
      ? {
          ...commonRiskGroup,
          fields: [
            ...commonRiskGroup.fields,
            {
              name: "ageAtFirstMenstruation",
              label: "Age at First Menstruation",
              type: "number",
              min: "0",
              max: "30",
              placeholder: "Age",
            },
            {
              name: "ageAtMenopause",
              label: "Age at Menopause (if applicable)",
              type: "number",
              min: "0",
              max: "100",
              placeholder: "Age",
            },
            {
              name: "breastfeedingHistory",
              label: "Breastfeeding History",
              type: "select",
              options: yesNo,
              colSpan: 1,
            },
            {
              name: "breastfeedingDuration",
              label: "Breastfeeding Duration (months)",
              type: "number",
              min: "0",
              colSpan: 1,
              showIf: (v) => v.breastfeedingHistory === "yes",
            },
            {
              name: "previousBreastSurgery",
              label: "Previous Breast Surgery",
              type: "select",
              options: yesNo,
              colSpan: 1,
            },
          ],
        }
      : commonRiskGroup;

  return [basicGroup, infectiousGroup(cancer === "liver")];
}



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
        ],
      },
      {
        name: "hpvGenotype",
        label: "HPV Genotype",
        type: "select",
        colSpan: 1,
        showIf: (v) => !!v.methodHpv,
        options: [
          { value: "", label: "Select" },
          { value: "16", label: "16" },
          { value: "18", label: "18" },
          { value: "35", label: "35" },
          { value: "45", label: "45" },
          { value: "other", label: "Others" },
        ],
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
          ["16", "18", "35", "45"].includes(v.hpvGenotype) ||
          v.colposcopyResult === "positive",
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
    description: "Shown when HPV genotype is 'Others'.",
    fields: [
      {
        name: "colposcopyBookNow",
        label: "Book for Colposcopy",
        type: "checkbox",
        colSpan: 2,
        showIf: (v) => v.hpvGenotype === "other",
      },
      {
        name: "colposcopyBookingDate",
        label: "Colposcopy Appointment Date",
        type: "date",
        colSpan: 1,
        showIf: (v) => v.hpvGenotype === "other" && !!v.colposcopyBookNow,
      },
      {
        name: "colposcopyBookingFacilityId",
        label: "Facility",
        type: "select",
        colSpan: 1,
        options: [], // injected at render time from /services/colposcopy/facilities
        showIf: (v) => v.hpvGenotype === "other" && !!v.colposcopyBookNow,
      },
      {
        name: "colposcopyBookingNotes",
        label: "Booking Notes",
        type: "textarea",
        colSpan: 2,
        placeholder: "Any instructions or referral details",
        showIf: (v) => v.hpvGenotype === "other" && !!v.colposcopyBookNow,
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

      // Breast health & symptoms — only when CBE is selected
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

      // Previous biopsy history lives with CBE context; result is independent of Procedures
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
      {
        name: "screeningDate",
        label: "Screening Date",
        type: "date",
        // required: true,
        colSpan: 1,
      },
      {
        name: "screeningResult",
        label: "Screening Result",
        type: "select",
        options: resultOptions,
        // required: true,
        colSpan: 1,
      },
    ],
  },

  {
    title: "Procedures & Follow-up",
    fields: [
      // No longer gated by previousBiopsy — client can always document this-visit biopsy / booking
      {
        name: "biopsyDone",
        label: "Biopsy done (this visit)",
        type: "checkbox",
        colSpan: 1,
      },
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
      {
        name: "ihcResult",
        label: "IHC Result",
        type: "text",
        colSpan: 1,
        showIf: (v) => v.histologyResult === "malignant",
        placeholder: "e.g. ER+/PR+/HER2- (enter once available)",
        help: "IHC has been automatically requested for this malignant result.",
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
  // prostate: [
  //   {
  //     title: "Warning Symptoms (Red-Flag Screen)",
  //     description:
  //       "Ask about each symptom below before proceeding. A symptomatic man is not routed through routine screening — he exits to the clinical diagnostic / specialist pathway.",
  //     fields: [
  //       { name: "delayStartingUrination", label: "Difficulty Initiating Urination", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "poorUrinaryStream", label: "Weak / Interrupted Urinary Stream", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "frequentDayUrination", label: "Increased Urinary Frequency (Day)", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "nocturia", label: "Frequent Urination at Night", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "incompleteEmptying", label: "Feeling of Incomplete Bladder Emptying", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "bloodInUrine", label: "Blood in Urine", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "inabilityToPassUrine", label: "Inability to Pass Urine", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "urgeIncontinence", label: "Urge Incontinence", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "inabilityToHoldUrine", label: "Inability to Hold Urine", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "terminalDribbling", label: "Terminal Dribbling", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "bonePainHipBack", label: "Persistent Bone, Hip or Back Pain", type: "select", options: yesNo, colSpan: 1 },
  //       { name: "unexplainedWeightLoss", label: "Unexplained Weight Loss", type: "select", options: yesNo, colSpan: 1 },
  //       {
  //         name: "screeningPathway",
  //         label: "Screening Pathway",
  //         type: "text",
  //         colSpan: 2,
  //         readOnly: true,
  //         help: "Auto-determined from the symptom checklist above. Symptomatic → screening exits to the clinical diagnostic / specialist referral pathway.",
  //       },
  //     ],
  //   },
  //   {
  //     title: "PSA Testing Eligibility",
  //     description:
  //       "Shown for asymptomatic clients only. Certain recent events can transiently raise PSA and should defer testing.",
  //     fields: [
  //       {
  //         name: "recentDre",
  //         label: "DRE / Prostate Massage in Last 48 Hours",
  //         type: "select",
  //         options: yesNo,
  //         colSpan: 1,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic",
  //       },
  //       {
  //         name: "recentEjaculation",
  //         label: "Ejaculation in Last 48 Hours",
  //         type: "select",
  //         options: yesNo,
  //         colSpan: 1,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic",
  //       },
  //       {
  //         name: "recentUrinaryInfection",
  //         label: "Active Urinary Infection / Recent Catheterisation",
  //         type: "select",
  //         options: yesNo,
  //         colSpan: 1,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic",
  //       },
  //       {
  //         name: "recentVigorousExercise",
  //         label: "Vigorous Exercise / Cycling in Last 48 Hours",
  //         type: "select",
  //         options: yesNo,
  //         colSpan: 1,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic",
  //       },
  //       {
  //         name: "psaEligibility",
  //         label: "PSA Eligibility",
  //         type: "text",
  //         colSpan: 1,
  //         readOnly: true,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic",
  //         help: "Auto-determined from the conditions above.",
  //       },
  //       {
  //         name: "recallDate",
  //         label: "Recall / Repeat PSA Date",
  //         type: "date",
  //         colSpan: 1,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic" && v.psaEligibility === "Deferred",
  //         help: "PSA deferred — manage the condition and recall for testing.",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Screening Details",
  //     fields: [
  //       { name: "screeningDate", label: "Screening Date", type: "date", colSpan: 1 },
  //       {
  //         name: "psaLevel",
  //         label: "PSA Level (ng/mL)",
  //         type: "number",
  //         step: "0.01",
  //         colSpan: 1,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic" && v.psaEligibility === "Eligible",
  //       },
  //       {
  //         name: "dreResult",
  //         label: "DRE Result",
  //         type: "select",
  //         colSpan: 1,
  //         showIf: (v) => v.screeningPathway === "Asymptomatic" && v.psaEligibility === "Eligible",
  //         options: [
  //           { value: "", label: "Select" },
  //           { value: "negative", label: "Normal (Negative)" },
  //           { value: "positive", label: "Abnormal (Positive)" },
  //         ],
  //       },
  //       { name: "ipssScore", label: "IPSS Score (0-35)", type: "number", min: 0, max: 35, colSpan: 1 },
  //       {
  //         name: "screeningResult",
  //         label: "Screening Result",
  //         type: "text",
  //         colSpan: 1,
  //         readOnly: true,
  //         help: "Auto-derived from the symptom check and PSA/DRE thresholds — not editable.",
  //       },
  //       {
  //         name: "treatmentReferral",
  //         label: "Treatment Referral",
  //         type: "text",
  //         colSpan: 1,
  //         readOnly: true,
  //         help: "Automatic: PSA > 3 ng/mL, DRE suspicious, or symptomatic → Referred.",
  //       },
  //       {
  //         name: "recommendedAction",
  //         label: "Recommended Action",
  //         type: "textarea",
  //         colSpan: 2,
  //         readOnly: true,
  //       },
  //     ],
  //   },
  //   {
  //     title: "Procedures (Post-Referral)",
  //     description: "Following urology assessment for an abnormal or symptomatic screen.",
  //     fields: [
  //       {
  //         name: "biopsyDone",
  //         label: "Biopsy done",
  //         type: "checkbox",
  //         colSpan: 2,
  //         showIf: (v) => v.treatmentReferral === "referred",
  //       },
  //       {
  //         name: "gleasonScore",
  //         label: "Gleason Score",
  //         type: "text",
  //         colSpan: 2,
  //         placeholder: "e.g. 3+4=7",
  //         showIf: (v) => v.treatmentReferral === "referred" && !!v.biopsyDone,
  //       },
  //     ],
  //   },
  // ],

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
        { name: "screeningDate", 
          label: "Screening Date", 
          type: "date", 
          // required: true, 
          colSpan: 1 },
        { name: "afpValue", label: "AFP Value (ng/mL)", type: "number", step: "0.1", colSpan: 1, showIf: (v) => v.method === "afp" },
        {
          name: "screeningResult",
          label: "Screening Result",
          type: "select",
          options: resultOptions,
          // required: true,
          colSpan: 1,
        },
      ],
    },
    {
      title: "Findings & Follow-up",
      fields: [
        { name: "lesionDetected", label: "Lesion detected", type: "checkbox", colSpan: 2, showIf: (v) => v.method === "uss" },
        // {
        //   name: "referral",
        //   label: "Referral",
        //   type: "select",
        //   colSpan: 2,
        //   options: [
        //     { value: "", label: "Select" },
        //     { value: "referred", label: "Referred" },
        //     { value: "not_referred", label: "Not Referred" },
        //   ],
        // },
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