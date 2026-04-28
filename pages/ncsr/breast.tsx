import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Input, HelperText, Label, Select } from "@roketid/windmill-react-ui";
import toast from "react-hot-toast";

import SectionTitle from "../components/Typography/SectionTitle";
import ModulePageShell from "../components/ModulePageShell";
import api from "../../lib/api";

export default function BreastModulePage() {
  const router = useRouter();
  const { visitId } = router.query;

  const [form, setForm] = useState({
    method: "cbe",
    screeningDate: new Date().toISOString().split("T")[0],
    biradsScore: "",
    breastDensity: "",
    biopsyDone: false,
    histologyResult: "",
    referralOutcome: "",
    
    // Specific breast cancer risk factors (replacing "previous breast disease")
    hasBreastfed: "",
    breastfeedingDuration: "",
    hasBreastLumps: "",
    hasBreastDischarge: "",
    hasNippleDischarge: "",
    nippleDischargeType: "",
    hasSkinChanges: "",
    hasBreastPain: "",
    hasPreviousSurgery: "",
    hasPreviousBiopsy: "",
    ageAtFirstMenstruation: "",
    ageAtMenopause: "",
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
    if (!form.method) next.method = "Method is required.";
    if (!form.screeningDate) next.screeningDate = "Screening date is required.";
    if (form.biopsyDone && !form.histologyResult) {
      next.histologyResult =
        "Histology result is required when biopsy is done.";
    }
    return next;
  }

  async function fetchExisting() {
    if (!visitId) return;
    try {
      const { data } = await api.get(`/visits/${visitId}/breast-screening`);
      const raw = data?.screening || data?.breastScreening || data?.data;
      if (raw) {
        setForm({
          method: raw.method ?? "cbe",
          screeningDate:
            raw.screeningDate ??
            raw.screening_date ??
            new Date().toISOString().split("T")[0],
          biradsScore: raw.biradsScore ?? raw.birads_score ?? "",
          breastDensity: raw.breastDensity ?? raw.breast_density ?? "",
          biopsyDone: !!(raw.biopsyDone ?? raw.biopsy_done),
          histologyResult: raw.histologyResult ?? raw.histology_result ?? "",
          referralOutcome: raw.referralOutcome ?? raw.referral_outcome ?? "",
          
          // Risk factors
          hasBreastfed: raw.hasBreastfed ?? raw.has_breastfed ?? "",
          breastfeedingDuration: raw.breastfeedingDuration ?? raw.breastfeeding_duration ?? "",
          hasBreastLumps: raw.hasBreastLumps ?? raw.has_breast_lumps ?? "",
          hasBreastDischarge: raw.hasBreastDischarge ?? raw.has_breast_discharge ?? "",
          hasNippleDischarge: raw.hasNippleDischarge ?? raw.has_nipple_discharge ?? "",
          nippleDischargeType: raw.nippleDischargeType ?? raw.nipple_discharge_type ?? "",
          hasSkinChanges: raw.hasSkinChanges ?? raw.has_skin_changes ?? "",
          hasBreastPain: raw.hasBreastPain ?? raw.has_breast_pain ?? "",
          hasPreviousSurgery: raw.hasPreviousSurgery ?? raw.has_previous_surgery ?? "",
          hasPreviousBiopsy: raw.hasPreviousBiopsy ?? raw.has_previous_biopsy ?? "",
          ageAtFirstMenstruation: raw.ageAtFirstMenstruation ?? raw.age_at_first_menstruation ?? "",
          ageAtMenopause: raw.ageAtMenopause ?? raw.age_at_menopause ?? "",
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
      await api.post(`/visits/${visitId}/breast-screening`, {
        ...form,
        histologyResult: form.biopsyDone ? form.histologyResult : null,
        breastfeedingDuration: form.breastfeedingDuration ? parseInt(form.breastfeedingDuration) : null,
        ageAtFirstMenstruation: form.ageAtFirstMenstruation ? parseInt(form.ageAtFirstMenstruation) : null,
        ageAtMenopause: form.ageAtMenopause ? parseInt(form.ageAtMenopause) : null,
      });

      toast.success("Breast screening saved successfully.");
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
      const message = response?.message || "Unable to save breast screening.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModulePageShell
      title="Breast Screening"
      description="Record CBE, mammography, biopsy, histology, and specific breast health history for this visit."
      visitId={String(visitId)}
      submitting={submitting}
      submitLabel="Save Breast Screening"
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
            <span className="text-sm font-semibold">Method</span>
            <Select
              valid={errors.method ? false : undefined}
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.method}
              onChange={(e) => setField("method", e.target.value)}
            >
              <option value="cbe">CBE</option>
              <option value="mammography">Mammography</option>
              <option value="uss">USS</option>
            </Select>
            {errors.method ? (
              <HelperText valid={false}>{errors.method}</HelperText>
            ) : null}
          </Label>

          <Label>
            <span className="text-sm font-semibold">Screening Date</span>
            <Input
              valid={errors.screeningDate ? false : undefined}
              className="mt-2 rounded-2xl h-12 shadow-sm"
              type="date"
              value={form.screeningDate}
              onChange={(e) => setField("screeningDate", e.target.value)}
            />
            {errors.screeningDate ? (
              <HelperText valid={false}>{errors.screeningDate}</HelperText>
            ) : null}
          </Label>

          <Label>
            <span className="text-sm font-semibold">BIRADS Score</span>
            <Input
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.biradsScore}
              onChange={(e) => setField("biradsScore", e.target.value)}
              placeholder="Enter BIRADS score"
            />
          </Label>

          <Label>
            <span className="text-sm font-semibold">Breast Density</span>
            <Input
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.breastDensity}
              onChange={(e) => setField("breastDensity", e.target.value)}
              placeholder="Enter breast density"
            />
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
            <Label>
              <span className="text-sm font-semibold">Histology Result</span>
              <Select
                valid={errors.histologyResult ? false : undefined}
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.histologyResult}
                onChange={(e) => setField("histologyResult", e.target.value)}
              >
                <option value="">Select histology result</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </Select>
              {errors.histologyResult ? (
                <HelperText valid={false}>{errors.histologyResult}</HelperText>
              ) : null}
            </Label>
          ) : null}

          <Label>
            <span className="text-sm font-semibold">Referral Outcome</span>
            <Select
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.referralOutcome}
              onChange={(e) => setField("referralOutcome", e.target.value)}
            >
              <option value="">Select referral outcome</option>
              <option value="referred">Referred</option>
              <option value="not_referred">Not Referred</option>
            </Select>
          </Label>
        </div>
      </div>

      {/* Breast Cancer Risk Factors - Specific Symptoms */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
          <SectionTitle>Breast Health History</SectionTitle>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Specific symptoms and history (replaces vague "previous breast disease")
          </p>
        </div>

        <div className="px-5 py-6 sm:px-6 space-y-5">
          {/* Breastfeeding History */}
          <div className="grid gap-5 md:grid-cols-2">
            <Label>
              <span className="text-sm font-semibold">History of Breastfeeding</span>
              <Select
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.hasBreastfed}
                onChange={(e) => setField("hasBreastfed", e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </Label>

            {form.hasBreastfed === "yes" && (
              <Label>
                <span className="text-sm font-semibold">Breastfeeding Duration (months)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  min="0"
                  value={form.breastfeedingDuration}
                  onChange={(e) => setField("breastfeedingDuration", e.target.value)}
                  placeholder="Total months"
                />
              </Label>
            )}
          </div>

          {/* Current/Previous Breast Symptoms - Checkboxes */}
          <div>
            <span className="text-sm font-semibold block mb-3">Current or Previous Breast Symptoms</span>
            <div className="grid gap-3 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Breast Lumps</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hasBreastLumps}
                  onChange={(e) => setField("hasBreastLumps", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="current">Current</option>
                  <option value="previous">Previous</option>
                  <option value="none">None</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Breast Discharge</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hasBreastDischarge}
                  onChange={(e) => setField("hasBreastDischarge", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="current">Current</option>
                  <option value="previous">Previous</option>
                  <option value="none">None</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Nipple Discharge</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hasNippleDischarge}
                  onChange={(e) => setField("hasNippleDischarge", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="current">Current</option>
                  <option value="previous">Previous</option>
                  <option value="none">None</option>
                </Select>
              </Label>

              {(form.hasNippleDischarge === "current" || form.hasNippleDischarge === "previous") && (
                <Label>
                  <span className="text-sm font-semibold">Type of Nipple Discharge</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.nippleDischargeType}
                    onChange={(e) => setField("nippleDischargeType", e.target.value)}
                  >
                    <option value="">Select type</option>
                    <option value="bloody">Bloody</option>
                    <option value="clear">Clear</option>
                    <option value="milky">Milky</option>
                    <option value="purulent">Purulent</option>
                    <option value="other">Other</option>
                  </Select>
                </Label>
              )}

              <Label>
                <span className="text-sm font-semibold">Change in Skin Appearance</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hasSkinChanges}
                  onChange={(e) => setField("hasSkinChanges", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="current">Current</option>
                  <option value="previous">Previous</option>
                  <option value="none">None</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Breast Pain</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hasBreastPain}
                  onChange={(e) => setField("hasBreastPain", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="current">Current</option>
                  <option value="previous">Previous</option>
                  <option value="none">None</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Previous Breast Surgery</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hasPreviousSurgery}
                  onChange={(e) => setField("hasPreviousSurgery", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Previous Breast Biopsy</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hasPreviousBiopsy}
                  onChange={(e) => setField("hasPreviousBiopsy", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
            </div>
          </div>

          {/* Reproductive History */}
          <div className="border-t pt-5">
            <span className="text-sm font-semibold block mb-3">Reproductive History</span>
            <div className="grid gap-5 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Age at First Menstruation</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  min="0"
                  max="30"
                  value={form.ageAtFirstMenstruation}
                  onChange={(e) => setField("ageAtFirstMenstruation", e.target.value)}
                  placeholder="Enter age"
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
                  placeholder="Enter age or leave blank"
                />
              </Label>
            </div>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}