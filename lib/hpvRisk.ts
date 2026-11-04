/**
 * HPV level (risk category) for a positive Truenat HPV-HR Plus result.
 *
 * The machine reports a category (HPV-HR 16/18 or HPV-HR 31/33/35/45/52/58) and a viral load concentration (Very low / Low / Medium / High).
 * All eight genotypes are high-risk types. The concentration is read from the printout.
 */
export type HpvRisk = "very_low" | "low" | "medium" | "high";

export const HPV_RISK_OPTIONS: { value: HpvRisk; label: string; hint: string }[] = [
  { value: "very_low", label: "Very low", hint: "Very low viral load" },
  { value: "low", label: "Low", hint: "Low viral load" },
  { value: "medium", label: "Medium", hint: "Medium viral load" },
  { value: "high", label: "High", hint: "High viral load" },
];

/** Truenat HPV-HR Plus cannot name the genotype, so one category is recorded. Codes match the catalog options. */
export const HPV_TRUENAT_CATEGORIES = [
  { value: "16_18", label: "HPV-HR 16/18", code: "grp_16_18" },
  { value: "31_33_35_45_52_58", label: "HPV-HR 31/33/35/45/52/58", code: "grp_other_hr" },
  { value: "other", label: "Others", code: "other" },
] as const;

/** Genotype/group code saved with the result for the chosen Truenat category. */
export const hpvGroupCode = (meta?: Record<string, any> | null): string =>
  HPV_TRUENAT_CATEGORIES.find((c) => c.value === meta?.hrCategory)?.code ?? "";

export const VIRAL_LOAD_LABEL = "Viral load concentration";

/** "Very low" / "Low" / "Medium" / "High". */
export const hpvRiskLabel = (v?: string | null) => HPV_RISK_OPTIONS.find((x) => x.value === v)?.label ?? "";
