import React, { useState, useEffect } from "react";
import {
  Button,
  Label,
  Input,
  Select,
  HelperText,
} from "@roketid/windmill-react-ui";
import { Loader2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../lib/api";

type RiskProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  existingProfile?: any;
  onComplete: () => void;
  cancerType?: string;
};

const STEPS = [
  { id: 1, title: "Basic Health" },
  { id: 2, title: "Smoking" },
  { id: 3, title: "Alcohol" },
  { id: 4, title: "Infectious Status" },
  { id: 5, title: "Family History" },
];

const num = (v: any) => (v === null || v === undefined ? "" : String(v));

export default function RiskProfileModal({
  isOpen,
  onClose,
  clientId,
  existingProfile,
  onComplete,
  cancerType, 
}: RiskProfileModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [comorbidityInput, setComorbidityInput] = useState("");

  // Field names aligned to the actual risk-profile columns.
  const [form, setForm] = useState({
    // Basic Health
    weightKg: "",
    heightCm: "",
    bmi: "",
    comorbiditiesJson: [] as string[],

    // Smoking
    smokingStatus: "",
    cigarettesPerDay: "",
    packetsPerWeek: "",
    cigaretteBrands: "",
    smokingDuration: "",
    passiveSmokingSource: [] as string[],
    passiveSmokingFrequency: "",
    passiveSmokingLocation: [] as string[],

    // Alcohol (alcoholConsumption is the real column; we mirror to alcoholFrequency)
    alcoholConsumption: "",
    alcoholUnitsPerWeek: "",
    alcoholTypes: [] as string[],
    alcoholDuration: "",

    // Infectious status
    hivStatus: "",
    hbvStatus: "",
    hcvStatus: "",

    // Family history (boolean in DB; UI uses yes/no)
    familyHistory: "",

    ageAtFirstMenstruation: "",
  ageAtMenopause: "",
  });

  useEffect(() => {
    if (!existingProfile) return;
    const p = existingProfile;
    setForm({
      weightKg: num(p.weightKg ?? p.weight_kg),
      heightCm: num(p.heightCm ?? p.height_cm),
      bmi: num(p.bmi),
      comorbiditiesJson: Array.isArray(p.comorbiditiesJson)
        ? p.comorbiditiesJson
        : Array.isArray(p.comorbidities_json)
        ? p.comorbidities_json
        : [],

      smokingStatus: p.smokingStatus ?? p.smoking_status ?? "",
      cigarettesPerDay: num(p.cigarettesPerDay ?? p.cigarettes_per_day),
      packetsPerWeek: num(p.packetsPerWeek ?? p.packets_per_week),
      cigaretteBrands:
        p.cigaretteBrands ?? p.cigarette_brands ?? p.smokingBrands ?? "",
      smokingDuration: num(p.smokingDuration ?? p.smoking_duration),
      passiveSmokingSource:
        p.passiveSmokingSource ?? p.passive_smoking_source ?? [],
      passiveSmokingFrequency:
        p.passiveSmokingFrequency ?? p.passive_smoking_frequency ?? "",
      passiveSmokingLocation:
        p.passiveSmokingLocation ?? p.passive_smoking_location ?? [],

      // accept either column name on the way in
      alcoholConsumption:
        p.alcoholConsumption ?? p.alcohol_consumption ?? p.alcoholFrequency ?? "",
      alcoholUnitsPerWeek: num(p.alcoholUnitsPerWeek ?? p.alcohol_units_per_week),
      alcoholTypes: p.alcoholTypes ?? p.alcohol_types ?? [],
      alcoholDuration: num(p.alcoholDuration ?? p.alcohol_duration),

      hivStatus: p.hivStatus ?? p.hiv_status ?? "",
      hbvStatus: p.hbvStatus ?? p.hbv_status ?? "",
      hcvStatus: p.hcvStatus ?? p.hcv_status ?? "",

      // boolean -> yes/no for the select
      familyHistory: p.familyHistory ?? p.family_history ?? "",
      // familyHistory:
      //   p.familyHistory === true || p.family_history === true
      //     ? "yes"
      //     : p.familyHistory === false || p.family_history === false
      //     ? "no"
      //     : "",
      ageAtFirstMenstruation: String(p.ageAtFirstMenstruation ?? p.age_at_first_menstruation ?? ""),
ageAtMenopause: String(p.ageAtMenopause ?? p.age_at_menopause ?? ""),
    });
  }, [existingProfile]);

  // Auto-calculate BMI from weightKg / heightCm
  useEffect(() => {
    const w = parseFloat(form.weightKg);
    const hM = parseFloat(form.heightCm) / 100;
    if (w > 0 && hM > 0) {
      setForm((prev) => ({ ...prev, bmi: (w / (hM * hM)).toFixed(1) }));
    }
  }, [form.weightKg, form.heightCm]);

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function toggleArrayValue(field: keyof typeof form, value: string) {
    setForm((prev) => {
      const current = prev[field] as string[];
      return current.includes(value)
        ? { ...prev, [field]: current.filter((v) => v !== value) }
        : { ...prev, [field]: [...current, value] };
    });
  }

  function addComorbidity() {
    const t = comorbidityInput.trim();
    if (!t) return;
    if (!form.comorbiditiesJson.includes(t)) {
      setForm((prev) => ({
        ...prev,
        comorbiditiesJson: [...prev.comorbiditiesJson, t],
      }));
    }
    setComorbidityInput("");
  }

  function removeComorbidity(i: number) {
    setForm((prev) => ({
      ...prev,
      comorbiditiesJson: prev.comorbiditiesJson.filter((_, idx) => idx !== i),
    }));
  }

  function handleNext() {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  }
  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        // physical
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
        bmi: form.bmi ? parseFloat(form.bmi) : null,

        // smoking
        smokingStatus: form.smokingStatus || null,
        cigarettesPerDay: form.cigarettesPerDay ? parseInt(form.cigarettesPerDay) : null,
        packetsPerWeek: form.packetsPerWeek ? parseInt(form.packetsPerWeek) : null,
        cigaretteBrands: form.cigaretteBrands || null,
        smokingDuration: form.smokingDuration ? parseInt(form.smokingDuration) : null,
        passiveSmokingExposure: form.smokingStatus === "passive_smoker",
        passiveSmokingSource:
          form.passiveSmokingSource.length > 0 ? form.passiveSmokingSource : null,
        passiveSmokingFrequency: form.passiveSmokingFrequency || null,
        passiveSmokingLocation:
          form.passiveSmokingLocation.length > 0 ? form.passiveSmokingLocation : null,

        // alcohol — write both names so it persists regardless of which the API validates
        alcoholConsumption: form.alcoholConsumption || null,
        alcoholFrequency: form.alcoholConsumption || null,
        alcoholUnitsPerWeek: form.alcoholUnitsPerWeek ? parseInt(form.alcoholUnitsPerWeek) : null,
        alcoholTypes: form.alcoholTypes.length > 0 ? form.alcoholTypes : null,
        alcoholDuration: form.alcoholDuration ? parseInt(form.alcoholDuration) : null,

        // infectious
        hivStatus: form.hivStatus || null,
        hbvStatus: form.hbvStatus || null,
        hcvStatus: form.hcvStatus || null,

        // family history as boolean
        familyHistory: form.familyHistory || null,

        comorbiditiesJson: form.comorbiditiesJson,
        ageAtFirstMenstruation: form.ageAtFirstMenstruation ? parseInt(form.ageAtFirstMenstruation) : null,
ageAtMenopause: form.ageAtMenopause ? parseInt(form.ageAtMenopause) : null,
      };

      // POST matches the working wizard call for this route.
      await api.post(`/clients/${clientId}/risk-profile`, payload);
      toast.success("Risk profile saved successfully.");
      onComplete();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to save risk profile.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!submitting) {
      setCurrentStep(1);
      setErrors({});
      onClose();
    }
  }

  if (!isOpen) return null;

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Weight (kg)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.weightKg}
                  onChange={(e) => setField("weightKg", e.target.value)}
                  placeholder="Enter weight"
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Height (cm)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.heightCm}
                  onChange={(e) => setField("heightCm", e.target.value)}
                  placeholder="Enter height"
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">BMI (auto-calculated)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm bg-gray-50 dark:bg-gray-700"
                  value={form.bmi}
                  disabled
                  placeholder="Auto"
                />
              </Label>


              {cancerType === "breast" && (
  <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
    <Label>
      <span className="text-sm font-semibold">Age at First Menstruation</span>
      <Input
        className="mt-2 rounded-2xl h-12 shadow-sm"
        type="number"
        min="0"
        max="30"
        value={form.ageAtFirstMenstruation}
        onChange={(e) => setField("ageAtFirstMenstruation", e.target.value)}
        placeholder="Age"
      />
    </Label>
    <Label>
      <span className="text-sm font-semibold">Age at Menopause (if applicable)</span>
      <Input
        className="mt-2 rounded-2xl h-12 shadow-sm"
        type="number"
        min="0"
        max="100"
        value={form.ageAtMenopause}
        onChange={(e) => setField("ageAtMenopause", e.target.value)}
        placeholder="Age"
      />
    </Label>
  </div>
)}
            </div>

            <div>
              <span className="text-sm font-semibold">Comorbidities</span>
              <div className="mt-2 flex gap-2">
                <Input
                  className="rounded-2xl h-12 shadow-sm"
                  value={comorbidityInput}
                  onChange={(e) => setComorbidityInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addComorbidity();
                    }
                  }}
                  placeholder="e.g., Diabetes, Hypertension"
                />
                <Button
                  type="button"
                  onClick={addComorbidity}
                  className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              {form.comorbiditiesJson.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.comorbiditiesJson.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-sm text-green-800 dark:text-green-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeComorbidity(i)}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Label>
              <span className="text-sm font-semibold">Smoking Status</span>
              <Select
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.smokingStatus}
                onChange={(e) => setField("smokingStatus", e.target.value)}
              >
                <option value="">Select</option>
                <option value="non_smoker">Non-smoker</option>
                <option value="active_smoker">Active Smoker</option>
                <option value="former_smoker">Former Smoker</option>
                <option value="passive_smoker">Passive Smoker</option>
              </Select>
            </Label>

            {form.smokingStatus === "active_smoker" && (
              <div className="grid gap-4 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Cigarettes per Day</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    min="0"
                    value={form.cigarettesPerDay}
                    onChange={(e) => setField("cigarettesPerDay", e.target.value)}
                    placeholder="Number"
                  />
                </Label>
                <Label>
                  <span className="text-sm font-semibold">Packets per Week</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    min="0"
                    value={form.packetsPerWeek}
                    onChange={(e) => setField("packetsPerWeek", e.target.value)}
                    placeholder="Number"
                  />
                </Label>
                <Label>
                  <span className="text-sm font-semibold">Brands</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.cigaretteBrands}
                    onChange={(e) => setField("cigaretteBrands", e.target.value)}
                    placeholder="Enter brands"
                  />
                </Label>
                <Label>
                  <span className="text-sm font-semibold">Duration (years)</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    min="0"
                    value={form.smokingDuration}
                    onChange={(e) => setField("smokingDuration", e.target.value)}
                    placeholder="Years"
                  />
                </Label>
              </div>
            )}

            {form.smokingStatus === "passive_smoker" && (
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-semibold block mb-3">
                    Exposure Source (select all)
                  </span>
                  <div className="grid gap-2 md:grid-cols-2">
                    {["family", "spouse", "friends", "colleagues"].map((source) => (
                      <Label key={source} check>
                        <Input
                          type="checkbox"
                          checked={form.passiveSmokingSource.includes(source)}
                          onChange={() => toggleArrayValue("passiveSmokingSource", source)}
                        />
                        <span className="ml-2 capitalize">{source}</span>
                      </Label>
                    ))}
                  </div>
                </div>

                <Label>
                  <span className="text-sm font-semibold">Frequency</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.passiveSmokingFrequency}
                    onChange={(e) => setField("passiveSmokingFrequency", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="occasionally">Occasionally</option>
                  </Select>
                </Label>

                <div>
                  <span className="text-sm font-semibold block mb-3">
                    Location (select all)
                  </span>
                  <div className="grid gap-2 md:grid-cols-2">
                    {["home", "workplace", "social_settings"].map((loc) => (
                      <Label key={loc} check>
                        <Input
                          type="checkbox"
                          checked={form.passiveSmokingLocation.includes(loc)}
                          onChange={() => toggleArrayValue("passiveSmokingLocation", loc)}
                        />
                        <span className="ml-2 capitalize">{loc.replace(/_/g, " ")}</span>
                      </Label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Label>
              <span className="text-sm font-semibold">Alcohol Frequency</span>
              <Select
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.alcoholConsumption}
                onChange={(e) => setField("alcoholConsumption", e.target.value)}
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="occasionally">Occasionally</option>
                <option value="weekly">Weekly</option>
                <option value="regularly">Regularly</option>
                <option value="daily">Daily</option>
              </Select>
            </Label>

            {form.alcoholConsumption && form.alcoholConsumption !== "never" && (
              <>
                <Label>
                  <span className="text-sm font-semibold">Units per Week</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    min="0"
                    value={form.alcoholUnitsPerWeek}
                    onChange={(e) => setField("alcoholUnitsPerWeek", e.target.value)}
                    placeholder="Number of units"
                  />
                </Label>

                <div>
                  <span className="text-sm font-semibold block mb-3">Types (select all)</span>
                  <div className="grid gap-2 md:grid-cols-2">
                    {["beer", "wine", "spirits", "mixed"].map((type) => (
                      <Label key={type} check>
                        <Input
                          type="checkbox"
                          checked={form.alcoholTypes.includes(type)}
                          onChange={() => toggleArrayValue("alcoholTypes", type)}
                        />
                        <span className="ml-2 capitalize">{type}</span>
                      </Label>
                    ))}
                  </div>
                </div>

                <Label>
                  <span className="text-sm font-semibold">Duration (years)</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    min="0"
                    value={form.alcoholDuration}
                    onChange={(e) => setField("alcoholDuration", e.target.value)}
                    placeholder="Years"
                  />
                </Label>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Infectious status is optional but helps with risk assessment.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Label>
                <span className="text-sm font-semibold">HIV Status</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hivStatus}
                  onChange={(e) => setField("hivStatus", e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Hepatitis B</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hbvStatus}
                  onChange={(e) => setField("hbvStatus", e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Hepatitis C</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hcvStatus}
                  onChange={(e) => setField("hcvStatus", e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Label>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <Label>
              <span className="text-sm font-semibold">Family History of Cancer</span>
              <Select
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.familyHistory}
                onChange={(e) => setField("familyHistory", e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown</option>
              </Select>
            </Label>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Risk Profile Assessment - Step {currentStep} of {STEPS.length}
            </h3>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                {STEPS.map((step, idx) => (
                  <div key={step.id} className={`flex-1 ${idx < STEPS.length - 1 ? "mr-2" : ""}`}>
                    <div
                      className={`h-2 rounded-full ${
                        step.id <= currentStep ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                    <p
                      className={`mt-2 text-xs text-center hidden sm:block ${
                        step.id === currentStep ? "text-green-600 font-semibold" : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {renderStep()}
          </div>

          <div className="flex gap-3 justify-between p-6 border-t dark:border-gray-700">
            <Button
              layout="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || submitting}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-3">
              <Button
                layout="outline"
                onClick={handleClose}
                type="button"
                disabled={submitting}
                className="rounded-xl"
              >
                Cancel
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  onClick={handleNext}
                  disabled={submitting}
                  className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Complete
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}