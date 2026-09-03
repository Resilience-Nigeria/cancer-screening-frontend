export interface CervicalScreeningPayload {
  method: "via" | "pap" | "hpv";
  screeningDate: string;
  result: "negative" | "positive" | "suspicious";
  hpvResult?: string;
  hpvGenotype?: string;
  colposcopyDone: boolean;
  biopsyDone: boolean;
  biopsyResult?: "positive" | "negative";
  treatmentProvided: boolean;
  referralCompleted: boolean;
}

export interface BreastScreeningPayload {
  method: "cbe" | "mammography" | "uss";
  screeningDate: string;
  biradsScore?: string;
  breastDensity?: string;
  biopsyDone: boolean;
  histologyResult?: "negative" | "positive";
  referralOutcome?: "referred" | "not_referred";
}

export interface ColorectalScreeningPayload {
  method: "fit" | "fobt" | "colonoscopy";
  screeningDate: string;
  result: "negative" | "positive" | "suspicious";
  polypDetected: boolean;
  histologyResult?: "negative" | "positive";
  treatmentReferral?: "referred" | "not_referred";
}

export interface LiverScreeningPayload {
  hbvStatus: "positive" | "negative";
  hcvStatus: "positive" | "negative";
  method: "uss" | "afp";
  afpValue?: number;
  lesionDetected: boolean;
  treatmentReferral?: "referred" | "not_referred";
}

/**
 * Prostate screening payload — implements the National Prostate Cancer
 * Screening Algorithm:
 *   1. Warning-symptom checklist decides the screening pathway.
 *   2. Asymptomatic clients pass a PSA-deferment eligibility check.
 *   3. PSA/DRE thresholds (or the symptom check, or a deferred PSA)
 *      determine `result` and `treatmentReferral` automatically —
 *      these are computed client-side (see
 *      lib/screeningWizardConfig#computeProstateOutcome) and should be
 *      treated as read-only/derived rather than freely editable.
 */
export interface ProstateScreeningPayload {
  screeningDate?: string;

  // Warning symptoms (red-flag screen) — any "yes" routes the client to
  // the clinical diagnostic / specialist pathway instead of routine screening.
  poorUrinaryStream?: "yes" | "no";
  delayStartingUrination?: "yes" | "no";
  frequentDayUrination?: "yes" | "no";
  nocturia?: "yes" | "no";
  incompleteEmptying?: "yes" | "no";
  bloodInUrine?: "yes" | "no";
  inabilityToPassUrine?: "yes" | "no";
  urgeIncontinence?: "yes" | "no";
  inabilityToHoldUrine?: "yes" | "no";
  terminalDribbling?: "yes" | "no";
  bonePainHipBack?: "yes" | "no";
  unexplainedWeightLoss?: "yes" | "no";

  /** Auto-derived from the symptom checklist above. */
  screeningPathway?: "Symptomatic" | "Asymptomatic";

  // PSA-deferment conditions — checked for asymptomatic clients only.
  recentDre?: "yes" | "no";
  recentEjaculation?: "yes" | "no";
  recentUrinaryInfection?: "yes" | "no";
  recentVigorousExercise?: "yes" | "no";

  /** Auto-derived from the deferment conditions above. */
  psaEligibility?: "Eligible" | "Deferred";
  /** Recall / repeat PSA date, set when psaEligibility is "Deferred". */
  recallDate?: string;

  psaLevel?: number;
  dreResult?: "positive" | "negative";
  ipssScore?: number;

  /** Auto-derived: symptomatic, PSA > 3, or DRE suspicious → "suspicious". */
  result: "negative" | "positive" | "suspicious" | "non_suspicious";
  /** Human-readable summary of the pathway/threshold that produced `result`. */
  recommendedAction?: string;

  biopsyDone: boolean;
  gleasonScore?: string;
  /** Auto-derived: automatic urology referral when `result` is "suspicious". */
  treatmentReferral?: "referred" | "not_referred";
}

export interface OutcomePayload {
  cancerConfirmed: boolean;
  cancerType?: string;
  stageAtDiagnosis?: string;
  diagnosisDate?: string;
  linkageToTreatment: boolean;
  treatmentFacility?: string;
  treatmentInitiated?: string;
  treatmentCompleted: boolean;
  treatmentOutcome?:
    | "complete_remission"
    | "partial_remission"
    | "stable_disease"
    | "progressive_disease";
  followUpStatus?:
    | "disease_free"
    | "recurrence"
    | "long_term_survival_with_chronic_disease"
    | "treatment_related_complications";
}