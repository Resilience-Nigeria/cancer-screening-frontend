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

type ProstateScreeningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  visitId: number;
  onComplete: () => void;
};

export default function ProstateScreeningModal({
  isOpen,
  onClose,
  visitId,
  onComplete,
}: ProstateScreeningModalProps) {
  const [form, setForm] = useState({
    psaLevel: "",
    dreResult: "",
    ipssScore: "",
    
    // Specific urinary symptoms (from requirements)
    poorUrinaryStream: "",
    urgeIncontinence: "",
    delayStartingUrination: "",
    inabilityToHoldUrine: "",
    terminalDribbling: "",
    frequentDayUrination: "",
    nocturia: "",
    incompleteEmptying: "",
    bloodInUrine: "",
    
    // Additional
    biopsyDone: false,
    gleasonScore: "",
    referral: "",
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
      const { data } = await api.get(`/visits/${visitId}/prostate-screening`);
      const raw = data?.screening || data?.prostateScreening || data?.data;

      if (raw) {
        setForm({
          psaLevel: raw.psaLevel ?? raw.psa_level ?? "",
          dreResult: raw.dreResult ?? raw.dre_result ?? "",
          ipssScore: raw.ipssScore ?? raw.ipss_score ?? "",
          
          poorUrinaryStream: raw.poorUrinaryStream ?? raw.poor_urinary_stream ?? "",
          urgeIncontinence: raw.urgeIncontinence ?? raw.urge_incontinence ?? "",
          delayStartingUrination: raw.delayStartingUrination ?? raw.delay_starting_urination ?? "",
          inabilityToHoldUrine: raw.inabilityToHoldUrine ?? raw.inability_to_hold_urine ?? "",
          terminalDribbling: raw.terminalDribbling ?? raw.terminal_dribbling ?? "",
          frequentDayUrination: raw.frequentDayUrination ?? raw.frequent_day_urination ?? "",
          nocturia: raw.nocturia ?? "",
          incompleteEmptying: raw.incompleteEmptying ?? raw.incomplete_emptying ?? "",
          bloodInUrine: raw.bloodInUrine ?? raw.blood_in_urine ?? "",
          
          biopsyDone: !!(raw.biopsyDone ?? raw.biopsy_done),
          gleasonScore: raw.gleasonScore ?? raw.gleason_score ?? "",
          referral: raw.referral ?? "",
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
    if (form.biopsyDone && !form.gleasonScore) {
      newErrors.gleasonScore = "Gleason score is required when biopsy is done.";
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
      await api.post(`/visits/${visitId}/prostate-screening`, {
        ...form,
        psaLevel: form.psaLevel ? parseFloat(form.psaLevel) : null,
        ipssScore: form.ipssScore ? parseInt(form.ipssScore) : null,
        gleasonScore: form.biopsyDone ? form.gleasonScore : null,
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
      toast.error(response?.message || "Unable to save prostate screening.");
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
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full">
          <form onSubmit={handleSubmit}>
            {/* Header - Fixed */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Prostate Screening
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
                      <span className="text-sm font-semibold">PSA Level (ng/mL)</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        type="number"
                        step="0.01"
                        value={form.psaLevel}
                        onChange={(e) => setField("psaLevel", e.target.value)}
                        placeholder="Enter PSA level"
                      />
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">DRE Result</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.dreResult}
                        onChange={(e) => setField("dreResult", e.target.value)}
                      >
                        <option value="">Select</option>
<option value="negative">Normal (Negative)</option>
<option value="positive">Abnormal (Positive)</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">IPSS Score (0-35)</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        type="number"
                        min="0"
                        max="35"
                        value={form.ipssScore}
                        onChange={(e) => setField("ipssScore", e.target.value)}
                        placeholder="International Prostate Symptom Score"
                      />
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Referral</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.referral}
                        onChange={(e) => setField("referral", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="referred">Referred</option>
                        <option value="not_referred">Not Referred</option>
                      </Select>
                    </Label>
                  </div>
                </div>

                {/* Specific Urinary Symptoms */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Urinary Symptoms
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Label>
                      <span className="text-sm font-semibold">Poor Urinary Stream / Weak Stream</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.poorUrinaryStream}
                        onChange={(e) => setField("poorUrinaryStream", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Urge Incontinence (Sudden Strong Need)</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.urgeIncontinence}
                        onChange={(e) => setField("urgeIncontinence", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Delay in Starting Urination (Hesitancy)</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.delayStartingUrination}
                        onChange={(e) => setField("delayStartingUrination", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Inability to Hold Urine When Pressed</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.inabilityToHoldUrine}
                        onChange={(e) => setField("inabilityToHoldUrine", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Terminal Dribbling (Dribbling at End)</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.terminalDribbling}
                        onChange={(e) => setField("terminalDribbling", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Frequent Urination (Day)</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.frequentDayUrination}
                        onChange={(e) => setField("frequentDayUrination", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Nocturia (Frequent Urination at Night)</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.nocturia}
                        onChange={(e) => setField("nocturia", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Incomplete Bladder Emptying</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.incompleteEmptying}
                        onChange={(e) => setField("incompleteEmptying", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Blood in Urine (Hematuria)</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                        value={form.bloodInUrine}
                        onChange={(e) => setField("bloodInUrine", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Label>
                  </div>
                </div>

                {/* Additional Procedures */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Additional Procedures
                  </h3>
                  <div className="space-y-3">
                    <Label check className="flex items-center">
                      <Input
                        type="checkbox"
                        checked={form.biopsyDone}
                        onChange={(e) => setField("biopsyDone", e.target.checked)}
                        className="mr-2"
                      />
                      <span>Biopsy done</span>
                    </Label>

                    {form.biopsyDone && (
                      <Label>
                        <span className="text-sm font-semibold">Gleason Score</span>
                        <Input
                          className="mt-2 rounded-2xl h-12 shadow-sm w-full"
                          value={form.gleasonScore}
                          onChange={(e) => setField("gleasonScore", e.target.value)}
                          placeholder="Enter Gleason score (e.g., 3+4=7)"
                        />
                        {errors.gleasonScore && <HelperText className="text-red-500">{errors.gleasonScore}</HelperText>}
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