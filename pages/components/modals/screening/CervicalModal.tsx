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

type CervicalScreeningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  visitId: number;
  onComplete: () => void;
};

const today = () => new Date().toISOString().split("T")[0];

export default function CervicalScreeningModal({
  isOpen,
  onClose,
  visitId,
  onComplete,
}: CervicalScreeningModalProps) {
  const [form, setForm] = useState({
    method: "via",
    screeningDate: today(),
    screeningResult: "negative",
    hpvResult: "",
    hpvGenotype: "",
    colposcopyDone: false,
    biopsyDone: false,
    biopsyResult: "",
    treatmentReferral: "not_referred",

    moreThanOnePartner: "",
    ageAtFirstIntercourse: "",
    numberOfChildbirths: "",
    contraceptiveUse: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isHpv = form.method === "hpv";

  useEffect(() => {
    if (isOpen && visitId) {
      fetchExisting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, visitId]);

  async function fetchExisting() {
    try {
      const { data } = await api.get(`/visits/${visitId}/cervical-screening`);
      const raw = data?.screening || data?.cervicalScreening || data?.data;

      if (raw) {
        setForm({
          method: raw.method ?? "via",
          screeningDate:
            (raw.screeningDate ?? raw.screening_date ?? today()).toString().split("T")[0],
          screeningResult:
            raw.screeningResult ?? raw.screening_result ?? raw.result ?? "negative",
          hpvResult: raw.hpvResult ?? raw.hpv_result ?? "",
          hpvGenotype: raw.hpvGenotype ?? raw.hpv_genotype ?? "",
          colposcopyDone: !!(raw.colposcopyDone ?? raw.colposcopy_done),
          biopsyDone: !!(raw.biopsyDone ?? raw.biopsy_done),
          biopsyResult: raw.biopsyResult ?? raw.biopsy_result ?? "",
          treatmentReferral: raw.treatmentReferral ?? raw.treatment_referral ?? "not_referred",

          moreThanOnePartner: raw.moreThanOnePartner ?? raw.more_than_one_partner ?? "",
          ageAtFirstIntercourse: raw.ageAtFirstIntercourse ?? raw.age_at_first_intercourse ?? "",
          numberOfChildbirths: raw.numberOfChildbirths ?? raw.number_of_childbirths ?? "",
          contraceptiveUse: raw.contraceptiveUse ?? raw.contraceptive_use ?? "",
        });
      }
    } catch (err) {
      // No existing data, keep defaults
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
    if (!form.screeningResult) newErrors.screeningResult = "Result is required.";
    if (form.biopsyDone && !form.biopsyResult) {
      newErrors.biopsyResult = "Biopsy result is required when biopsy is done.";
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
      await api.post(`/visits/${visitId}/cervical-screening`, {
        ...form,
        result: form.screeningResult,
        screeningResult: form.screeningResult,
        hpvResult: isHpv ? form.hpvResult || null : null,
        hpvGenotype: isHpv ? form.hpvGenotype || null : null,
        biopsyResult: form.biopsyDone ? form.biopsyResult : null,
        ageAtFirstIntercourse: form.ageAtFirstIntercourse
          ? parseInt(form.ageAtFirstIntercourse)
          : null,
        numberOfChildbirths: form.numberOfChildbirths
          ? parseInt(form.numberOfChildbirths)
          : null,
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
      toast.error(response?.message || "Unable to save cervical screening.");
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
                Cervical Screening
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
                        <option value="via">VIA</option>
                        <option value="pap">Pap Smear</option>
                        <option value="hpv">HPV</option>
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
                        value={form.screeningResult}
                        onChange={(e) => setField("screeningResult", e.target.value)}
                      >
                        <option value="negative">Negative</option>
                        <option value="positive">Positive</option>
                        <option value="suspicious">Suspicious</option>
                      </Select>
                      {errors.screeningResult && <HelperText className="text-red-500">{errors.screeningResult}</HelperText>}
                    </Label>

                    {isHpv && (
                      <>
                        <Label>
                          <span className="text-sm font-semibold">HPV Result</span>
                          <Select
                            className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                            value={form.hpvResult}
                            onChange={(e) => setField("hpvResult", e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="positive">Positive</option>
                            <option value="negative">Negative</option>
                          </Select>
                        </Label>

                        <Label>
                          <span className="text-sm font-semibold">HPV Genotype</span>
                          <Input
                            className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                            value={form.hpvGenotype}
                            onChange={(e) => setField("hpvGenotype", e.target.value)}
                            placeholder="e.g. 16, 18"
                          />
                        </Label>
                      </>
                    )}
                  </div>
                </div>

                {/* Risk Factors */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Cervical Cancer Risk Factors
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Label>
                      <span className="text-sm font-semibold">More than 1 Sexual Partner</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.moreThanOnePartner}
                        onChange={(e) => setField("moreThanOnePartner", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Age at First Intercourse</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        type="number"
                        min="0"
                        max="100"
                        value={form.ageAtFirstIntercourse}
                        onChange={(e) => setField("ageAtFirstIntercourse", e.target.value)}
                        placeholder="Enter age"
                      />
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Number of Childbirths</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        type="number"
                        min="0"
                        value={form.numberOfChildbirths}
                        onChange={(e) => setField("numberOfChildbirths", e.target.value)}
                        placeholder="Enter number"
                      />
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Contraceptive Use</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.contraceptiveUse}
                        onChange={(e) => setField("contraceptiveUse", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="none">None</option>
                        <option value="oral_contraceptives">Oral Contraceptives</option>
                        <option value="iud">IUD</option>
                        <option value="barrier_methods">Barrier Methods</option>
                        <option value="other">Other</option>
                      </Select>
                    </Label>
                  </div>
                </div>

                {/* Procedures & Follow-up */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Procedures & Follow-up
                  </h3>
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Label check className="flex items-center">
                        <Input
                          type="checkbox"
                          checked={form.colposcopyDone}
                          onChange={(e) => setField("colposcopyDone", e.target.checked)}
                          className="mr-2"
                        />
                        <span>Colposcopy done</span>
                      </Label>

                      <Label check className="flex items-center">
                        <Input
                          type="checkbox"
                          checked={form.biopsyDone}
                          onChange={(e) => setField("biopsyDone", e.target.checked)}
                          className="mr-2"
                        />
                        <span>Biopsy done</span>
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
                          <option value="">Select biopsy result</option>
                          <option value="positive">Positive</option>
                          <option value="negative">Negative</option>
                        </Select>
                        {errors.biopsyResult && <HelperText className="text-red-500">{errors.biopsyResult}</HelperText>}
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