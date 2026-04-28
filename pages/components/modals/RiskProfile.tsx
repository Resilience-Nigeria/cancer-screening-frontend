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
  clientId: number;
  existingProfile?: any;
  onComplete: () => void;
};

const STEPS = [
  { id: 1, title: "Basic Health" },
  { id: 2, title: "Smoking" },
  { id: 3, title: "Alcohol" },
  { id: 4, title: "HIV Status" },
  { id: 5, title: "Family History" },
];

export default function RiskProfileModal({
  isOpen,
  onClose,
  clientId,
  existingProfile,
  onComplete,
}: RiskProfileModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    // Basic Health
    weight: "",
    height: "",
    bmi: "",
    bloodPressure: "",
    diabetes: "",
    hypertension: "",

    // Smoking
    smokingStatus: "",
    cigarettesPerDay: "",
    packetsPerWeek: "",
    smokingBrands: "",
    smokingDurationYears: "",
    passiveSmokingSource: [] as string[],
    passiveSmokingFrequency: "",
    passiveSmokingLocation: [] as string[],

    // Alcohol
    alcoholFrequency: "",
    alcoholUnitsPerWeek: "",
    alcoholTypes: [] as string[],
    alcoholDurationYears: "",

    // HIV
    hivStatus: "",

    // Family History
    familyHistory: "",
    cancerTypes: [] as string[],
  });

  useEffect(() => {
    if (existingProfile) {
      setForm({
        weight: existingProfile.weight || "",
        height: existingProfile.height || "",
        bmi: existingProfile.bmi || "",
        bloodPressure: existingProfile.bloodPressure || existingProfile.blood_pressure || "",
        diabetes: existingProfile.diabetes || "",
        hypertension: existingProfile.hypertension || "",

        smokingStatus: existingProfile.smokingStatus || existingProfile.smoking_status || "",
        cigarettesPerDay: existingProfile.cigarettesPerDay || existingProfile.cigarettes_per_day || "",
        packetsPerWeek: existingProfile.packetsPerWeek || existingProfile.packets_per_week || "",
        smokingBrands: existingProfile.smokingBrands || existingProfile.smoking_brands || "",
        smokingDurationYears: existingProfile.smokingDurationYears || existingProfile.smoking_duration_years || "",
        passiveSmokingSource: existingProfile.passiveSmokingSource || existingProfile.passive_smoking_source || [],
        passiveSmokingFrequency: existingProfile.passiveSmokingFrequency || existingProfile.passive_smoking_frequency || "",
        passiveSmokingLocation: existingProfile.passiveSmokingLocation || existingProfile.passive_smoking_location || [],

        alcoholFrequency: existingProfile.alcoholFrequency || existingProfile.alcohol_frequency || "",
        alcoholUnitsPerWeek: existingProfile.alcoholUnitsPerWeek || existingProfile.alcohol_units_per_week || "",
        alcoholTypes: existingProfile.alcoholTypes || existingProfile.alcohol_types || [],
        alcoholDurationYears: existingProfile.alcoholDurationYears || existingProfile.alcohol_duration_years || "",

        hivStatus: existingProfile.hivStatus || existingProfile.hiv_status || "",

        familyHistory: existingProfile.familyHistory || existingProfile.family_history_of_cancer || "",
        cancerTypes: existingProfile.cancerTypes || existingProfile.cancer_types || [],
      });
    }
  }, [existingProfile]);

  // Auto-calculate BMI
  useEffect(() => {
    if (form.weight && form.height) {
      const weightKg = parseFloat(form.weight);
      const heightM = parseFloat(form.height) / 100; // Convert cm to m
      if (weightKg > 0 && heightM > 0) {
        const bmi = (weightKg / (heightM * heightM)).toFixed(1);
        setForm((prev) => ({ ...prev, bmi }));
      }
    }
  }, [form.weight, form.height]);

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function toggleArrayValue(field: keyof typeof form, value: string) {
    setForm((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  }

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Basic health - all optional but show warnings
      if (!form.weight) newErrors.weight = "Weight recommended";
      if (!form.height) newErrors.height = "Height recommended";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  }

  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);

    try {
      await api.post(`/clients/${clientId}/risk-profile`, {
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        bmi: form.bmi ? parseFloat(form.bmi) : null,
        cigarettesPerDay: form.cigarettesPerDay ? parseInt(form.cigarettesPerDay) : null,
        packetsPerWeek: form.packetsPerWeek ? parseInt(form.packetsPerWeek) : null,
        smokingDurationYears: form.smokingDurationYears ? parseInt(form.smokingDurationYears) : null,
        alcoholUnitsPerWeek: form.alcoholUnitsPerWeek ? parseInt(form.alcoholUnitsPerWeek) : null,
        alcoholDurationYears: form.alcoholDurationYears ? parseInt(form.alcoholDurationYears) : null,
      });

      toast.success("Risk profile saved successfully.");
      onComplete();
    } catch (err: any) {
      const response = err?.response?.data;
      toast.error(response?.message || "Unable to save risk profile.");
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

  // Don't render if modal is not open
  if (!isOpen) return null;

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Weight (kg)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setField("weight", e.target.value)}
                  placeholder="Enter weight"
                />
                {errors.weight && <HelperText className="text-red-500">{errors.weight}</HelperText>}
              </Label>

              <Label>
                <span className="text-sm font-semibold">Height (cm)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  step="0.1"
                  value={form.height}
                  onChange={(e) => setField("height", e.target.value)}
                  placeholder="Enter height"
                />
                {errors.height && <HelperText className="text-red-500">{errors.height}</HelperText>}
              </Label>

              <Label>
                <span className="text-sm font-semibold">BMI (Auto-calculated)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm bg-gray-50 dark:bg-gray-700"
                  value={form.bmi}
                  disabled
                  placeholder="Auto"
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Blood Pressure</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.bloodPressure}
                  onChange={(e) => setField("bloodPressure", e.target.value)}
                  placeholder="e.g., 120/80"
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Diabetes</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.diabetes}
                  onChange={(e) => setField("diabetes", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Hypertension</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hypertension}
                  onChange={(e) => setField("hypertension", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
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
                    value={form.packetsPerWeek}
                    onChange={(e) => setField("packetsPerWeek", e.target.value)}
                    placeholder="Number"
                  />
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Brands</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.smokingBrands}
                    onChange={(e) => setField("smokingBrands", e.target.value)}
                    placeholder="Enter brands"
                  />
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Duration (years)</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    value={form.smokingDurationYears}
                    onChange={(e) => setField("smokingDurationYears", e.target.value)}
                    placeholder="Years"
                  />
                </Label>
              </div>
            )}

            {form.smokingStatus === "passive_smoker" && (
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-semibold block mb-3">Exposure Source (select all)</span>
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
                  <span className="text-sm font-semibold block mb-3">Location (select all)</span>
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
                value={form.alcoholFrequency}
                onChange={(e) => setField("alcoholFrequency", e.target.value)}
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="occasionally">Occasionally</option>
                <option value="weekly">Weekly</option>
                <option value="regularly">Regularly</option>
                <option value="daily">Daily</option>
              </Select>
            </Label>

            {form.alcoholFrequency && form.alcoholFrequency !== "never" && (
              <>
                <Label>
                  <span className="text-sm font-semibold">Units per Week</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
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
                    value={form.alcoholDurationYears}
                    onChange={(e) => setField("alcoholDurationYears", e.target.value)}
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
                HIV status is optional. This information helps with risk assessment.
              </p>
            </div>

            <Label>
              <span className="text-sm font-semibold">HIV Status</span>
              <Select
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.hivStatus}
                onChange={(e) => setField("hivStatus", e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="unknown">Unknown</option>
              </Select>
            </Label>
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

            {form.familyHistory === "yes" && (
              <div>
                <span className="text-sm font-semibold block mb-3">Cancer Types (select all)</span>
                <div className="grid gap-2 md:grid-cols-2">
                  {["cervical", "breast", "prostate", "colorectal", "liver", "lung", "other"].map((type) => (
                    <Label key={type} check>
                      <Input
                        type="checkbox"
                        checked={form.cancerTypes.includes(type)}
                        onChange={() => toggleArrayValue("cancerTypes", type)}
                      />
                      <span className="ml-2 capitalize">{type}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  // Custom modal implementation
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={handleClose}
      />
      
      {/* Modal Panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                {STEPS.map((step, idx) => (
                  <div key={step.id} className={`flex-1 ${idx < STEPS.length - 1 ? "mr-2" : ""}`}>
                    <div
                      className={`h-2 rounded-full ${
                        step.id <= currentStep
                          ? "bg-green-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                    <p
                      className={`mt-2 text-xs text-center hidden sm:block ${
                        step.id === currentStep
                          ? "text-green-600 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            {renderStep()}
          </div>

          {/* Footer */}
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