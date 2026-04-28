import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Input, HelperText, Label, Select } from "@roketid/windmill-react-ui";
import toast from "react-hot-toast";

import SectionTitle from "../components/Typography/SectionTitle";
import ModulePageShell from "../components/ModulePageShell";
import api from "../../lib/api";

export default function ProstateModulePage() {
  const router = useRouter();
  const { visitId } = router.query;

  const [form, setForm] = useState({
    psaLevel: "",
    dreResult: "",
    ipssScore: "",
    biopsyDone: false,
    gleasonScore: "",
    referral: "",
    
    // Specific urinary symptoms (replacing vague "urinary symptoms")
    poorUrinaryStream: "",
    urgeIncontinence: "",
    delayStartingUrination: "",
    inabilityToHoldUrine: "",
    terminalDribbling: "",
    frequentDayUrination: "",
    nocturia: "",
    incompleteEmptying: "",
    bloodInUrine: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.biopsyDone && !form.gleasonScore) {
      next.gleasonScore = "Gleason score is required when biopsy is done.";
    }
    return next;
  }

  async function fetchExisting() {
    if (!visitId) return;
    try {
      const { data } = await api.get(`/visits/${visitId}/prostate-screening`);
      const raw = data?.screening || data?.prostateScreening || data?.data;
      if (raw) {
        setForm({
          psaLevel: raw.psaLevel ?? raw.psa_level ?? "",
          dreResult: raw.dreResult ?? raw.dre_result ?? "",
          ipssScore: raw.ipssScore ?? raw.ipss_score ?? "",
          biopsyDone: !!(raw.biopsyDone ?? raw.biopsy_done),
          gleasonScore: raw.gleasonScore ?? raw.gleason_score ?? "",
          referral: raw.referral ?? "",
          
          // Urinary symptoms
          poorUrinaryStream: raw.poorUrinaryStream ?? raw.poor_urinary_stream ?? "",
          urgeIncontinence: raw.urgeIncontinence ?? raw.urge_incontinence ?? "",
          delayStartingUrination: raw.delayStartingUrination ?? raw.delay_starting_urination ?? "",
          inabilityToHoldUrine: raw.inabilityToHoldUrine ?? raw.inability_to_hold_urine ?? "",
          terminalDribbling: raw.terminalDribbling ?? raw.terminal_dribbling ?? "",
          frequentDayUrination: raw.frequentDayUrination ?? raw.frequent_day_urination ?? "",
          nocturia: raw.nocturia ?? "",
          incompleteEmptying: raw.incompleteEmptying ?? raw.incomplete_emptying ?? "",
          bloodInUrine: raw.bloodInUrine ?? raw.blood_in_urine ?? "",
        });
      }
    } catch {}
  }

  useEffect(() => {
    fetchExisting();
  }, [visitId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please correct the required fields and try again.");
      return;
    }

    setSubmitting(true);
    setServerError("");

    try {
      await api.post(`/visits/${visitId}/prostate-screening`, {
        ...form,
        psaLevel: form.psaLevel ? Number(form.psaLevel) : null,
        ipssScore: form.ipssScore ? Number(form.ipssScore) : null,
        gleasonScore: form.biopsyDone ? form.gleasonScore : null,
      });

      toast.success("Prostate screening saved successfully.");
      router.push(`/ncsr/visits?visitId=${visitId}`);
    } catch (err: any) {
      const response = err?.response?.data;
      if (response?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(response.errors).forEach((key) => {
          if (
            Array.isArray(response.errors[key]) &&
            response.errors[key].length > 0
          ) {
            apiErrors[key] = response.errors[key][0];
          }
        });
        setErrors(apiErrors);
      }
      const message = response?.message || "Unable to save prostate screening.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModulePageShell
      title="Prostate Screening"
      description="Record PSA, DRE, biopsy, Gleason score, and specific urinary symptoms for this visit."
      visitId={String(visitId)}
      submitting={submitting}
      submitLabel="Save Prostate Screening"
      serverError={serverError}
      onSubmit={handleSubmit}
    >
      {/* Screening Details */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
          <SectionTitle>Screening Details</SectionTitle>
        </div>

        <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
          <Label>
            <span className="text-sm font-semibold">PSA Level</span>
            <Input
              className="mt-2 rounded-2xl h-12 shadow-sm"
              type="number"
              step="0.01"
              value={form.psaLevel}
              onChange={(e) => setField("psaLevel", e.target.value)}
              placeholder="Enter PSA level (ng/mL)"
            />
          </Label>

          <Label>
            <span className="text-sm font-semibold">DRE Result</span>
            <Select
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.dreResult}
              onChange={(e) => setField("dreResult", e.target.value)}
            >
              <option value="">Select DRE result</option>
              <option value="normal">Normal</option>
              <option value="abnormal">Abnormal</option>
              <option value="suspicious">Suspicious</option>
            </Select>
          </Label>

          <Label>
            <span className="text-sm font-semibold">IPSS Score</span>
            <Input
              className="mt-2 rounded-2xl h-12 shadow-sm"
              type="number"
              min="0"
              max="35"
              value={form.ipssScore}
              onChange={(e) => setField("ipssScore", e.target.value)}
              placeholder="International Prostate Symptom Score (0-35)"
            />
          </Label>

          <Label>
            <span className="text-sm font-semibold">Referral</span>
            <Select
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.referral}
              onChange={(e) => setField("referral", e.target.value)}
            >
              <option value="">Select referral</option>
              <option value="referred">Referred</option>
              <option value="not_referred">Not Referred</option>
            </Select>
          </Label>

          <Label check className="md:col-span-2">
            <Input
              type="checkbox"
              checked={form.biopsyDone}
              onChange={(e) => setField("biopsyDone", e.target.checked)}
            />
            <span className="ml-2">Biopsy done</span>
          </Label>

          {form.biopsyDone ? (
            <Label className="md:col-span-2">
              <span className="text-sm font-semibold">Gleason Score</span>
              <Input
                valid={errors.gleasonScore ? false : undefined}
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.gleasonScore}
                onChange={(e) => setField("gleasonScore", e.target.value)}
                placeholder="Enter Gleason score (e.g., 3+4=7)"
              />
              {errors.gleasonScore ? (
                <HelperText valid={false}>{errors.gleasonScore}</HelperText>
              ) : null}
            </Label>
          ) : null}
        </div>
      </div>

      {/* Specific Urinary Symptoms */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
          <SectionTitle>Urinary Symptoms</SectionTitle>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Specific urinary symptoms (replaces vague "urinary symptoms" field)
          </p>
        </div>

        <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
          <Label>
            <span className="text-sm font-semibold">Poor Urinary Stream / Weak Stream</span>
            <Select
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
    </ModulePageShell>
  );
}