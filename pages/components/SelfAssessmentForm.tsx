"use client";
import React, { useMemo, useState } from "react";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

type Gender = "male" | "female";

export type AssessmentResult = {
  assessmentId: string | number;
  riskCategory: "low" | "average" | "increased" | "symptomatic_high";
  recommendation: string;
  flaggedReasons: string[];
  suggestedCancerTypes: string[];
  facility: {
    facilityName: string;
    facilityAddress?: string;
    navigatorName?: string;
    navigatorPhone?: string;
    clinicHoursDisplay?: string;
  } | null;
};

type FamilyHistoryEntry = { cancerType: string; relation: string; ageAtDiagnosis: string };

type Answers = {
  age: string;

  smoker: string;
  cigarettesPerDay: string;
  smokingYears: string;
  alcohol: string;
  exerciseDaysPerWeek: string;

  medicalHistory: string[];
  familyHistory: FamilyHistoryEntry[];
  symptoms: string[];

  ageAtMenarche: string;
  stillMenstruating: string;
  ageAtMenopause: string;
  pregnancies: string;
  ageAtFirstChildbirth: string;
  breastfeedingHistory: string;
  hpvVaccinated: string;
  papSmearEver: string;
  papSmearResult: string;

  urinaryDifficulty: string;
  weakStream: string;
  nocturia: string;
  bloodInSemen: string;

  infections: string[];
  exposures: string[];
};

const emptyAnswers: Answers = {
  age: "",
  smoker: "",
  cigarettesPerDay: "",
  smokingYears: "",
  alcohol: "",
  exerciseDaysPerWeek: "",
  medicalHistory: [],
  familyHistory: [],
  symptoms: [],
  ageAtMenarche: "",
  stillMenstruating: "",
  ageAtMenopause: "",
  pregnancies: "",
  ageAtFirstChildbirth: "",
  breastfeedingHistory: "",
  hpvVaccinated: "",
  papSmearEver: "",
  papSmearResult: "",
  urinaryDifficulty: "",
  weakStream: "",
  nocturia: "",
  bloodInSemen: "",
  infections: [],
  exposures: [],
};

const SYMPTOM_GROUPS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: "General",
    items: [
      { key: "unexplained_weight_loss", label: "Unexplained weight loss" },
      { key: "persistent_fatigue", label: "Persistent fatigue" },
      { key: "night_sweats", label: "Night sweats" },
      { key: "persistent_fever", label: "Persistent fever" },
    ],
  },
  {
    title: "Breast Changes (applies to everyone — men can get breast cancer too)",
    items: [
      { key: "lump_breast", label: "Lump in breast" },
      { key: "nipple_discharge", label: "Nipple discharge" },
      { key: "breast_skin_changes", label: "Skin changes on the breast (dimpling, puckering, redness)" },
    ],
  },
  {
    title: "Other Lumps",
    items: [
      { key: "lump_neck", label: "Lump in neck" },
      { key: "lump_underarm", label: "Lump under arm" },
      { key: "lump_groin", label: "Lump in groin" },
      { key: "lump_elsewhere", label: "Lump elsewhere" },
    ],
  },
  {
    title: "Bleeding",
    items: [
      { key: "blood_in_stool", label: "Blood in stool" },
      { key: "blood_in_urine", label: "Blood in urine" },
      { key: "vaginal_bleeding_after_menopause", label: "Vaginal bleeding after menopause" },
      { key: "bleeding_after_sex", label: "Bleeding after sex" },
    ],
  },
  {
    title: "Pain (lasting over 3 weeks)",
    items: [
      { key: "pain_breast", label: "Breast pain" },
      { key: "pain_abdomen", label: "Abdominal pain" },
      { key: "pain_back", label: "Back pain" },
    ],
  },
  {
    title: "Digestive & Urinary",
    items: [
      { key: "change_in_bowel_habit", label: "Change in bowel habit" },
      { key: "persistent_diarrhoea", label: "Persistent diarrhoea" },
      { key: "difficulty_urinating", label: "Difficulty passing urine" },
      { key: "frequent_urination", label: "Frequent urination" },
      { key: "persistent_abdominal_pain", label: "Persistent abdominal pain or swelling" },
      { key: "jaundice", label: "Yellowing of the eyes or skin" },
    ],
  },
];

const MEDICAL_HISTORY_ITEMS = [
  { key: "cancer", label: "Cancer (any type)" },
  { key: "diabetes", label: "Diabetes" },
  { key: "hiv", label: "HIV" },
  { key: "hepatitis_b", label: "Hepatitis B" },
  { key: "hepatitis_c", label: "Hepatitis C" },
  { key: "chronic_pancreatitis", label: "Chronic pancreatitis" },
  { key: "ulcerative_colitis", label: "Ulcerative colitis" },
  { key: "crohns", label: "Crohn's disease" },
  { key: "cervical_dysplasia", label: "Cervical dysplasia" },
  { key: "colon_polyps", label: "Colon polyps" },
];

const FAMILY_CANCER_TYPES = ["Breast", "Cervical", "Prostate", "Colorectal", "Liver"];

const INFECTION_ITEMS = [
  { key: "hpv", label: "HPV" },
  { key: "hepatitis_b", label: "Hepatitis B" },
  { key: "hepatitis_c", label: "Hepatitis C" },
  { key: "hiv", label: "HIV" },
  { key: "h_pylori", label: "H. pylori" },
];

const EXPOSURE_ITEMS = [
  { key: "asbestos", label: "Asbestos" },
  { key: "mining", label: "Mining" },
  { key: "radiation", label: "Radiation" },
  { key: "chemicals", label: "Industrial chemicals" },
  { key: "oil_gas", label: "Oil and gas" },
  { key: "pesticides", label: "Agricultural pesticides" },
];

function toggleInArray(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}

function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SelfAssessmentForm({
  registrationId,
  gender,
  onComplete,
}: {
  registrationId: string;
  gender: Gender;
  onComplete: (result: AssessmentResult) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const steps = useMemo(() => {
    const base = ["basics", "symptoms", "lifestyle", "medical", "family"];
    const genderStep = gender === "female" ? "womens" : "mens";
    return [...base, genderStep, "infection", "exposure", "review"];
  }, [gender]);

  const currentKey = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  function next() {
    if (currentKey === "basics" && !answers.age) {
      setError("Please enter your age.");
      return;
    }
    setError("");
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    setError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function addFamilyHistory() {
    set("familyHistory", [...answers.familyHistory, { cancerType: "", relation: "", ageAtDiagnosis: "" }]);
  }

  function updateFamilyHistory(idx: number, patch: Partial<FamilyHistoryEntry>) {
    const next = [...answers.familyHistory];
    next[idx] = { ...next[idx], ...patch };
    set("familyHistory", next);
  }

  function removeFamilyHistory(idx: number) {
    set("familyHistory", answers.familyHistory.filter((_, i) => i !== idx));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        registrationId,
        answers: {
          age: answers.age ? parseInt(answers.age) : null,
          smoker: answers.smoker || null,
          cigarettesPerDay: answers.cigarettesPerDay ? parseInt(answers.cigarettesPerDay) : null,
          smokingYears: answers.smokingYears ? parseInt(answers.smokingYears) : null,
          alcohol: answers.alcohol || null,
          exerciseDaysPerWeek: answers.exerciseDaysPerWeek ? parseInt(answers.exerciseDaysPerWeek) : null,
          medicalHistory: answers.medicalHistory,
          familyHistory: answers.familyHistory
            .filter((f) => f.cancerType && f.relation)
            .map((f) => ({
              cancerType: f.cancerType,
              relation: f.relation,
              ageAtDiagnosis: f.ageAtDiagnosis ? parseInt(f.ageAtDiagnosis) : null,
            })),
          symptoms: answers.symptoms,
          ageAtMenarche: answers.ageAtMenarche ? parseInt(answers.ageAtMenarche) : null,
          stillMenstruating: answers.stillMenstruating ? answers.stillMenstruating === "yes" : null,
          ageAtMenopause: answers.ageAtMenopause ? parseInt(answers.ageAtMenopause) : null,
          pregnancies: answers.pregnancies ? parseInt(answers.pregnancies) : null,
          ageAtFirstChildbirth: answers.ageAtFirstChildbirth ? parseInt(answers.ageAtFirstChildbirth) : null,
          breastfeedingHistory: answers.breastfeedingHistory ? answers.breastfeedingHistory === "yes" : null,
          hpvVaccinated: answers.hpvVaccinated ? answers.hpvVaccinated === "yes" : null,
          papSmearEver: answers.papSmearEver ? answers.papSmearEver === "yes" : null,
          papSmearResult: answers.papSmearResult || null,
          urinaryDifficulty: answers.urinaryDifficulty ? answers.urinaryDifficulty === "yes" : null,
          weakStream: answers.weakStream ? answers.weakStream === "yes" : null,
          nocturia: answers.nocturia ? answers.nocturia === "yes" : null,
          bloodInSemen: answers.bloodInSemen ? answers.bloodInSemen === "yes" : null,
          infections: answers.infections,
          exposures: answers.exposures,
        },
      };

      const { data } = await api.post("/self-assessment", payload);
      onComplete({
        assessmentId: data.assessmentId,
        riskCategory: data.riskCategory,
        recommendation: data.recommendation,
        flaggedReasons: data.flaggedReasons ?? [],
        suggestedCancerTypes: data.suggestedCancerTypes ?? [],
        facility: data.facility ?? null,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong submitting your assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full flex-1 flex flex-col justify-center">
        <div className="mb-4">
          <div className="h-1.5 w-full rounded-full bg-green-100 overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Step {stepIndex + 1} of {steps.length}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-6">
          {currentKey === "basics" && (
            <StepShell title="A little about you" subtitle="This helps us tailor your assessment.">
              <Label>
                <span className="text-sm font-semibold">How old are you? <span className="text-red-500">*</span></span>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  className="mt-2 rounded-2xl h-12"
                  value={answers.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="Your age in years"
                />
              </Label>
            </StepShell>
          )}

          {currentKey === "symptoms" && (
            <StepShell
              title="Have you noticed any of these?"
              subtitle="Select anything you've experienced recently. This is the most important section — please be thorough."
            >
              <div className="max-h-96 overflow-y-auto pr-1 space-y-4">
                {SYMPTOM_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                      {group.title}
                    </p>
                    {group.items.map((item) => (
                      <Checkbox
                        key={item.key}
                        label={item.label}
                        checked={answers.symptoms.includes(item.key)}
                        onChange={() => set("symptoms", toggleInArray(answers.symptoms, item.key))}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </StepShell>
          )}

          {currentKey === "lifestyle" && (
            <StepShell title="Lifestyle">
              <Label>
                <span className="text-sm font-semibold">Do you smoke?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.smoker}
                  onChange={(e) => set("smoker", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="never">I've never smoked</option>
                  <option value="former">I used to smoke</option>
                  <option value="current">Yes, I currently smoke</option>
                </Select>
              </Label>
              {answers.smoker === "current" && (
                <div className="grid grid-cols-2 gap-4">
                  <Label>
                    <span className="text-sm font-semibold">How many cigarettes a day?</span>
                    <Input
                      type="number"
                      className="mt-2 rounded-2xl h-12"
                      value={answers.cigarettesPerDay}
                      onChange={(e) => set("cigarettesPerDay", e.target.value)}
                    />
                  </Label>
                  <Label>
                    <span className="text-sm font-semibold">For how many years?</span>
                    <Input
                      type="number"
                      className="mt-2 rounded-2xl h-12"
                      value={answers.smokingYears}
                      onChange={(e) => set("smokingYears", e.target.value)}
                    />
                  </Label>
                </div>
              )}
              <Label>
                <span className="text-sm font-semibold">Do you drink alcohol?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.alcohol}
                  onChange={(e) => set("alcohol", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="none">No, I don't drink</option>
                  <option value="occasional">Occasionally</option>
                  <option value="regular">Regularly</option>
                  <option value="heavy">Frequently / heavily</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">How many days a week do you exercise?</span>
                <Input
                  type="number"
                  min={0}
                  max={7}
                  className="mt-2 rounded-2xl h-12"
                  value={answers.exerciseDaysPerWeek}
                  onChange={(e) => set("exerciseDaysPerWeek", e.target.value)}
                />
              </Label>
            </StepShell>
          )}

          {currentKey === "medical" && (
            <StepShell title="Medical history" subtitle="Have you ever been diagnosed with any of these?">
              {MEDICAL_HISTORY_ITEMS.map((item) => (
                <Checkbox
                  key={item.key}
                  label={item.label}
                  checked={answers.medicalHistory.includes(item.key)}
                  onChange={() => set("medicalHistory", toggleInArray(answers.medicalHistory, item.key))}
                />
              ))}
            </StepShell>
          )}

          {currentKey === "family" && (
            <StepShell
              title="Family history"
              subtitle="Has a parent, sibling, or child had cancer? Add each one below."
            >
              {answers.familyHistory.map((fh, idx) => (
                <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      className="rounded-xl h-11"
                      value={fh.cancerType}
                      onChange={(e) => updateFamilyHistory(idx, { cancerType: e.target.value })}
                    >
                      <option value="">Cancer type</option>
                      {FAMILY_CANCER_TYPES.map((c) => (
                        <option key={c} value={c.toLowerCase()}>{c}</option>
                      ))}
                    </Select>
                    <Select
                      className="rounded-xl h-11"
                      value={fh.relation}
                      onChange={(e) => updateFamilyHistory(idx, { relation: e.target.value })}
                    >
                      <option value="">Relation</option>
                      <option value="parent">Parent</option>
                      <option value="sibling">Sibling</option>
                      <option value="child">Child</option>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      className="rounded-xl h-11 flex-1"
                      placeholder="Age at diagnosis (optional)"
                      value={fh.ageAtDiagnosis}
                      onChange={(e) => updateFamilyHistory(idx, { ageAtDiagnosis: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeFamilyHistory(idx)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addFamilyHistory}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
              >
                <Plus className="w-4 h-4" /> Add family member
              </button>
            </StepShell>
          )}

          {currentKey === "womens" && (
            <StepShell
              title="Women's health"
              subtitle="These questions relate to cervical health and reproductive history. (Breast changes were already covered earlier.)"
            >
              <div className="grid grid-cols-2 gap-4">
                <Label>
                  <span className="text-sm font-semibold">Age at first period</span>
                  <Input
                    type="number"
                    className="mt-2 rounded-2xl h-12"
                    value={answers.ageAtMenarche}
                    onChange={(e) => set("ageAtMenarche", e.target.value)}
                  />
                </Label>
                <Label>
                  <span className="text-sm font-semibold">Still menstruating?</span>
                  <Select
                    className="mt-2 rounded-2xl h-12"
                    value={answers.stillMenstruating}
                    onChange={(e) => set("stillMenstruating", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </Label>
              </div>
              {answers.stillMenstruating === "no" && (
                <Label>
                  <span className="text-sm font-semibold">Age at menopause</span>
                  <Input
                    type="number"
                    className="mt-2 rounded-2xl h-12"
                    value={answers.ageAtMenopause}
                    onChange={(e) => set("ageAtMenopause", e.target.value)}
                  />
                </Label>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Label>
                  <span className="text-sm font-semibold">Number of pregnancies</span>
                  <Input
                    type="number"
                    className="mt-2 rounded-2xl h-12"
                    value={answers.pregnancies}
                    onChange={(e) => set("pregnancies", e.target.value)}
                  />
                </Label>
                <Label>
                  <span className="text-sm font-semibold">Age at first childbirth</span>
                  <Input
                    type="number"
                    className="mt-2 rounded-2xl h-12"
                    value={answers.ageAtFirstChildbirth}
                    onChange={(e) => set("ageAtFirstChildbirth", e.target.value)}
                  />
                </Label>
              </div>
              <Label>
                <span className="text-sm font-semibold">Breastfeeding history?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.breastfeedingHistory}
                  onChange={(e) => set("breastfeedingHistory", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Ever had HPV vaccination?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.hpvVaccinated}
                  onChange={(e) => set("hpvVaccinated", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Ever had a Pap smear?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.papSmearEver}
                  onChange={(e) => set("papSmearEver", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
              {answers.papSmearEver === "yes" && (
                <Label>
                  <span className="text-sm font-semibold">Result (if known)</span>
                  <Input
                    className="mt-2 rounded-2xl h-12"
                    value={answers.papSmearResult}
                    onChange={(e) => set("papSmearResult", e.target.value)}
                    placeholder="e.g. Normal, abnormal, not sure"
                  />
                </Label>
              )}
            </StepShell>
          )}

          {currentKey === "mens" && (
            <StepShell
              title="Men's health"
              subtitle="These questions relate to prostate health. (Breast changes were already covered earlier — men can get breast cancer too.)"
            >
              <Label>
                <span className="text-sm font-semibold">Difficulty passing urine?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.urinaryDifficulty}
                  onChange={(e) => set("urinaryDifficulty", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Weak urine stream?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.weakStream}
                  onChange={(e) => set("weakStream", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Frequent urination at night?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.nocturia}
                  onChange={(e) => set("nocturia", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
              <Label>
                <span className="text-sm font-semibold">Blood in semen?</span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={answers.bloodInSemen}
                  onChange={(e) => set("bloodInSemen", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
            </StepShell>
          )}

          {currentKey === "infection" && (
            <StepShell title="Infection history" subtitle="Have you ever been diagnosed with any of these?">
              {INFECTION_ITEMS.map((item) => (
                <Checkbox
                  key={item.key}
                  label={item.label}
                  checked={answers.infections.includes(item.key)}
                  onChange={() => set("infections", toggleInArray(answers.infections, item.key))}
                />
              ))}
            </StepShell>
          )}

          {currentKey === "exposure" && (
            <StepShell title="Environmental exposure" subtitle="Have you ever worked around any of these?">
              {EXPOSURE_ITEMS.map((item) => (
                <Checkbox
                  key={item.key}
                  label={item.label}
                  checked={answers.exposures.includes(item.key)}
                  onChange={() => set("exposures", toggleInArray(answers.exposures, item.key))}
                />
              ))}
            </StepShell>
          )}

          {currentKey === "review" && (
            <StepShell title="Ready to submit?" subtitle="This assessment guides you toward the right next step — it is not a diagnosis.">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600 space-y-1">
                <p>Age: <span className="font-semibold">{answers.age || "—"}</span></p>
                <p>Symptoms selected: <span className="font-semibold">{answers.symptoms.length}</span></p>
                <p>Family history entries: <span className="font-semibold">{answers.familyHistory.length}</span></p>
              </div>
            </StepShell>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={back}
              disabled={isFirst}
              className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 disabled:opacity-0 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {isLast ? (
              <Button
                onClick={submit}
                disabled={submitting}
                className="h-12 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </span>
                ) : (
                  "Submit Assessment"
                )}
              </Button>
            ) : (
              <Button
                onClick={next}
                className="h-12 px-6 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
              >
                <span className="inline-flex items-center gap-1">
                  Next <ChevronRight className="w-4 h-4" />
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Platform powered by Resilience Nigeria
      </p>
    </div>
  );
}
