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

type LiverScreeningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  visitId: number;
  onComplete: () => void;
};

const today = () => new Date().toISOString().split("T")[0];

export default function LiverScreeningModal({
  isOpen,
  onClose,
  visitId,
  onComplete,
}: LiverScreeningModalProps) {
  const [form, setForm] = useState({
    hbvStatus: "",
    hcvStatus: "",
    method: "uss",
    screeningDate: today(),
    screeningResult: "negative",
    afpValue: "",
    lesionDetected: false,
    treatmentReferral: "not_referred",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isAfp = form.method === "afp";
  const isUss = form.method === "uss";

  useEffect(() => {
    if (isOpen && visitId) {
      fetchExisting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, visitId]);

  async function fetchExisting() {
    try {
      const { data } = await api.get(`/visits/${visitId}/liver-screening`);
      const raw = data?.screening || data?.liverScreening || data?.data;

      if (raw) {
        setForm({
          hbvStatus: raw.hbvStatus ?? raw.hbv_status ?? "",
          hcvStatus: raw.hcvStatus ?? raw.hcv_status ?? "",
          method: raw.method ?? "uss",
          screeningDate:
            (raw.screeningDate ?? raw.screening_date ?? today()).toString().split("T")[0],
          screeningResult:
            raw.screeningResult ?? raw.screening_result ?? raw.result ?? "negative",
          afpValue: raw.afpValue ?? raw.afp_value ?? "",
          lesionDetected: !!(raw.lesionDetected ?? raw.lesion_detected),
          treatmentReferral:
            raw.treatmentReferral ?? raw.treatment_referral ?? raw.referral ?? "not_referred",
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
    if (!form.hbvStatus) newErrors.hbvStatus = "HBV status is required.";
    if (!form.hcvStatus) newErrors.hcvStatus = "HCV status is required.";
    if (!form.method) newErrors.method = "Method is required.";
    if (!form.screeningDate) newErrors.screeningDate = "Screening date is required.";
    if (!form.screeningResult) newErrors.screeningResult = "Result is required.";
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
      await api.post(`/visits/${visitId}/liver-screening`, {
        ...form,
        result: form.screeningResult,
        screeningResult: form.screeningResult,
        afpValue: isAfp && form.afpValue ? parseFloat(form.afpValue) : null,
        lesionDetected: isUss ? form.lesionDetected : false,
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
      toast.error(response?.message || "Unable to save liver screening.");
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
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full">
          <form onSubmit={handleSubmit}>
            {/* Header - Fixed */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Liver Screening
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
                {/* Viral Status */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Viral Hepatitis Status
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Label>
                      <span className="text-sm font-semibold">HBV Status</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.hbvStatus}
                        onChange={(e) => setField("hbvStatus", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                      </Select>
                      {errors.hbvStatus && <HelperText className="text-red-500">{errors.hbvStatus}</HelperText>}
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">HCV Status</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.hcvStatus}
                        onChange={(e) => setField("hcvStatus", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                      </Select>
                      {errors.hcvStatus && <HelperText className="text-red-500">{errors.hcvStatus}</HelperText>}
                    </Label>
                  </div>
                </div>

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
                        <option value="uss">USS (Ultrasound)</option>
                        <option value="afp">AFP (Alpha-Fetoprotein)</option>
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

                    {isAfp && (
                      <Label>
                        <span className="text-sm font-semibold">AFP Value (ng/mL)</span>
                        <Input
                          className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                          type="number"
                          step="0.1"
                          value={form.afpValue}
                          onChange={(e) => setField("afpValue", e.target.value)}
                          placeholder="Enter AFP value"
                        />
                      </Label>
                    )}

                    <Label className={isAfp ? "" : "md:col-span-2"}>
                      <span className="text-sm font-semibold">Result</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.screeningResult}
                        onChange={(e) => setField("screeningResult", e.target.value)}
                      >
                        <option value="negative">Negative</option>
                        <option value="positive">Positive</option>
                        <option value="suspicious">Suspicious</option>
                      </Select>
                      {errors.screeningResult && <HelperText className="text-red-500">{errors.screeningResult}</HelperText>}
                    </Label>
                  </div>
                </div>

                {/* Findings & Follow-up */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Findings & Follow-up
                  </h3>
                  <div className="space-y-4">
                    {isUss && (
                      <Label check className="flex items-center">
                        <Input
                          type="checkbox"
                          checked={form.lesionDetected}
                          onChange={(e) => setField("lesionDetected", e.target.checked)}
                          className="mr-2"
                        />
                        <span>Lesion detected</span>
                      </Label>
                    )}

                    <Label>
                      <span className="text-sm font-semibold">Treatment Referral</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.treatmentReferral}
                        onChange={(e) => setField("treatmentReferral", e.target.value)}
                      >
                        <option value="referred">Referred</option>
                        <option value="not_referred">Not Referred</option>
                      </Select>
                    </Label>
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