// Cervical risk profile (form §4) and client screening history (form §5).
// Posted to the existing /clients/{id}/risk-profile endpoint alongside the shared risk fields.
// Type-only import → no runtime circular dependency with screeningWizardConfig.
import type { FieldGroup } from "./screeningWizardConfig";

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/** Symptom checkboxes that make a client "Symptomatic". */
export const CERVICAL_SYMPTOM_FIELDS = [
  "symptomAbnormalBleeding",
  "symptomPostCoitalBleeding",
  "symptomPelvicPain",
  "symptomDischarge",
  "symptomOther",
] as const;

const BOOLEAN_FIELDS = new Set<string>([
  ...CERVICAL_SYMPTOM_FIELDS,
  "symptomNone",
  "prevCervicalTestHpv",
  "prevCervicalTestVia",
  "prevCervicalTestPap",
  "prevCervicalTestColposcopy",
  "prevCervicalTestOther",
]);

const DATE_FIELDS = new Set<string>(["lastMenstrualPeriod", "prevCervicalScreeningDate"]);

/** Every risk-profile column added for the cervical form (used to hydrate a returning client). */
export const CERVICAL_RISK_FIELDS = [
  "hivArtStatus",
  "hpvVaccination",
  "lastMenstrualPeriod",
  "pregnancyStatus",
  "menopausalStatus",
  // Sexual & reproductive history (moved here from the cervical screening step)
  "previousMarriage",
  "numberOfPreviousMarriages",
  "numberOfSexualPartners",
  "moreThanOnePartner",
  "ageAtFirstIntercourse",
  "numberOfChildbirths",
  "contraceptiveUse",
  ...CERVICAL_SYMPTOM_FIELDS,
  "symptomOtherDetail",
  "symptomNone",
  "symptomStatus",
  "prevCervicalScreened",
  "prevCervicalScreeningDate",
  "prevCervicalTestHpv",
  "prevCervicalTestVia",
  "prevCervicalTestPap",
  "prevCervicalTestColposcopy",
  "prevCervicalTestOther",
  "prevCervicalTestOtherDetail",
  "prevCervicalResult",
  "prevCervicalTreated",
  "prevCervicalTreatmentType",
] as const;

/** Maps a saved risk profile onto form state (booleans → true/false, dates → yyyy-mm-dd, else ""). */
export function hydrateCervicalRisk(rp: Record<string, any> | null | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of CERVICAL_RISK_FIELDS) {
    const v = rp?.[k];
    if (BOOLEAN_FIELDS.has(k)) out[k] = !!v;
    else if (DATE_FIELDS.has(k)) out[k] = v ? String(v).split("T")[0] : "";
    else out[k] = v ?? "";
  }
  return out;
}

/**
 * Derives the symptomatic / asymptomatic summary from the symptom checklist.
 * Returns the fields to merge into state, or null when nothing changed.
 * A ticked symptom un-ticks "None" (the two can't both be true).
 */
export function cervicalRiskPatch(risk: Record<string, any>): Record<string, any> | null {
  const anySymptom = CERVICAL_SYMPTOM_FIELDS.some((f) => !!risk[f]);
  const patch: Record<string, any> = {};

  if (anySymptom && risk.symptomNone) patch.symptomNone = false;

  const status = anySymptom ? "Symptomatic" : risk.symptomNone ? "Asymptomatic" : "";
  if ((risk.symptomStatus ?? "") !== status) patch.symptomStatus = status;

  return Object.keys(patch).length ? patch : null;
}

const prevScreened = (v: Record<string, any>) => v.prevCervicalScreened === "yes";
const prevAbnormal = (v: Record<string, any>) =>
  prevScreened(v) && ["positive_precancer", "suspected_cancer"].includes(v.prevCervicalResult);

/**
 * Append to the shared risk groups when cervical is being screened and the client is female.
 *
 * NOTE: `moreThanOnePartner` is no longer a form field; it is derived from `numberOfSexualPartners`
 * when saving. It stays in CERVICAL_RISK_FIELDS so older saved values still hydrate.
 */
export const CERVICAL_RISK_GROUPS: FieldGroup[] = [
  {
    title: "Cervical Risk Profile",
    fields: [
      {
        name: "hivArtStatus",
        label: "HIV Treatment Status",
        type: "select",
        colSpan: 1,
        showIf: (v) => v.hivStatus === "positive",
        options: [
          { value: "", label: "Select" },
          { value: "on_art", label: "Positive, on ART" },
          { value: "not_on_art", label: "Positive, not on ART" },
        ],
        help: "Shown when HIV status is Positive.",
      },
      { name: "hpvVaccination", label: "HPV Vaccination", type: "select", options: yesNo, colSpan: 1 },
      { name: "lastMenstrualPeriod", label: "Date of Last Menstrual Period", type: "date", colSpan: 1 },
      {
        name: "pregnancyStatus",
        label: "Pregnancy Status",
        type: "select",
        colSpan: 1,
        options: [
          { value: "", label: "Select" },
          { value: "pregnant", label: "Pregnant" },
          { value: "not_pregnant", label: "Not pregnant" },
          { value: "tbd", label: "To be determined" },
        ],
      },
      {
        name: "menopausalStatus",
        label: "Menopausal Status",
        type: "select",
        colSpan: 1,
        options: [
          { value: "", label: "Select" },
          { value: "pre", label: "Pre-menopausal" },
          { value: "peri", label: "Peri-menopausal" },
          { value: "post", label: "Post-menopausal" },
        ],
      },
    ],
  },
  {
    title: "Sexual & Reproductive History",
    fields: [
      { name: "previousMarriage", label: "Any previous marriage?", type: "select", options: yesNo, colSpan: 1 },
      {
        name: "numberOfPreviousMarriages",
        label: "How many previous marriages?",
        type: "number",
        min: 1,
        colSpan: 1,
        showIf: (v) => v.previousMarriage === "yes",
      },
      {
        name: "numberOfSexualPartners",
        label: "How many sexual partners?",
        type: "number",
        min: 0,
        colSpan: 1,
        // "More than 1 sexual partner" is not asked separately: it is derived from this count
        // when the risk profile is saved (see buildRiskPayload / persistRisk).
      },
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
    title: "Symptoms Identified",
    description: "Tick all that apply, or tick None. Untick symptoms first if you need to select None.",
    fields: [
      { name: "symptomAbnormalBleeding", label: "Abnormal vaginal bleeding", type: "checkbox", colSpan: 1 },
      { name: "symptomPostCoitalBleeding", label: "Bleeding after sexual intercourse", type: "checkbox", colSpan: 1 },
      { name: "symptomPelvicPain", label: "Pelvic / lower abdominal pain", type: "checkbox", colSpan: 1 },
      { name: "symptomDischarge", label: "Unusual or foul-smelling vaginal discharge", type: "checkbox", colSpan: 1 },
      { name: "symptomOther", label: "Other concerning symptom", type: "checkbox", colSpan: 1 },
      { name: "symptomNone", label: "None", type: "checkbox", colSpan: 1 },
      { name: "symptomOtherDetail", label: "Other Symptom (specify)", type: "text", colSpan: 2, showIf: (v) => !!v.symptomOther },
      {
        name: "symptomStatus",
        label: "Symptom Summary",
        type: "text",
        colSpan: 2,
        readOnly: true,
        help: "Auto-derived: any symptom ticked = Symptomatic; None ticked = Asymptomatic.",
      },
    ],
  },
  {
    title: "Cervical Screening History",
    fields: [
      { name: "prevCervicalScreened", label: "Previously Screened for Cervical Cancer", type: "select", options: yesNo, colSpan: 1 },
      { name: "prevCervicalScreeningDate", label: "Date of Previous Screening", type: "date", colSpan: 1, showIf: prevScreened },
      { name: "prevCervicalTestHpv", label: "Previous test: HPV", type: "checkbox", colSpan: 1, showIf: prevScreened },
      { name: "prevCervicalTestVia", label: "Previous test: VIA", type: "checkbox", colSpan: 1, showIf: prevScreened },
      { name: "prevCervicalTestPap", label: "Previous test: Pap / Cytology", type: "checkbox", colSpan: 1, showIf: prevScreened },
      { name: "prevCervicalTestColposcopy", label: "Previous test: Colposcopy", type: "checkbox", colSpan: 1, showIf: prevScreened },
      { name: "prevCervicalTestOther", label: "Previous test: Other", type: "checkbox", colSpan: 1, showIf: prevScreened },
      { name: "prevCervicalTestOtherDetail", label: "Other Test (specify)", type: "text", colSpan: 2, showIf: (v) => prevScreened(v) && !!v.prevCervicalTestOther },
      {
        name: "prevCervicalResult",
        label: "Previous Result",
        type: "select",
        colSpan: 2,
        showIf: prevScreened,
        options: [
          { value: "", label: "Select" },
          { value: "negative", label: "Negative" },
          { value: "positive_precancer", label: "Positive / precancer" },
          { value: "suspected_cancer", label: "Suspected cancer" },
          { value: "unknown", label: "Unknown / results unavailable" },
        ],
      },
      {
        name: "prevCervicalTreated",
        label: "If Previously Positive, Treatment Performed",
        type: "select",
        colSpan: 1,
        showIf: prevAbnormal,
        options: [
          { value: "", label: "Select" },
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "unknown", label: "Unknown" },
        ],
      },
      {
        name: "prevCervicalTreatmentType",
        label: "Previous Treatment",
        type: "select",
        colSpan: 1,
        showIf: (v) => prevAbnormal(v) && v.prevCervicalTreated === "yes",
        options: [
          { value: "", label: "Select" },
          { value: "cryotherapy", label: "Cryotherapy" },
          { value: "thermal_ablation", label: "Thermal ablation" },
          { value: "excision_leep", label: "Excision / LEEP" },
          { value: "unknown", label: "Unknown" },
        ],
      },
    ],
  },
];