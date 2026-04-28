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

type ColorectalScreeningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  visitId: number;
  onComplete: () => void;
};

export default function ColorectalScreeningModal({
  isOpen,
  onClose,
  visitId,
  onComplete,
}: ColorectalScreeningModalProps) {
  const [form, setForm] = useState({
    method: "fit",
    screeningDate: new Date().toISOString().split("T")[0],
    result: "negative",
    polypDetected: false,
    histology: "",
    treatmentReferral: "",
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
      const { data } = await api.get(`/visits/${visitId}/colorectal-screening`);
      const raw = data?.screening || data?.colorectalScreening || data?.data;

      if (raw) {
        setForm({
          method: raw.method ?? "fit",
          screeningDate: raw.screeningDate ?? raw.screening_date ?? new Date().toISOString().split("T")[0],
          result: raw.result ?? "negative",
          polypDetected: !!(raw.polypDetected ?? raw.polyp_detected),
          histology: raw.histology ?? "",
          treatmentReferral: raw.treatmentReferral ?? raw.treatment_referral ?? "",
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
      await api.post(`/visits/${visitId}/colorectal-screening`, form);
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
      toast.error(response?.message || "Unable to save colorectal screening.");
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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={handleClose}
      />
      
      {/* Modal Panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full">
          <form onSubmit={handleSubmit}>
            {/* Header - Fixed */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Colorectal Screening
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
                        <option value="fit">FIT (Fecal Immunochemical Test)</option>
                        <option value="fobt">FOBT (Fecal Occult Blood Test)</option>
                        <option value="colonoscopy">Colonoscopy</option>
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

                {/* Findings & Follow-up */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Findings & Follow-up
                  </h3>
                  <div className="space-y-4">
                    <Label check className="flex items-center">
                      <Input
                        type="checkbox"
                        checked={form.polypDetected}
                        onChange={(e) => setField("polypDetected", e.target.checked)}
                        className="mr-2"
                      />
                      <span>Polyp detected</span>
                    </Label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Label>
                        <span className="text-sm font-semibold">Histology</span>
                        <Select
                          className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                          value={form.histology}
                          onChange={(e) => setField("histology", e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="positive">Positive</option>
                          <option value="negative">Negative</option>
                        </Select>
                      </Label>

                      <Label>
                        <span className="text-sm font-semibold">Treatment Referral</span>
                        <Select
                          className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                          value={form.treatmentReferral}
                          onChange={(e) => setField("treatmentReferral", e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="referred">Referred</option>
                          <option value="not_referred">Not Referred</option>
                        </Select>
                      </Label>
                    </div>
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