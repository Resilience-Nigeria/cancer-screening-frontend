import React, { useState, useEffect } from "react";
import {
  Button,
  Label,
  Input,
  Select,
  HelperText,
} from "@roketid/windmill-react-ui";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../../lib/api";

type BreastScreeningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  visitId: number;
  onComplete: () => void;
};

export default function BreastScreeningModal({
  isOpen,
  onClose,
  visitId,
  onComplete,
}: BreastScreeningModalProps) {
  const [form, setForm] = useState({
    method: "cbe",
    screeningDate: new Date().toISOString().split("T")[0],
    result: "negative",
    
    breastfeedingHistory: "",
    breastfeedingDuration: "",
    breastLumps: "",
    breastNippleDischarge: "",
    dischargeType: "",
    skinChanges: "",
    breastPain: "",
    previousBreastSurgery: "",
    previousBiopsy: "",
    ageAtFirstMenstruation: "",
    ageAtMenopause: "",
    
    biopsyDone: false,
    biopsyResult: "",
    referralCompleted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && visitId) {
      fetchExisting();
    }
  }, [isOpen, visitId]);

  async function fetchExisting() {
    try {
      const { data } = await api.get(`/visits/${visitId}/breast-screening`);
      const raw = data?.screening || data?.breastScreening || data?.data;

      if (raw) {
        setForm({
          method: raw.method ?? "cbe",
          screeningDate: raw.screeningDate ?? raw.screening_date ?? new Date().toISOString().split("T")[0],
          result: raw.result ?? "negative",
          
          breastfeedingHistory: raw.breastfeedingHistory ?? raw.breastfeeding_history ?? "",
          breastfeedingDuration: raw.breastfeedingDuration ?? raw.breastfeeding_duration ?? "",
          breastLumps: raw.breastLumps ?? raw.breast_lumps ?? "",
          breastNippleDischarge: raw.breastNippleDischarge ?? raw.breast_nipple_discharge ?? "",
          dischargeType: raw.dischargeType ?? raw.discharge_type ?? "",
          skinChanges: raw.skinChanges ?? raw.skin_changes ?? "",
          breastPain: raw.breastPain ?? raw.breast_pain ?? "",
          previousBreastSurgery: raw.previousBreastSurgery ?? raw.previous_breast_surgery ?? "",
          previousBiopsy: raw.previousBiopsy ?? raw.previous_biopsy ?? "",
          ageAtFirstMenstruation: raw.ageAtFirstMenstruation ?? raw.age_at_first_menstruation ?? "",
          ageAtMenopause: raw.ageAtMenopause ?? raw.age_at_menopause ?? "",
          
          biopsyDone: !!(raw.biopsyDone ?? raw.biopsy_done),
          biopsyResult: raw.biopsyResult ?? raw.biopsy_result ?? "",
          referralCompleted: !!(raw.referralCompleted ?? raw.referral_completed),
        });
      }
    } catch (err) {
      // No existing data
    }
  }

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.method) newErrors.method = "Method is required.";
    if (!form.screeningDate) newErrors.screeningDate = "Screening date is required.";
    if (!form.result) newErrors.result = "Result is required.";
    if (form.biopsyDone && !form.biopsyResult) {
      newErrors.biopsyResult = "Biopsy result is required when biopsy is done.";
    }
    if (form.breastNippleDischarge === "yes" && !form.dischargeType) {
      newErrors.dischargeType = "Discharge type is required.";
    }
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please correct the required fields.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post(`/visits/${visitId}/breast-screening`, {
        ...form,
        biopsyResult: form.biopsyDone ? form.biopsyResult : null,
        dischargeType: form.breastNippleDischarge === "yes" ? form.dischargeType : null,
        breastfeedingDuration: form.breastfeedingDuration ? parseInt(form.breastfeedingDuration) : null,
        ageAtFirstMenstruation: form.ageAtFirstMenstruation ? parseInt(form.ageAtFirstMenstruation) : null,
        ageAtMenopause: form.ageAtMenopause ? parseInt(form.ageAtMenopause) : null,
      });

      onComplete();
    } catch (err: any) {
      const response = err?.response?.data;
      if (response?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(response.errors).forEach((key) => {
          if (Array.isArray(response.errors[key]) && response.errors[key].length > 0) {
            apiErrors[key] = response.errors[key][0];
          }
        });
        setErrors(apiErrors);
      }
      toast.error(response?.message || "Unable to save breast screening.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!submitting) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={handleClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full">
          <form onSubmit={handleSubmit}>
            {/* Header - Fixed */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Breast Screening
              </h3>
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(90vh - 140px)" }}>
              <div className="space-y-6">
                {/* Screening Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Screening Details
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Label>
                      <span className="text-sm font-semibold">Method</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.method}
                        onChange={(e) => setField("method", e.target.value)}
                      >
                        <option value="cbe">Clinical Breast Exam (CBE)</option>
                        <option value="mammography">Mammography</option>
                        <option value="ultrasound">Ultrasound</option>
                      </Select>
                      {errors.method && <HelperText className="text-red-500">{errors.method}</HelperText>}
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Screening Date</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        type="date"
                        value={form.screeningDate}
                        onChange={(e) => setField("screeningDate", e.target.value)}
                      />
                      {errors.screeningDate && <HelperText className="text-red-500">{errors.screeningDate}</HelperText>}
                    </Label>

                    <Label className="md:col-span-2">
                      <span className="text-sm font-semibold">Result</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.result}
                        onChange={(e) => setField("result", e.target.value)}
                      >
                        <option value="negative">Negative</option>
                        <option value="positive">Positive</option>
                        <option value="suspicious">Suspicious</option>
                      </Select>
                      {errors.result && <HelperText className="text-red-500">{errors.result}</HelperText>}
                    </Label>
                  </div>
                </div>

                {/* Breast-Specific Symptoms */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Breast Health History & Symptoms
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Label>
                      <span className="text-sm font-semibold">Breastfeeding History</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.breastfeedingHistory}
                        onChange={(e) => setField("breastfeedingHistory", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    {form.breastfeedingHistory === "yes" && (
                      <Label>
                        <span className="text-sm font-semibold">Breastfeeding Duration (months)</span>
                        <Input
                          className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                          type="number"
                          min="0"
                          value={form.breastfeedingDuration}
                          onChange={(e) => setField("breastfeedingDuration", e.target.value)}
                          placeholder="Total months"
                        />
                      </Label>
                    )}

                    <Label>
                      <span className="text-sm font-semibold">Breast Lumps</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.breastLumps}
                        onChange={(e) => setField("breastLumps", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="current">Current</option>
                        <option value="previous">Previous</option>
                        <option value="none">None</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Breast/Nipple Discharge</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.breastNippleDischarge}
                        onChange={(e) => setField("breastNippleDischarge", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    {form.breastNippleDischarge === "yes" && (
                      <Label className="md:col-span-2">
                        <span className="text-sm font-semibold">Discharge Type</span>
                        <Select
                          className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                          value={form.dischargeType}
                          onChange={(e) => setField("dischargeType", e.target.value)}
                        >
                          <option value="">Select type</option>
                          <option value="bloody">Bloody</option>
                          <option value="clear">Clear</option>
                          <option value="milky">Milky</option>
                          <option value="purulent">Purulent</option>
                        </Select>
                        {errors.dischargeType && <HelperText className="text-red-500">{errors.dischargeType}</HelperText>}
                      </Label>
                    )}

                    <Label>
                      <span className="text-sm font-semibold">Skin Appearance Changes</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.skinChanges}
                        onChange={(e) => setField("skinChanges", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Breast Pain</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.breastPain}
                        onChange={(e) => setField("breastPain", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Previous Breast Surgery</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.previousBreastSurgery}
                        onChange={(e) => setField("previousBreastSurgery", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Previous Biopsy</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.previousBiopsy}
                        onChange={(e) => setField("previousBiopsy", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Age at First Menstruation</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
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
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        type="number"
                        min="0"
                        max="100"
                        value={form.ageAtMenopause}
                        onChange={(e) => setField("ageAtMenopause", e.target.value)}
                        placeholder="Age"
                      />
                    </Label>
                  </div>
                </div>

                {/* Additional Procedures */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Additional Procedures & Follow-up
                  </h3>
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Label check className="flex items-center">
                        <Input
                          type="checkbox"
                          checked={form.biopsyDone}
                          onChange={(e) => setField("biopsyDone", e.target.checked)}
                          className="mr-2"
                        />
                        <span>Biopsy done</span>
                      </Label>

                      <Label check className="flex items-center">
                        <Input
                          type="checkbox"
                          checked={form.referralCompleted}
                          onChange={(e) => setField("referralCompleted", e.target.checked)}
                          className="mr-2"
                        />
                        <span>Referral completed</span>
                      </Label>
                    </div>

                    {form.biopsyDone && (
                      <Label>
                        <span className="text-sm font-semibold">Biopsy Result</span>
                        <Select
                          className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                          value={form.biopsyResult}
                          onChange={(e) => setField("biopsyResult", e.target.value)}
                        >
                          <option value="">Select result</option>
                          <option value="positive">Positive</option>
                          <option value="negative">Negative</option>
                        </Select>
                        {errors.biopsyResult && <HelperText className="text-red-500">{errors.biopsyResult}</HelperText>}
                      </Label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="sticky bottom-0 z-10 flex gap-3 justify-end p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
              <Button
                layout="outline"
                onClick={handleClose}
                type="button"
                disabled={submitting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Screening"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}