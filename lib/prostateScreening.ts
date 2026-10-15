// Prostate screening module — implements the national protocol:
//  1 Eligibility (men 45 to <75)      2 Informed consent & counselling
//  3 Shared decision-making           4 Primary tests (PSA ± DRE)
//  5 Recall intervals                 6 Immediate urology referral
//  7 Secondary risk assessment + biopsy indications
//
// Pure logic + field config. Only TYPE imports from the main config, so there is no runtime
// circular dependency (screeningWizardConfig imports PROSTATE_GROUPS from here).
import type { FieldGroup } from "./screeningWizardConfig";

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

// ---------------------------------------------------------------------------
// Protocol constants — change here if the guideline changes
// ---------------------------------------------------------------------------
export const PROSTATE_MIN_AGE = 45;
export const PROSTATE_MAX_AGE_EXCLUSIVE = 75;
export const PSA_REFERRAL_THRESHOLD = 3.0; // ng/mL — trigger for further evaluation / urology referral
export const PSA_BIOPSY_THRESHOLD = 4.0; // ng/mL — traditional biopsy threshold
export const PSA_REPEAT_MIN_DAYS = 14; // repeat PSA must be >= 2 weeks after the first
export const PSAD_THRESHOLD = 0.15; // ng/mL per cc
export const PSAV_THRESHOLD = 0.75; // ng/mL per year
export const PSAV_MIN_INTERVAL_DAYS = 365; // velocity only meaningful over 12–24 months

/** Warning symptoms — a symptomatic man exits routine screening. */
export const PROSTATE_SYMPTOM_FIELDS = [
  "delayStartingUrination", "poorUrinaryStream", "frequentDayUrination", "nocturia",
  "incompleteEmptying", "bloodInUrine", "inabilityToPassUrine", "urgeIncontinence",
  "inabilityToHoldUrine", "terminalDribbling", "bonePainHipBack", "unexplainedWeightLoss",
] as const;

/** Conditions that can transiently raise PSA and should defer testing. */
export const PROSTATE_DEFERMENT_FIELDS = [
  "recentDre", "recentEjaculation", "recentUrinaryInfection", "recentVigorousExercise",
] as const;

export function computeProstateSymptomatic(v: Record<string, any>): boolean {
  return PROSTATE_SYMPTOM_FIELDS.some((f) => v[f] === "yes");
}
export function computeProstatePsaDeferred(v: Record<string, any>): boolean {
  return PROSTATE_DEFERMENT_FIELDS.some((f) => v[f] === "yes");
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const num = (x: any): number | null => {
  if (x === undefined || x === null || x === "") return null;
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : null;
};
const parseDate = (s: any): Date | null => {
  if (!s) return null;
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addYears = (d: Date, n: number) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };

export function ageOn(dob: any, on: Date): number | null {
  const b = parseDate(dob);
  if (!b) return null;
  let age = on.getFullYear() - b.getFullYear();
  const beforeBirthday =
    on.getMonth() < b.getMonth() || (on.getMonth() === b.getMonth() && on.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Decision logic
// ---------------------------------------------------------------------------
export type ProstateOutcome = {
  screeningPathway: "Symptomatic" | "Asymptomatic" | "Not Eligible";
  psaEligibility: "Eligible" | "Deferred" | "Not Eligible" | "Pending Consent" | "";
  screeningResult: "suspicious" | "non_suspicious" | "";
  treatmentReferral: "referred" | "not_referred" | "";
  recommendedAction: string;
  ageAtScreening: string;
  dreResult: "positive" | "negative" | "";
  nextScreeningDate: string;
  psaVelocity: string;
  psaDensity: string;
  biopsyIndicated: "yes" | "no" | "";
  biopsyIndicationReasons: string;
};

/**
 * @param v            current prostate screening values
 * @param dateOfBirth  client's DOB (from biodata) — used for the 45 to <75 eligibility check
 */
export function computeProstateOutcome(v: Record<string, any>, dateOfBirth?: any): ProstateOutcome {
  const on = parseDate(v.screeningDate) ?? new Date();
  const age = ageOn(dateOfBirth ?? v.dateOfBirth, on);

  const base: ProstateOutcome = {
    screeningPathway: "Asymptomatic",
    psaEligibility: "",
    screeningResult: "",
    treatmentReferral: "not_referred",
    recommendedAction: "",
    ageAtScreening: age === null ? "" : String(age),
    dreResult: "",
    nextScreeningDate: "",
    psaVelocity: "",
    psaDensity: "",
    biopsyIndicated: "",
    biopsyIndicationReasons: "",
  };

  // Red-flag symptoms exit routine screening regardless of age.
  if (computeProstateSymptomatic(v)) {
    return {
      ...base,
      screeningPathway: "Symptomatic",
      screeningResult: "suspicious",
      treatmentReferral: "referred",
      recommendedAction:
        "Symptomatic — exit routine screening. Refer to the clinical diagnostic / specialist pathway.",
    };
  }

  // Step 1 — eligibility: men 45 to <75
  if (age === null || age < PROSTATE_MIN_AGE || age >= PROSTATE_MAX_AGE_EXCLUSIVE) {
    return {
      ...base,
      screeningPathway: "Not Eligible",
      psaEligibility: "Not Eligible",
      recommendedAction:
        age === null
          ? "Age could not be determined — enter the client's date of birth. Routine PSA screening is for men 45 to under 75."
          : `Age ${age} — outside the routine screening range (45 to under 75). Do not proceed with routine PSA screening.`,
    };
  }

  // Steps 2–3 — informed consent, counselling, shared decision-making
  if (v.consentGiven !== "yes" || v.counsellingDone !== "yes") {
    return {
      ...base,
      psaEligibility: "Pending Consent",
      recommendedAction: "Obtain informed consent and complete counselling before any testing.",
    };
  }
  if (v.sharedDecision !== "proceed") {
    return {
      ...base,
      psaEligibility: "Pending Consent",
      recommendedAction:
        v.sharedDecision === "declined"
          ? "Client declined PSA screening after shared decision-making. Document and offer to revisit at the next visit."
          : "Complete the formal consultation (shared decision-making) and record the client's decision.",
    };
  }

  // Transient PSA-raising conditions
  if (computeProstatePsaDeferred(v)) {
    return {
      ...base,
      psaEligibility: "Deferred",
      recommendedAction:
        "PSA deferred — a condition present can transiently raise PSA. Manage the condition and recall for PSA testing.",
    };
  }

  const eligible: ProstateOutcome = { ...base, psaEligibility: "Eligible" };

  // Step 4 — primary tests
  const psa1 = num(v.psaLevel);
  const psa2 = num(v.repeatPsaLevel);
  const d1 = parseDate(v.psaTestDate) ?? on;
  const d2 = parseDate(v.repeatPsaDate);
  const repeatGap = d2 ? daysBetween(d1, d2) : null;
  const repeatValid = psa2 !== null && repeatGap !== null && repeatGap >= PSA_REPEAT_MIN_DAYS;
  const repeatRejected = psa2 !== null && !repeatValid;
  const effective = repeatValid ? psa2 : psa1;

  const dreFinding: string = v.dreFinding || "";
  const dreAbnormal = ["nodularity", "induration", "asymmetry"].includes(dreFinding);
  const dreResult: ProstateOutcome["dreResult"] = dreFinding ? (dreAbnormal ? "positive" : "negative") : "";

  // PSA velocity (needs a prior PSA >= 12 months earlier)
  const prev = num(v.previousPsaLevel);
  const prevDate = parseDate(v.previousPsaDate);
  let psav: number | null = null;
  if (effective !== null && prev !== null && prevDate) {
    const gap = daysBetween(prevDate, repeatValid && d2 ? d2 : d1);
    if (gap >= PSAV_MIN_INTERVAL_DAYS) psav = (effective - prev) / (gap / 365.25);
  }
  const rapidRise = psav !== null && psav > PSAV_THRESHOLD;

  // PSA density
  const vol = num(v.prostateVolumeCc);
  const psad = effective !== null && vol !== null && vol > 0 ? effective / vol : null;
  const freePsa = num(v.freePsaPercent);

  const derived = {
    dreResult,
    psaVelocity: psav === null ? "" : psav.toFixed(2),
    psaDensity: psad === null ? "" : psad.toFixed(3),
  };

  // Step 6 — immediate urology referral triggers
  const reasons: string[] = [];
  if (dreAbnormal) reasons.push(`abnormal DRE (${dreFinding})`);
  if (repeatValid && psa2 !== null && psa2 >= PSA_REFERRAL_THRESHOLD)
    reasons.push(`PSA ${psa2} ng/mL, confirmed on repeat ≥2 weeks later`);
  if (rapidRise) reasons.push(`rapid PSA rise (${psav!.toFixed(2)} ng/mL/year)`);

  if (reasons.length) {
    // Step 7 — secondary risk assessment & biopsy indications
    const adverse =
      (psad !== null && psad > PSAD_THRESHOLD) ||
      (effective !== null && effective >= PSA_BIOPSY_THRESHOLD && effective <= 10 && freePsa !== null && freePsa < 10) ||
      rapidRise;
    const secondaryEntered = psad !== null || freePsa !== null || psav !== null;
    const persistentAboveBx =
      repeatValid && (psa1 ?? 0) >= PSA_BIOPSY_THRESHOLD && (psa2 ?? 0) >= PSA_BIOPSY_THRESHOLD;

    const bx: string[] = [];
    if (persistentAboveBx && ((effective ?? 0) > 10 || adverse))
      bx.push("persistently elevated PSA above biopsy threshold after risk stratification");
    if (dreAbnormal) bx.push("abnormal DRE suggestive of malignancy");
    if (v.mpMriResult === "suspicious") bx.push("suspicious lesion on mpMRI");
    if (v.priorNegativeBiopsy === "yes" && v.highClinicalSuspicion === "yes")
      bx.push("high clinical suspicion despite prior negative biopsy");

    const biopsyIndicated: ProstateOutcome["biopsyIndicated"] = bx.length
      ? "yes"
      : secondaryEntered || v.mpMriResult === "negative"
      ? "no"
      : "";

    return {
      ...eligible,
      ...derived,
      screeningResult: "suspicious",
      treatmentReferral: "referred",
      biopsyIndicated,
      biopsyIndicationReasons: bx.join("; "),
      recommendedAction:
        `Immediate urology referral — ${reasons.join("; ")}. ` +
        (biopsyIndicated === "yes"
          ? "Biopsy indicated."
          : "Complete the secondary risk assessment (PSAD, % free PSA, PSAV, mpMRI) before any biopsy decision."),
    };
  }

  // Step 4B — PSA >= 3.0 needs a repeat >= 2 weeks later before referral
  if (!repeatValid && psa1 !== null && psa1 >= PSA_REFERRAL_THRESHOLD) {
    const due = addDays(d1, PSA_REPEAT_MIN_DAYS);
    return {
      ...eligible,
      ...derived,
      nextScreeningDate: iso(due),
      recommendedAction:
        `PSA ${psa1} ng/mL (≥3.0) — repeat PSA at least 2 weeks after the first test (on or after ${iso(due)}) before referral.` +
        (repeatRejected ? " The repeat entered was not accepted: it must be dated ≥2 weeks after the first PSA." : ""),
    };
  }

  if (effective === null) {
    return {
      ...eligible,
      ...derived,
      recommendedAction: "Eligible for PSA testing — enter the PSA level (± DRE) to classify the screen.",
    };
  }

  // Step 5 — recall interval
  const years = effective < 1.0 ? 5 : effective <= 2.5 ? 2 : 1;
  const band = effective < 1.0 ? "< 1.0" : effective <= 2.5 ? "1.0–2.5" : "> 2.5";
  return {
    ...eligible,
    ...derived,
    screeningResult: "non_suspicious",
    nextScreeningDate: iso(addYears(d1, years)),
    recommendedAction:
      `PSA ${effective} ng/mL (${band} ng/mL), DRE not abnormal — repeat screening ` +
      (years === 1 ? "annually" : `every ${years} years`) +
      (psa1 !== null && psa1 >= PSA_REFERRAL_THRESHOLD ? ". Initial PSA was ≥3.0 but the valid repeat was below 3.0." : "."),
  };
}

/**
 * Returns the derived fields to merge into state, or null when nothing changed.
 * Both wizard pages call this from their prostate useEffect.
 */
export function prostatePatch(current: Record<string, any>, dateOfBirth?: any): ProstateOutcome | null {
  const out = computeProstateOutcome(current, dateOfBirth);
  const changed = (Object.keys(out) as (keyof ProstateOutcome)[]).some((k) => (current[k] ?? "") !== out[k]);
  return changed ? out : null;
}

// ---------------------------------------------------------------------------
// Field groups
// ---------------------------------------------------------------------------
const asymptomatic = (v: Record<string, any>) => v.screeningPathway === "Asymptomatic";
const proceeded = (v: Record<string, any>) =>
  asymptomatic(v) && v.consentGiven === "yes" && v.counsellingDone === "yes" && v.sharedDecision === "proceed";
const eligibleForTest = (v: Record<string, any>) => proceeded(v) && v.psaEligibility === "Eligible";
const referred = (v: Record<string, any>) => v.treatmentReferral === "referred" && v.screeningPathway !== "Symptomatic";

export const PROSTATE_GROUPS: FieldGroup[] = [
  {
    title: "Step 1 — Eligibility",
    description: "Routine PSA screening is for men aged 45 to under 75. Age is calculated from the date of birth.",
    fields: [
      { name: "ageAtScreening", label: "Age at Screening", type: "text", colSpan: 1, readOnly: true },
    ],
  },
  {
    title: "Warning Symptoms (Red-Flag Screen)",
    description:
      "A symptomatic man is not routed through routine screening — he exits to the clinical diagnostic / specialist pathway.",
    fields: [
      { name: "delayStartingUrination", label: "Difficulty Initiating Urination", type: "select", options: yesNo, colSpan: 1 },
      { name: "poorUrinaryStream", label: "Weak / Interrupted Urinary Stream", type: "select", options: yesNo, colSpan: 1 },
      { name: "frequentDayUrination", label: "Increased Urinary Frequency (Day)", type: "select", options: yesNo, colSpan: 1 },
      { name: "nocturia", label: "Frequent Urination at Night", type: "select", options: yesNo, colSpan: 1 },
      { name: "incompleteEmptying", label: "Feeling of Incomplete Bladder Emptying", type: "select", options: yesNo, colSpan: 1 },
      { name: "bloodInUrine", label: "Blood in Urine", type: "select", options: yesNo, colSpan: 1 },
      { name: "inabilityToPassUrine", label: "Inability to Pass Urine", type: "select", options: yesNo, colSpan: 1 },
      { name: "urgeIncontinence", label: "Urge Incontinence", type: "select", options: yesNo, colSpan: 1 },
      { name: "inabilityToHoldUrine", label: "Inability to Hold Urine", type: "select", options: yesNo, colSpan: 1 },
      { name: "terminalDribbling", label: "Terminal Dribbling", type: "select", options: yesNo, colSpan: 1 },
      { name: "bonePainHipBack", label: "Persistent Bone, Hip or Back Pain", type: "select", options: yesNo, colSpan: 1 },
      { name: "unexplainedWeightLoss", label: "Unexplained Weight Loss", type: "select", options: yesNo, colSpan: 1 },
      {
        name: "screeningPathway",
        label: "Screening Pathway",
        type: "text",
        colSpan: 2,
        readOnly: true,
        help: "Auto-determined from age and the symptom checklist. Symptomatic → clinical diagnostic / specialist referral. Not Eligible → outside 45 to <75.",
      },
    ],
  },
  {
    title: "Steps 2–3 — Consent, Counselling & Shared Decision-Making",
    description: "Informed consent and counselling, then a formal consultation, must be completed before testing.",
    fields: [
      { name: "consentGiven", label: "Informed Consent Obtained", type: "select", options: yesNo, colSpan: 1, showIf: asymptomatic },
      { name: "counsellingDone", label: "Counselling Provided", type: "select", options: yesNo, colSpan: 1, showIf: asymptomatic },
      {
        name: "sharedDecision",
        label: "Shared Decision (Formal Consultation)",
        type: "select",
        colSpan: 2,
        showIf: (v) => asymptomatic(v) && v.consentGiven === "yes" && v.counsellingDone === "yes",
        options: [
          { value: "", label: "Select" },
          { value: "proceed", label: "Client chooses to proceed with PSA screening" },
          { value: "declined", label: "Client declines screening" },
        ],
      },
    ],
  },
  {
    title: "PSA Testing Eligibility",
    description: "Certain recent events can transiently raise PSA and should defer testing.",
    fields: [
      { name: "recentDre", label: "DRE / Prostate Massage in Last 48 Hours", type: "select", options: yesNo, colSpan: 1, showIf: proceeded },
      { name: "recentEjaculation", label: "Ejaculation in Last 48 Hours", type: "select", options: yesNo, colSpan: 1, showIf: proceeded },
      { name: "recentUrinaryInfection", label: "Active Urinary Infection / Recent Catheterisation", type: "select", options: yesNo, colSpan: 1, showIf: proceeded },
      { name: "recentVigorousExercise", label: "Vigorous Exercise / Cycling in Last 48 Hours", type: "select", options: yesNo, colSpan: 1, showIf: proceeded },
      { name: "psaEligibility", label: "PSA Eligibility", type: "text", colSpan: 1, readOnly: true, showIf: proceeded, help: "Auto-determined." },
      {
        name: "recallDate",
        label: "Recall / Repeat PSA Date",
        type: "date",
        colSpan: 1,
        showIf: (v) => proceeded(v) && v.psaEligibility === "Deferred",
        help: "PSA deferred — manage the condition and recall for testing.",
      },
    ],
  },
  {
    title: "Step 4 — Primary Screening Tests",
    description:
      "PSA ≥ 3.0 ng/mL triggers further evaluation (traditional biopsy threshold 4.0). A raised PSA must be repeated at least 2 weeks later before referral. DRE is performed by a trained specialist (tertiary level).",
    fields: [
      { name: "psaTestDate", label: "PSA Test Date", type: "date", colSpan: 1, showIf: eligibleForTest },
      { name: "psaLevel", label: "PSA Level (ng/mL)", type: "number", step: "0.01", min: 0, colSpan: 1, showIf: eligibleForTest },
      {
        name: "repeatPsaDate",
        label: "Repeat PSA Date",
        type: "date",
        colSpan: 1,
        showIf: (v) => eligibleForTest(v) && (parseFloat(v.psaLevel) >= PSA_REFERRAL_THRESHOLD || !!v.repeatPsaLevel),
        help: "Must be at least 2 weeks after the first PSA.",
      },
      {
        name: "repeatPsaLevel",
        label: "Repeat PSA Level (ng/mL)",
        type: "number",
        step: "0.01",
        min: 0,
        colSpan: 1,
        showIf: (v) => eligibleForTest(v) && (parseFloat(v.psaLevel) >= PSA_REFERRAL_THRESHOLD || !!v.repeatPsaLevel),
      },
      {
        name: "dreFinding",
        label: "DRE Finding",
        type: "select",
        colSpan: 2,
        showIf: eligibleForTest,
        options: [
          { value: "", label: "Not done / Select" },
          { value: "normal", label: "Normal" },
          { value: "nodularity", label: "Nodularity" },
          { value: "induration", label: "Induration" },
          { value: "asymmetry", label: "Asymmetry" },
          { value: "equivocal", label: "Equivocal" },
        ],
        help: "Nodularity, induration or asymmetry = abnormal → immediate urology referral.",
      },
      { name: "previousPsaLevel", label: "Previous PSA (ng/mL, if any)", type: "number", step: "0.01", min: 0, colSpan: 1, showIf: eligibleForTest, help: "Used for PSA velocity (needs ≥12 months between tests)." },
      { name: "previousPsaDate", label: "Previous PSA Date", type: "date", colSpan: 1, showIf: eligibleForTest },
    ],
  },
  {
    title: "Result, Recall & Referral (Steps 5–6)",
    description: "PSA <1.0: every 5 years · 1.0–2.5: every 2 years · >2.5: annually · ≥3.0 (confirmed), abnormal DRE or rapid rise: urology referral.",
    fields: [
      { name: "screeningDate", label: "Screening Date", type: "date", colSpan: 1 },
      { name: "ipssScore", label: "IPSS Score (0-35)", type: "number", min: 0, max: 35, colSpan: 1 },
      { name: "screeningResult", label: "Screening Result", type: "text", colSpan: 1, readOnly: true, help: "Auto-derived — not editable." },
      { name: "treatmentReferral", label: "Urology Referral", type: "text", colSpan: 1, readOnly: true },
      { name: "nextScreeningDate", label: "Next Screening / Repeat PSA Due", type: "date", colSpan: 2, readOnly: true, showIf: (v) => !!v.nextScreeningDate },
      { name: "recommendedAction", label: "Recommended Action", type: "textarea", colSpan: 2, readOnly: true },
    ],
  },
  {
    title: "Step 7 — Secondary Risk Assessment (Before Biopsy)",
    description:
      "For referred clients, especially PSA 4–10 with a non-suspicious or equivocal DRE, or after a negative biopsy.",
    fields: [
      { name: "prostateVolumeCc", label: "Prostate Volume (cc, from ultrasound)", type: "number", step: "0.1", min: 0, colSpan: 1, showIf: referred },
      { name: "psaDensity", label: "PSA Density (ng/mL/cc)", type: "text", colSpan: 1, readOnly: true, showIf: referred, help: "PSA ÷ prostate volume. Threshold > 0.15." },
      { name: "freePsaPercent", label: "% Free PSA", type: "number", step: "0.1", min: 0, max: 100, colSpan: 1, showIf: referred, help: "At PSA 4–10: <10% strongly suggests cancer; >25% suggests BPH." },
      { name: "psaVelocity", label: "PSA Velocity (ng/mL/year)", type: "text", colSpan: 1, readOnly: true, showIf: referred, help: "Auto-calculated from previous PSA (≥12 months apart). Rise > 0.75/yr is significant; interpret with 2–3 measurements over 12–24 months." },
      {
        name: "mpMriResult",
        label: "Multiparametric MRI",
        type: "select",
        colSpan: 1,
        showIf: referred,
        options: [
          { value: "", label: "Select" },
          { value: "not_done", label: "Not done / not accessible" },
          { value: "negative", label: "No suspicious lesion" },
          { value: "suspicious", label: "Suspicious lesion" },
        ],
        help: "Recommended where accessible, esp. persistent PSA elevation after a negative biopsy.",
      },
      { name: "priorNegativeBiopsy", label: "Prior Negative Biopsy", type: "select", options: yesNo, colSpan: 1, showIf: referred },
      { name: "highClinicalSuspicion", label: "High Clinical Suspicion Despite Prior Negative Biopsy", type: "select", options: yesNo, colSpan: 1, showIf: (v) => referred(v) && v.priorNegativeBiopsy === "yes" },
      { name: "biopsyIndicated", label: "Biopsy Indicated", type: "text", colSpan: 1, readOnly: true, showIf: referred },
      { name: "biopsyIndicationReasons", label: "Biopsy Indication(s)", type: "textarea", colSpan: 2, readOnly: true, showIf: (v) => referred(v) && !!v.biopsyIndicationReasons },
    ],
  },
  {
    title: "Procedures (Post-Referral)",
    description: "Following urology assessment.",
    fields: [
      { name: "biopsyDone", label: "Biopsy done", type: "checkbox", colSpan: 2, showIf: (v) => v.treatmentReferral === "referred" },
      { name: "gleasonScore", label: "Gleason Score", type: "text", colSpan: 2, placeholder: "e.g. 3+4=7", showIf: (v) => v.treatmentReferral === "referred" && !!v.biopsyDone },
    ],
  },
];