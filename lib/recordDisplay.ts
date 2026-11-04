import type { FieldGroup, WizardField } from "./screeningWizardConfig";

// Keys that are plumbing, not clinical data.
const HIDDEN_KEY = /(^id$|Id$|_id$|At$|_at$|^created|^updated|^deleted|Json$|_json$)/;

export const isEmpty = (v: any) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** "ageAtFirstIntercourse" / "age_at_first_intercourse" -> "Age at first intercourse" */
export function humanize(key: string): string {
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function prettyDate(v: any): string {
  const s = String(v).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const YES_NO: Record<string, string> = { yes: "Yes", no: "No", true: "Yes", false: "No", "1": "Yes", "0": "No" };

/** Human text for a stored value, using the field's option labels when it has them. */
export function displayValue(value: any, field?: WizardField): string {
  if (Array.isArray(value)) {
    return value.map((v) => displayValue(v, field && { ...field, type: "select" })).join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  const opt = field?.options?.find((o) => String(o.value) === str);
  if (opt) return opt.label;
  if (field?.type === "checkbox") return YES_NO[str] ?? str;
  if (field?.type === "date" || /^\d{4}-\d{2}-\d{2}(T|$)/.test(str)) return prettyDate(str);
  if (YES_NO[str.toLowerCase()] && (!field || field.type === "select")) return YES_NO[str.toLowerCase()];
  return str.replace(/_/g, " ");
}

export type ViewSection = { title?: string; items: { label: string; value: string }[] };

/**
 * Turns config field groups + stored data into display sections, keeping only answered fields.
 * Anything stored that the groups don't describe is returned as a final "Other details" section
 * (when includeOther is true), so nothing that was collected is hidden.
 */
export function buildSections(
  groups: FieldGroup[],
  data: Record<string, any> | null | undefined,
  opts: { includeOther?: boolean; skip?: string[] } = {}
): ViewSection[] {
  if (!data) return [];
  const seen = new Set<string>(opts.skip ?? []);
  const sections: ViewSection[] = [];

  for (const g of groups) {
    const items: ViewSection["items"] = [];
    for (const f of g.fields) {
      if (seen.has(f.name)) continue;
      seen.add(f.name);
      const v = data[f.name];
      if (isEmpty(v) || v === false) continue;
      items.push({ label: f.label, value: f.type === "checkbox" ? "Yes" : displayValue(v, f) });
    }
    if (items.length) sections.push({ title: g.title, items });
  }

  if (opts.includeOther) {
    const items: ViewSection["items"] = [];
    for (const [k, v] of Object.entries(data)) {
      if (seen.has(k) || HIDDEN_KEY.test(k) || isEmpty(v) || v === false || typeof v === "object") continue;
      items.push({ label: humanize(k), value: displayValue(v) });
    }
    if (items.length) sections.push({ title: "Other details", items });
  }
  return sections;
}
