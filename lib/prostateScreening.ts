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

/**
 * Warning symptoms — a symptomatic man exits routine screening.
 * "Urge incontinence" and "inability to hold urine" are the same symptom and are one field.
 */
export const PROSTATE_SYMPTOM_FIELDS = [
  "delayStartingUrination", "poorUrinaryStream", "frequentDayUrination", "nocturia",
  "incompleteEmptying", "bloodInUrine", "inabilityToPassUrine", "urgeIncontinence",
  "terminalDribbling",
] as const;

/** Conditions that can transiently raise PSA and should defer testing. */
export const PROSTATE_DEFERMENT_FIELDS = [
  "recentDre", "recentEjaculation", "recentUrinaryInfection", "recentCatheterisation",
  "recentVigorousExercise",
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
// International Prostate Symptom Score (I-PSS) — merged into the warning symptoms.
// Each warning symptom that has an I-PSS counterpart asks for its 0–5 score when answered "Yes".
// A "No" counts as 0. The total (0–35) is calculated once all seven questions are resolved.
// 0–7 mildly symptomatic · 8–19 moderately symptomatic · 20–35 severely symptomatic.
// ---------------------------------------------------------------------------
export const IPSS_ITEMS = [
  "ipssIncompleteEmptying",
  "ipssFrequency",
  "ipssIntermittency",
  "ipssUrgency",
  "ipssWeakStream",
  "ipssStraining",
  "ipssNocturia",
] as const;

type IpssItem = (typeof IPSS_ITEMS)[number];

/** Warning symptom → the I-PSS question(s) it carries. */
export const IPSS_SYMPTOM_LINKS: Record<string, IpssItem[]> = {
  delayStartingUrination: ["ipssStraining"],
  poorUrinaryStream: ["ipssWeakStream", "ipssIntermittency"],
  frequentDayUrination: ["ipssFrequency"],
  nocturia: ["ipssNocturia"],
  incompleteEmptying: ["ipssIncompleteEmptying"],
  urgeIncontinence: ["ipssUrgency"],
};

const symptomForItem = (item: IpssItem): string | undefined =>
  Object.keys(IPSS_SYMPTOM_LINKS).find((s) => IPSS_SYMPTOM_LINKS[s].includes(item));

export type IpssSeverity = "Mild" | "Moderate" | "Severe" | "";

export function ipssSeverityFor(score: number | null): IpssSeverity {
  if (score === null) return "";
  if (score <= 7) return "Mild";
  if (score <= 19) return "Moderate";
  return "Severe";
}

/**
 * "No" on a linked symptom scores 0; "Yes" uses the score entered; an unanswered symptom
 * (or a "Yes" with no score yet) leaves the total blank until it is completed.
 */
export function computeIpss(v: Record<string, any>): { score: string; severity: IpssSeverity } {
  const answers = IPSS_ITEMS.map((item) => {
    const sv = v[symptomForItem(item) as string];
    if (sv === "no") return 0;
    if (sv === "yes") return num(v[item]);
    return null;
  });
  const score = answers.every((a) => a !== null) ? (answers as number[]).reduce((s, a) => s + a, 0) : null;
  return { score: score === null ? "" : String(score), severity: ipssSeverityFor(score) };
}

/** Human-readable PSA band used for the recall schedule (Step 5) and referral trigger (Step 6). */
export function psaBandLabel(psa: number): string {
  if (psa < 1.0) return "Low (< 1.0 ng/mL)";
  if (psa <= 2.5) return "Intermediate (1.0–2.5 ng/mL)";
  if (psa < PSA_REFERRAL_THRESHOLD) return "Raised (> 2.5 ng/mL)";
  return "Elevated (≥ 3.0 ng/mL)";
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
  ipssScore: string;
  ipssSeverity: IpssSeverity;
  psaCategory: string;
  recallInterval: string;
};

/**
 * @param v            current prostate screening values
 * @param dateOfBirth  client's DOB (from biodata) — used for the 45 to <75 eligibility check
 */
export function computeProstateOutcome(v: Record<string, any>, dateOfBirth?: any): ProstateOutcome {
  const on = parseDate(v.screeningDate) ?? new Date();
  const age = ageOn(dateOfBirth ?? v.dateOfBirth, on);
  const ipss = computeIpss(v);

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
    ipssScore: ipss.score,
    ipssSeverity: ipss.severity,
    psaCategory: "",
    recallInterval: "",
    biopsyIndicated: "",
    biopsyIndicationReasons: "",
  };

  // Red-flag symptoms exit routine screening regardless of age.
  if (computeProstateSymptomatic(v)) {
    return {
      ...base,
      screeningPathway: "Symptomatic",
      screeningResult: "suspicious",
      recallInterval: "Specialist referral",
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

  // Step 3 — shared decision-making.
  // (Informed consent and counselling are auto-set to "yes" by prostatePatch and are not shown,
  //  so they no longer gate the outcome here.)
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
    psaCategory: effective === null ? "" : psaBandLabel(effective),
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
      recallInterval: "Urology referral",
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
      recallInterval: "Repeat PSA in 2 weeks",
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
    recallInterval: years === 1 ? "Annually" : `Every ${years} years`,
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
export function prostatePatch(current: Record<string, any>, dateOfBirth?: any): Record<string, any> | null {
  const out = computeProstateOutcome(current, dateOfBirth);
  const patch: Record<string, any> = {};
  (Object.keys(out) as (keyof ProstateOutcome)[]).forEach((k) => {
    if ((current[k] ?? "") !== out[k]) patch[k] = out[k];
  });

  // When "Book next screening" is ticked, pre-fill the appointment with the computed due date
  // (or the manual recall date for a deferred PSA). The nurse can still change it.
  const due = out.nextScreeningDate || current.recallDate || "";
  if (current.recallBookNow && !current.recallBookingDate && due) patch.recallBookingDate = due;

  // Informed consent and counselling are always recorded as "yes" and are not shown in the form.
  if (current.consentGiven !== "yes") patch.consentGiven = "yes";
  if (current.counsellingDone !== "yes") patch.counsellingDone = "yes";

  return Object.keys(patch).length ? patch : null;
}

// ---------------------------------------------------------------------------
// Field groups
// ---------------------------------------------------------------------------
const asymptomatic = (v: Record<string, any>) => v.screeningPathway === "Asymptomatic";
const proceeded = (v: Record<string, any>) =>
  asymptomatic(v) && v.sharedDecision === "proceed";
const eligibleForTest = (v: Record<string, any>) => proceeded(v) && v.psaEligibility === "Eligible";
const referred = (v: Record<string, any>) => v.treatmentReferral === "referred" && v.screeningPathway !== "Symptomatic";
const symptomYes = (name: string) => (v: Record<string, any>) => v[name] === "yes";
const anyIpssSymptom = (v: Record<string, any>) =>
  Object.keys(IPSS_SYMPTOM_LINKS).some((s) => v[s] === "yes");

const ipssFreqOptions = [
  { value: "", label: "Select" },
  { value: "0", label: "0 — Not at all" },
  { value: "1", label: "1 — Less than 1 time in 5" },
  { value: "2", label: "2 — Less than half the time" },
  { value: "3", label: "3 — About half the time" },
  { value: "4", label: "4 — More than half the time" },
  { value: "5", label: "5 — Almost always" },
];

const ipssNocturiaOptions = [
  { value: "", label: "Select" },
  { value: "0", label: "0 — None" },
  { value: "1", label: "1 — Once" },
  { value: "2", label: "2 — Twice" },
  { value: "3", label: "3 — 3 times" },
  { value: "4", label: "4 — 4 times" },
  { value: "5", label: "5 — 5 or more" },
];

const ipssQolOptions = [
  { value: "", label: "Select" },
  { value: "0", label: "0 — Delighted" },
  { value: "1", label: "1 — Pleased" },
  { value: "2", label: "2 — Mostly satisfied" },
  { value: "3", label: "3 — Mixed" },
  { value: "4", label: "4 — Mostly unhappy" },
  { value: "5", label: "5 — Unhappy" },
  { value: "6", label: "6 — Terrible" },
];

export const PROSTATE_GROUPS: FieldGroup[] = [
  {
    title: "Step 1 — Eligibility",
    description: "Routine PSA screening is for men aged 45 to under 75. Age is calculated from the date of birth.",
    fields: [
      { name: "ageAtScreening", label: "Age at Screening", type: "text", colSpan: 1, readOnly: true },
    ],
  },
  {
    title: "Warning Symptoms & I-PSS (Red-Flag Screen)",
    description:
      "A symptomatic man is not routed through routine screening — he exits to the clinical diagnostic / specialist pathway. For each urinary symptom answered Yes, score it on the I-PSS scale (0–5) over the past month. A No counts as 0.",
    fields: [
      // --- Symptoms that carry an I-PSS score ---
      { name: "delayStartingUrination", label: "Difficulty Initiating Urination", type: "select", options: yesNo, colSpan: 2 },
      {
        name: "ipssStraining", label: "I-PSS: Straining", type: "select", options: ipssFreqOptions, colSpan: 2,
        showIf: symptomYes("delayStartingUrination"),
        help: "Over the past month, how often have you had to push or strain to begin urination?",
      },
      { name: "poorUrinaryStream", label: "Weak / Interrupted Urinary Stream", type: "select", options: yesNo, colSpan: 2 },
      {
        name: "ipssWeakStream", label: "I-PSS: Weak Stream", type: "select", options: ipssFreqOptions, colSpan: 2,
        showIf: symptomYes("poorUrinaryStream"),
        help: "Over the past month, how often have you had a weak urinary stream?",
      },
      {
        name: "ipssIntermittency", label: "I-PSS: Intermittency", type: "select", options: ipssFreqOptions, colSpan: 2,
        showIf: symptomYes("poorUrinaryStream"),
        help: "Over the past month, how often have you found you stopped and started again several times when you urinated?",
      },
      { name: "frequentDayUrination", label: "Increased Urinary Frequency (Day)", type: "select", options: yesNo, colSpan: 2 },
      {
        name: "ipssFrequency", label: "I-PSS: Frequency", type: "select", options: ipssFreqOptions, colSpan: 2,
        showIf: symptomYes("frequentDayUrination"),
        help: "Over the past month, how often have you had to urinate again less than two hours after you finished urinating?",
      },
      { name: "nocturia", label: "Frequent Urination at Night", type: "select", options: yesNo, colSpan: 2 },
      {
        name: "ipssNocturia", label: "I-PSS: Nocturia", type: "select", options: ipssNocturiaOptions, colSpan: 2,
        showIf: symptomYes("nocturia"),
        help: "Over the past month, how many times did you most typically get up each night to urinate, from the time you went to bed until you got up in the morning?",
      },
      { name: "incompleteEmptying", label: "Feeling of Incomplete Bladder Emptying", type: "select", options: yesNo, colSpan: 2 },
      {
        name: "ipssIncompleteEmptying", label: "I-PSS: Incomplete Emptying", type: "select", options: ipssFreqOptions, colSpan: 2,
        showIf: symptomYes("incompleteEmptying"),
        help: "Over the past month, how often have you had a sensation of not emptying your bladder completely after you finish urinating?",
      },
      { name: "urgeIncontinence", label: "Urge Incontinence / Inability to Hold Urine", type: "select", options: yesNo, colSpan: 2 },
      {
        name: "ipssUrgency", label: "I-PSS: Urgency", type: "select", options: ipssFreqOptions, colSpan: 2,
        showIf: symptomYes("urgeIncontinence"),
        help: "Over the past month, how often have you found it difficult to postpone urination?",
      },

      // --- Other red flags (no I-PSS counterpart) ---
      { name: "bloodInUrine", label: "Blood in Urine", type: "select", options: yesNo, colSpan: 1 },
      { name: "inabilityToPassUrine", label: "Inability to Pass Urine", type: "select", options: yesNo, colSpan: 1 },
      { name: "terminalDribbling", label: "Terminal Dribbling", type: "select", options: yesNo, colSpan: 1 },

      // --- I-PSS summary ---
      {
        name: "ipssScore", label: "Total I-PSS Score (0–35)", type: "text", colSpan: 1, readOnly: true,
        showIf: anyIpssSymptom,
        help: "Auto-calculated once every urinary symptom above is answered and each Yes is scored.",
      },
      {
        name: "ipssSeverity", label: "Symptom Severity", type: "text", colSpan: 1, readOnly: true,
        showIf: anyIpssSymptom,
        help: "0–7 mild · 8–19 moderate · 20–35 severe.",
      },
      {
        name: "ipssQualityOfLife", label: "Quality of Life Due to Urinary Symptoms", type: "select", options: ipssQolOptions, colSpan: 2,
        showIf: anyIpssSymptom,
        help: "If you were to spend the rest of your life with your urinary condition just the way it is now, how would you feel about that?",
      },
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
    title: "Step 3 — Shared Decision-Making",
    description: "A formal consultation must be completed before testing.",
    fields: [
      {
        name: "sharedDecision",
        label: "Shared Decision (Formal Consultation)",
        type: "select",
        colSpan: 2,
        showIf: asymptomatic,
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
      { name: "recentUrinaryInfection", label: "Active Urinary Tract Infection", type: "select", options: yesNo, colSpan: 1, showIf: proceeded },
      { name: "recentCatheterisation", label: "Recent Catheterisation", type: "select", options: yesNo, colSpan: 1, showIf: proceeded },
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
    title: "Result & Recall (Steps 5–6)",
    description:
      "Guide — PSA < 1.0: every 5 years · 1.0–2.5: every 2 years · > 2.5: annually · ≥ 3.0 (confirmed on repeat), abnormal DRE or rapid rise: urology referral. These fields fill in automatically once the PSA is entered under Step 4.",
    fields: [
      { name: "screeningDate", label: "Screening Date", type: "date", colSpan: 1 },
      { name: "screeningResult", label: "Screening Result", type: "text", colSpan: 1, readOnly: true, help: "Auto-derived — not editable." },
      { name: "psaCategory", label: "PSA Category", type: "text", colSpan: 1, readOnly: true, showIf: (v) => !!v.psaCategory },
      { name: "recallInterval", label: "Recall Interval", type: "text", colSpan: 1, readOnly: true, showIf: (v) => !!v.recallInterval },
      { name: "treatmentReferral", label: "Urology Referral", type: "text", colSpan: 1, readOnly: true },
      { name: "nextScreeningDate", label: "Next Screening / Repeat PSA Due", type: "date", colSpan: 1, readOnly: true, showIf: (v) => !!v.nextScreeningDate },
      { name: "recommendedAction", label: "Recommended Action", type: "textarea", colSpan: 2, readOnly: true },
    ],
  },
  {
    title: "Book Next Screening",
    description: "Books the repeat PSA or the next routine screening. The date is pre-filled from the schedule above.",
    fields: [
      {
        name: "recallBookNow",
        label: "Book next screening / repeat PSA",
        type: "checkbox",
        colSpan: 2,
        showIf: (v) => proceeded(v) && (!!v.nextScreeningDate || (v.psaEligibility === "Deferred" && !!v.recallDate)),
      },
      { name: "recallBookingDate", label: "Appointment Date", type: "date", colSpan: 1, showIf: (v) => !!v.recallBookNow },
      {
        name: "recallBookingFacilityId",
        label: "Facility",
        type: "select",
        colSpan: 1,
        options: [], // injected at render time
        showIf: (v) => !!v.recallBookNow,
      },
      { name: "recallBookingNotes", label: "Booking Notes", type: "textarea", colSpan: 2, placeholder: "Any instructions for the appointment", showIf: (v) => !!v.recallBookNow },
    ],
  },
  {
    title: "Book Urology Appointment",
    description: "Shown when the client is referred to urology.",
    fields: [
      { name: "urologyBookNow", label: "Book urology appointment", type: "checkbox", colSpan: 2, showIf: (v) => v.treatmentReferral === "referred" },
      { name: "urologyBookingDate", label: "Appointment Date", type: "date", colSpan: 1, showIf: (v) => !!v.urologyBookNow },
      {
        name: "urologyBookingFacilityId",
        label: "Urology Facility",
        type: "select",
        colSpan: 1,
        options: [], // injected at render time
        showIf: (v) => !!v.urologyBookNow,
      },
      { name: "urologyBookingNotes", label: "Referral Notes", type: "textarea", colSpan: 2, placeholder: "Reason for referral and any findings to pass on", showIf: (v) => !!v.urologyBookNow },
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