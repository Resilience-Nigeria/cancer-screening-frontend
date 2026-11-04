/**
 * HPV risk category shown next to the genotype on a positive HPV result.
 *
 * Based on the standard oncogenic classification (WHO / IARC Group 1) and the usual cervical-screening
 * triage tiers:
 *   High   - HPV 16, 18 and 45 (the types behind most cervical cancers), and Truenat group results that contain them
 *   Medium - the other oncogenic types: 31, 33, 35, 39, 51, 52, 56, 58, 59, 68, 73, 82 and the probable 26, 53, 66
 *   Low    - non-oncogenic types (for example 6, 11, 40, 42, 43, 44, 54, 61, 72, 81)
 * Low - non-oncogenic types: 6, 11, 40, 42, 43, 44, 54, 61, 70, 72, 81, 89
 * The value is a suggestion; the clinician can change it.
 */
export type HpvRisk = "low" | "medium" | "high";

export const HPV_RISK_OPTIONS: { value: HpvRisk; label: string; hint: string }[] = [
  { value: "low", label: "Low risk", hint: "Non-oncogenic HPV type" },
  { value: "medium", label: "Medium risk", hint: "Other oncogenic type (31, 33, 35, 39, 51, 52, 56, 58, 59, 68, 73, 82, 26, 53, 66)" },
  { value: "high", label: "High risk", hint: "HPV 16, 18 or 45" },
];

export const HIGH_RISK_TYPES = ["16", "18", "45"];
// Other oncogenic types (Munoz et al., NEJM 2003: 31 33 35 39 51 52 56 58 59 68 73 82) plus the probable ones (26 53 66)
export const MEDIUM_RISK_TYPES = ["31", "33", "35", "39", "51", "52", "56", "58", "59", "68", "73", "82", "26", "53", "66"];
// Non-oncogenic types
export const LOW_RISK_TYPES = ["6", "11", "40", "42", "43", "44", "54", "61", "70", "72", "81", "89"];

const HIGH = [...HIGH_RISK_TYPES, "grp_16_18", "grp_both"];
const MEDIUM = MEDIUM_RISK_TYPES;
const LOW = LOW_RISK_TYPES;

/** True for a genotype that is not oncogenic: no colposcopy or ablation pathway is needed. */
export const isLowRiskType = (g?: string | null) => LOW_RISK_TYPES.includes(String(g ?? "").trim());

/** Suggested category for a genotype, or "" when it cannot be decided (for example "Other"). */
export function suggestHpvRisk(genotype?: string | null): HpvRisk | "" {
  const g = String(genotype ?? "").trim();
  if (HIGH.includes(g)) return "high";
  if (MEDIUM.includes(g)) return "medium";
  if (LOW.includes(g)) return "low";
  if (g.startsWith("grp_")) return "medium";   // any other Truenat group of high-risk types
  return "";
}

export const hpvRiskLabel = (v?: string | null) => HPV_RISK_OPTIONS.find((o) => o.value === v)?.label ?? "";

export const hpvRiskTone: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-700",
};
