// Central configuration for the guided screening wizard.
// Everything that changes per cancer type lives here, so the wizard UI stays generic.

export type CancerType =
  | "cervical"
  | "breast"
  | "prostate"
  | "colorectal"
  | "liver";

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
  { value: "prostate", label: "Prostate", gender: "male", blurb: "PSA, DRE and IPSS" },
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


export function getRiskGroups(cancer: CancerType): FieldGroup[] {
  const basicGroup: FieldGroup =
    cancer === "breast"
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
    resultDateGroup({
      name: "method",
      label: "Method",
      type: "select",
      required: true,
      colSpan: 1,
      options: [
        { value: "via", label: "VIA" },
        { value: "pap", label: "Pap Smear" },
        { value: "hpv", label: "HPV" },
      ],
    }),
    {
      title: "HPV",
      description: "Only relevant when the screening method is HPV.",
      fields: [
        {
          name: "hpvResult",
          label: "HPV Result",
          type: "select",
          colSpan: 1,
          showIf: (v) => v.method === "hpv",
          options: [
            { value: "", label: "Select" },
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ],
        },
        {
          name: "hpvGenotype",
          label: "HPV Genotype",
          type: "text",
          colSpan: 1,
          placeholder: "e.g. 16, 18",
          showIf: (v) => v.method === "hpv",
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
        // { name: "treatmentProvided", label: "Treatment provided", type: "checkbox", colSpan: 1 },
        // { name: "referralCompleted", label: "Referral completed", type: "checkbox", colSpan: 1 },
      ],
    },
  ],

//   breast: [
//     resultDateGroup({
//       name: "method",
//       label: "Method",
//       type: "select",
//       required: true,
//       colSpan: 1,
//       options: [
//         { value: "cbe", label: "Clinical Breast Exam (CBE)" },
//         { value: "mammography", label: "Mammography" },
//         { value: "ultrasound", label: "Ultrasound" },
//       ],
//     }),

//     {
//   title: "Imaging Findings",
//   description: "BI-RADS category and breast density (from mammography / ultrasound).",
//   fields: [
//     {
//       name: "biradsScore",
//       label: "BI-RADS Score",
//       type: "select",
//       colSpan: 1,
//       options: [
//         { value: "", label: "Select" },
//         { value: "0", label: "BI-RADS 0 — Incomplete" },
//         { value: "1", label: "BI-RADS 1 — Negative" },
//         { value: "2", label: "BI-RADS 2 — Benign" },
//         { value: "3", label: "BI-RADS 3 — Probably Benign" },
//         { value: "4", label: "BI-RADS 4 — Suspicious" },
//         { value: "5", label: "BI-RADS 5 — Highly Suggestive of Malignancy" },
//         { value: "6", label: "BI-RADS 6 — Known Malignancy" },
//       ],
//       showIf: (v) => v.method === "mammography" || v.method === "ultrasound"
//     },
//     {
//       name: "breastDensity",
//       label: "Breast Density (ACR)",
//       type: "select",
//       colSpan: 1,
//       options: [
//         { value: "", label: "Select" },
//         { value: "a", label: "A — Almost entirely fatty" },
//         { value: "b", label: "B — Scattered fibroglandular" },
//         { value: "c", label: "C — Heterogeneously dense" },
//         { value: "d", label: "D — Extremely dense" },
//       ],
//       showIf: (v) => v.method === "mammography" || v.method === "ultrasound"
//     },
//   ],
// },

//     {
//       title: "Breast Health History & Symptoms",
//       fields: [
//         { name: "breastfeedingHistory", label: "Breastfeeding History", type: "select", options: yesNo, colSpan: 1 },
//         {
//           name: "breastfeedingDuration",
//           label: "Breastfeeding Duration (months)",
//           type: "number",
//           min: 0,
//           colSpan: 1,
//           showIf: (v) => v.breastfeedingHistory === "yes",
//         },
//         {
//           name: "breastLumps",
//           label: "Breast Lumps",
//           type: "select",
//           colSpan: 1,
//           options: [
//             { value: "", label: "Select" },
//             { value: "current", label: "Current" },
//             { value: "previous", label: "Previous" },
//             { value: "none", label: "None" },
//           ],
//         },
//         { name: "breastNippleDischarge", label: "Breast/Nipple Discharge", type: "select", options: yesNo, colSpan: 1 },
//         {
//           name: "dischargeType",
//           label: "Discharge Type",
//           type: "select",
//           colSpan: 2,
//           showIf: (v) => v.breastNippleDischarge === "yes",
//           options: [
//             { value: "", label: "Select type" },
//             { value: "bloody", label: "Bloody" },
//             { value: "clear", label: "Clear" },
//             { value: "milky", label: "Milky" },
//             { value: "purulent", label: "Purulent" },
//             { value: "others", label: "Others" },
//           ],
//         },
//         { name: "skinChanges", label: "Skin Appearance Changes", type: "select", options: yesNo, colSpan: 1 },
//         { name: "breastPain", label: "Breast Pain", type: "select", options: yesNo, colSpan: 1 },
//         { name: "previousBreastSurgery", label: "Previous Breast Surgery", type: "select", options: yesNo, colSpan: 1 },
//         { name: "previousBiopsy", label: "Previous Biopsy", type: "select", options: yesNo, colSpan: 1 },
//         { name: "ageAtFirstMenstruation", label: "Age at First Menstruation", type: "number", min: 0, max: 30, colSpan: 1 },
//         { name: "ageAtMenopause", label: "Age at Menopause (if applicable)", type: "number", min: 0, max: 100, colSpan: 1 },
//       ],
//     },
//     {
//       title: "Procedures & Follow-up",
//       fields: [
//         { name: "biopsyDone", label: "Biopsy done", type: "checkbox", colSpan: 1 },
//         // { name: "referralCompleted", label: "Referral completed", type: "checkbox", colSpan: 1 },
//         {
//           name: "biopsyResult",
//           label: "Biopsy Result",
//           type: "select",
//           colSpan: 2,
//           showIf: (v) => !!v.biopsyDone,
//           options: [
//             { value: "", label: "Select" },
//             { value: "positive", label: "Positive" },
//             { value: "negative", label: "Negative" },
//           ],
//         },

//           {
//           name: "treatmentReferral",
//           label: "Treatment Referral",
//           type: "select",
//           colSpan: 1,
//           options: [
//             { value: "", label: "Select" },
//             { value: "referred", label: "Referred" },
//             { value: "not_referred", label: "Not Referred" },
//           ],
//         },

//       ],
//     },
//   ],


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

  {
    title: "Screening Details",
    fields: [
      // Multi-select via checkboxes — rendered specially by the wizard
      // Primary method still sent as `method`; all selections as `screeningMethods`
      {
        name: "screeningDate",
        label: "Screening Date",
        type: "date",
        required: true,
        colSpan: 1,
      },
      {
        name: "screeningResult",
        label: "Screening Result",
        type: "select",
        options: resultOptions,
        required: true,
        colSpan: 1,
      },
    ],
  },

  {
    title: "CBE Findings — Left & Right",
    description: "Document each breast independently during the clinical exam.",
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
    ],
  },

  {
    title: "Imaging Findings",
    description: "BI-RADS category, breast density, and overall finding — recorded per side (from mammography / ultrasound).",
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
    title: "Breast Health History & Symptoms",
    fields: [
      {
        name: "breastLumps",
        label: "Breast Lumps",
        type: "select",
        colSpan: 1,
        options: [
          { value: "", label: "Select" },
          { value: "current", label: "Current" },
          { value: "previous", label: "Previous" },
          { value: "none", label: "None" },
        ],
      },
      { name: "breastNippleDischarge", label: "Breast/Nipple Discharge", type: "select", options: yesNo, colSpan: 1 },
      {
        name: "dischargeType",
        label: "Discharge Type",
        type: "select",
        colSpan: 2,
        showIf: (v) => v.breastNippleDischarge === "yes",
        options: [
          { value: "", label: "Select type" },
          { value: "bloody", label: "Bloody" },
          { value: "clear", label: "Clear" },
          { value: "milky", label: "Milky" },
          { value: "purulent", label: "Purulent" },
          { value: "others", label: "Others" },
        ],
      },
      { name: "skinChanges", label: "Skin Appearance Changes", type: "select", options: yesNo, colSpan: 1 },
      { name: "breastPain", label: "Breast Pain", type: "select", options: yesNo, colSpan: 1 },
      { name: "previousBiopsy", label: "Previous Biopsy", type: "select", options: yesNo, colSpan: 1 },
    ],
  },

  {
  title: "Procedures & Follow-up",
  fields: [
    // Biopsy done this visit — only if no previous biopsy
    {
      name: "biopsyDone",
      label: "Biopsy done (this visit)",
      type: "checkbox",
      colSpan: 1,
      showIf: (v) => v.previousBiopsy !== "yes",
    },
    {
      name: "biopsyResult",
      label: "Biopsy Result",
      type: "select",
      colSpan: 1,
      showIf: (v) => !!v.biopsyDone && v.previousBiopsy !== "yes",
      options: [
        { value: "", label: "Select result" },
        { value: "positive", label: "Positive" },
        { value: "negative", label: "Negative" },
      ],
    },

    // Previous biopsy = yes → collect that existing result
    {
      name: "previousBiopsyResult",
      label: "Previous Biopsy Result",
      type: "select",
      colSpan: 1,
      showIf: (v) => v.previousBiopsy === "yes",
      options: [
        { value: "", label: "Select result" },
        { value: "positive", label: "Positive" },
        { value: "negative", label: "Negative" },
        { value: "inconclusive", label: "Inconclusive" },
        { value: "unknown", label: "Unknown" },
      ],
    },

    // Standardized histology classification — drives the automated
    // IHC prompt / referral trigger (see BreastScreeningController).
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

    // Previous biopsy = no → checkbox to book
    {
      name: "biopsyBookNow",
      label: "Book biopsy now",
      type: "checkbox",
      colSpan: 2,
      showIf: (v) => v.previousBiopsy === "no" && !v.biopsyDone,
    },

    // Booking form — only when book now is checked
    {
      name: "biopsyBookingDate",
      label: "Biopsy Appointment Date",
      type: "date",
      colSpan: 1,
      showIf: (v) => v.previousBiopsy === "no" && !!v.biopsyBookNow,
    },
    {
      name: "biopsyBookingFacilityId",
      label: "Facility",
      type: "select",
      colSpan: 1,
      // Options injected at render time from the facilities list — see note below
      options: [],
      showIf: (v) => v.previousBiopsy === "no" && !!v.biopsyBookNow,
    },
    {
      name: "biopsyBookingNotes",
      label: "Booking Notes",
      type: "textarea",
      colSpan: 2,
      placeholder: "Any instructions or referral details",
      showIf: (v) => v.previousBiopsy === "no" && !!v.biopsyBookNow,
    },

    // Treatment referral — only when result is suspicious
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

  prostate: [
    {
      title: "Screening Details",
      fields: [
        { name: "screeningDate", label: "Screening Date", type: "date", required: true, colSpan: 1 },
        {
          name: "screeningResult",
          label: "Screening Result",
          type: "select",
          options: resultOptions,
          required: true,
          colSpan: 1,
        },
        { name: "psaLevel", label: "PSA Level (ng/mL)", type: "number", step: "0.01", colSpan: 1 },
        {
          name: "dreResult",
          label: "DRE Result",
          type: "select",
          colSpan: 1,
          options: [
            { value: "", label: "Select" },
            { value: "negative", label: "Normal (Negative)" },
            { value: "positive", label: "Abnormal (Positive)" },
          ],
        },
        { name: "ipssScore", label: "IPSS Score (0-35)", type: "number", min: 0, max: 35, colSpan: 1 },
        // {
        //   name: "referral",
        //   label: "Referral",
        //   type: "select",
        //   colSpan: 1,
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
    {
      title: "Urinary Symptoms",
      fields: [
        { name: "poorUrinaryStream", label: "Poor / Weak Urinary Stream", type: "select", options: yesNo, colSpan: 1 },
        { name: "urgeIncontinence", label: "Urge Incontinence", type: "select", options: yesNo, colSpan: 1 },
        { name: "delayStartingUrination", label: "Delay Starting Urination", type: "select", options: yesNo, colSpan: 1 },
        { name: "inabilityToHoldUrine", label: "Inability to Hold Urine", type: "select", options: yesNo, colSpan: 1 },
        { name: "terminalDribbling", label: "Terminal Dribbling", type: "select", options: yesNo, colSpan: 1 },
        { name: "frequentDayUrination", label: "Frequent Urination (Day)", type: "select", options: yesNo, colSpan: 1 },
        { name: "nocturia", label: "Nocturia (Night)", type: "select", options: yesNo, colSpan: 1 },
        { name: "incompleteEmptying", label: "Incomplete Bladder Emptying", type: "select", options: yesNo, colSpan: 1 },
        { name: "bloodInUrine", label: "Blood in Urine", type: "select", options: yesNo, colSpan: 1 },
      ],
    },
    {
      title: "Procedures",
      fields: [
        { name: "biopsyDone", label: "Biopsy done", type: "checkbox", colSpan: 2 },
        {
          name: "gleasonScore",
          label: "Gleason Score",
          type: "text",
          colSpan: 2,
          placeholder: "e.g. 3+4=7",
          showIf: (v) => !!v.biopsyDone,
        },
      ],
    },
  ],

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
        { name: "screeningDate", label: "Screening Date", type: "date", required: true, colSpan: 1 },
        { name: "afpValue", label: "AFP Value (ng/mL)", type: "number", step: "0.1", colSpan: 1, showIf: (v) => v.method === "afp" },
        {
          name: "screeningResult",
          label: "Screening Result",
          type: "select",
          options: resultOptions,
          required: true,
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