import catalog from "./screeningTests.json";

export type Severity = "normal" | "abnormal" | "urgent" | "neutral";
export type ResultOption = { value: string; label: string; severity: Severity };
export type ExtraField = {
  name: string;
  label: string;
  type: "select" | "text" | "number";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  /** Values of this field that make the whole result inconclusive (e.g. an invalid machine run). */
  inconclusiveWhen?: string[];
};

export type ScreeningTest = {
  key: string;
  cancerType: string;
  label: string;
  refPrefix: string;
  kind: "specimen" | "procedure";
  sex: "female" | "male" | "any";
  specimenTypes?: string[];
  collectionMethods?: { value: string; label: string }[];
  results: ResultOption[];
  value?: { label: string; unit: string; min: number; max: number; bands: { below?: number; result: string }[] };
  extraFields?: ExtraField[];
  detail?: { name: string; label: string; requiredFor: string[]; options: { value: string; label: string }[] };
};

export const CANCER_TYPES: { value: string; label: string }[] = catalog.cancerTypes;
export const TESTS: ScreeningTest[] = catalog.tests as ScreeningTest[];

export const testsFor = (cancerType: string) => TESTS.filter((t) => t.cancerType === cancerType);
export const findTest = (key?: string) => TESTS.find((t) => t.key === key);
export const cancerName = (v: string) => CANCER_TYPES.find((c) => c.value === v)?.label ?? v;

/** "Date sample taken" for lab specimens, "Date test performed" for imaging / visual / endoscopy. */
export const collectDateLabel = (t: ScreeningTest) => (t.kind === "procedure" ? "Date test performed" : "Date sample taken");
export const collectNoun = (t: ScreeningTest) => (t.kind === "procedure" ? "test" : "sample");

/** Same banding the server applies (PSA, AFP). */
export function deriveResult(t: ScreeningTest, value: number): string | null {
  if (!t.value || Number.isNaN(value)) return null;
  for (const b of t.value.bands) {
    if (b.below === undefined || value < b.below) return b.result;
  }
  return null;
}

export const resultLabel = (t: ScreeningTest | undefined, result?: string | null) =>
  t?.results.find((r) => r.value === result)?.label ?? result ?? "";

import { isLowRiskType } from "./hpvRisk";

const ABLATION_GENOTYPES = ["16", "18", "35", "45", "grp_16_18", "grp_both"];

/** True when a machine-run field (e.g. Run status = Invalid) makes the result inconclusive. */
export function inconclusiveRun(t: ScreeningTest, meta?: Record<string, any> | null): boolean {
  return !!t.extraFields?.some((f) => f.inconclusiveWhen && meta && f.inconclusiveWhen.includes(String(meta[f.name] ?? "")));
}

/** Plain-language next step shown after a result is saved. */
export function nextStep(
  t: ScreeningTest,
  result: string,
  detail?: string | null,
  meta?: Record<string, any> | null
): { tone: "ok" | "warn" | "info"; text: string } {
  const severity = t.results.find((r) => r.value === result)?.severity ?? "neutral";

  if (inconclusiveRun(t, meta)) {
    return {
      tone: "info",
      text: "The machine run was not valid (the internal control did not pass). No result can be given. Repeat the test on a fresh sample or extract and record the new run.",
    };
  }

  if (t.key === "hpv_dna" && result === "positive") {
    if (detail === "grp_other_hr") {
      return {
        tone: "warn",
        text: "Positive for HPV 31/33/35/45/52/58. This test cannot tell 35/45 apart from the rest of the group, so continue to colposcopy booking in the clinical screening.",
      };
    }
    if (isLowRiskType(detail)) {
      return {
        tone: "info",
        text: `HPV ${detail} is a low-risk (non-oncogenic) type. It does not need colposcopy or ablation. Counsel the client and re-screen at the routine interval.`,
      };
    }
    const label = detail === "grp_16_18" || detail === "grp_both" ? "HPV 16/18" : `HPV ${detail}`;
    return ABLATION_GENOTYPES.includes(detail || "")
      ? { tone: "warn", text: `${label} is positive. Continue to ablation eligibility in the clinical screening.` }
      : { tone: "warn", text: "Positive for another high-risk genotype. Continue to colposcopy booking in the clinical screening." };
  }
  if (severity === "urgent") {
    return {
      tone: "warn",
      text: "Suspicious or malignant finding. Arrange urgent diagnostic evaluation or referral (Stage 3) and tell the client promptly.",
    };
  }
  if (severity === "abnormal") {
    return {
      tone: "warn",
      text: "Abnormal result. Continue in the clinical screening to plan the next test, follow-up or referral.",
    };
  }
  if (severity === "neutral") {
    return { tone: "info", text: "The result is not conclusive. A repeat sample or test is usually needed; record a new one from the Collect tab." };
  }
  return { tone: "ok", text: "Normal result. Record it and follow routine re-screening guidance." };
}
