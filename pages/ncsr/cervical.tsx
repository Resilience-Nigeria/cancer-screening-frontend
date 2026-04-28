import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Input,
  HelperText,
  Label,
  Select,
  Button,
} from "@roketid/windmill-react-ui";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

import SectionTitle from "../components/Typography/SectionTitle";
import ModulePageShell from "../components/ModulePageShell";
import api from "../../lib/api";

export default function CervicalModulePage() {
  const router = useRouter();
  const { visitId } = router.query;

  const [form, setForm] = useState({
    method: "via",
    screeningDate: new Date().toISOString().split("T")[0],
    result: "negative",
    hpvResult: "",
    hpvGenotype: "",
    colposcopyDone: false,
    biopsyDone: false,
    biopsyResult: "",
    treatmentProvided: false,
    referralCompleted: false,
    
    // Cancer-specific risk factors
    moreThanOnePartner: "",
    ageAtFirstIntercourse: "",
    numberOfChildbirths: "",
    contraceptiveUse: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
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
    if (!form.result) next.result = "Result is required.";
    if (form.biopsyDone && !form.biopsyResult) {
      next.biopsyResult = "Biopsy result is required when biopsy is done.";
    }
    return next;
  }

  async function fetchExisting() {
    if (!visitId) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/visits/${visitId}/cervical-screening`);
      const raw = data?.screening || data?.cervicalScreening || data?.data;

      if (raw) {
        setForm({
          method: raw.method ?? "via",
          screeningDate:
            raw.screeningDate ??
            raw.screening_date ??
            new Date().toISOString().split("T")[0],
          result: raw.result ?? "negative",
          hpvResult: raw.hpvResult ?? raw.hpv_result ?? "",
          hpvGenotype: raw.hpvGenotype ?? raw.hpv_genotype ?? "",
          colposcopyDone: !!(raw.colposcopyDone ?? raw.colposcopy_done),
          biopsyDone: !!(raw.biopsyDone ?? raw.biopsy_done),
          biopsyResult: raw.biopsyResult ?? raw.biopsy_result ?? "",
          treatmentProvided: !!(
            raw.treatmentProvided ?? raw.treatment_provided
          ),
          referralCompleted: !!(
            raw.referralCompleted ?? raw.referral_completed
          ),
          
          // Risk factors
          moreThanOnePartner: raw.moreThanOnePartner ?? raw.more_than_one_partner ?? "",
          ageAtFirstIntercourse: raw.ageAtFirstIntercourse ?? raw.age_at_first_intercourse ?? "",
          numberOfChildbirths: raw.numberOfChildbirths ?? raw.number_of_childbirths ?? "",
          contraceptiveUse: raw.contraceptiveUse ?? raw.contraceptive_use ?? "",
        });
      }
    } catch {
      // no-op if empty/not found
    } finally {
      setLoading(false);
    }
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
      await api.post(`/visits/${visitId}/cervical-screening`, {
        ...form,
        biopsyResult: form.biopsyDone ? form.biopsyResult : null,
        ageAtFirstIntercourse: form.ageAtFirstIntercourse ? parseInt(form.ageAtFirstIntercourse) : null,
        numberOfChildbirths: form.numberOfChildbirths ? parseInt(form.numberOfChildbirths) : null,
      });

      toast.success("Cervical screening saved successfully.");
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
      const message = response?.message || "Unable to save cervical screening.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !visitId) return null;

  return (
    <ModulePageShell
      title="Cervical Screening"
      description="Record VIA, Pap, HPV, biopsy, treatment, and risk factors for this visit."
      visitId={String(visitId)}
      submitting={submitting}
      submitLabel="Save Cervical Screening"
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
              <option value="via">VIA</option>
              <option value="pap">Pap Smear</option>
              <option value="hpv">HPV</option>
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
            <span className="text-sm font-semibold">Result</span>
            <Select
              valid={errors.result ? false : undefined}
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.result}
              onChange={(e) => setField("result", e.target.value)}
            >
              <option value="negative">Negative</option>
              <option value="positive">Positive</option>
              <option value="suspicious">Suspicious</option>
            </Select>
            {errors.result ? (
              <HelperText valid={false}>{errors.result}</HelperText>
            ) : null}
          </Label>

          <Label>
            <span className="text-sm font-semibold">HPV Result</span>
            <Input
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.hpvResult}
              onChange={(e) => setField("hpvResult", e.target.value)}
              placeholder="Enter HPV result"
            />
          </Label>

          <Label className="md:col-span-2">
            <span className="text-sm font-semibold">HPV Genotype</span>
            <Input
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.hpvGenotype}
              onChange={(e) => setField("hpvGenotype", e.target.value)}
              placeholder="Enter genotype if applicable"
            />
          </Label>
        </div>
      </div>

      {/* Cancer-Specific Risk Factors */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
          <SectionTitle>Cervical Cancer Risk Factors</SectionTitle>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Specific risk factors for cervical cancer
          </p>
        </div>

        <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
          <Label>
            <span className="text-sm font-semibold">Sexual Partners (More than 1 partner)</span>
            <Select
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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
              className="mt-2 rounded-2xl h-12 shadow-sm"
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

      {/* Additional Procedures */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
          <SectionTitle>Additional Procedures & Follow-up</SectionTitle>
        </div>

        <div className="px-5 py-6 sm:px-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Label check>
              <Input
                type="checkbox"
                checked={form.colposcopyDone}
                onChange={(e) => setField("colposcopyDone", e.target.checked)}
              />
              <span className="ml-2">Colposcopy done</span>
            </Label>

            <Label check>
              <Input
                type="checkbox"
                checked={form.biopsyDone}
                onChange={(e) => setField("biopsyDone", e.target.checked)}
              />
              <span className="ml-2">Biopsy done</span>
            </Label>

            <Label check>
              <Input
                type="checkbox"
                checked={form.treatmentProvided}
                onChange={(e) =>
                  setField("treatmentProvided", e.target.checked)
                }
              />
              <span className="ml-2">Treatment provided</span>
            </Label>

            <Label check>
              <Input
                type="checkbox"
                checked={form.referralCompleted}
                onChange={(e) =>
                  setField("referralCompleted", e.target.checked)
                }
              />
              <span className="ml-2">Referral completed</span>
            </Label>
          </div>

          {form.biopsyDone ? (
            <Label>
              <span className="text-sm font-semibold">Biopsy Result</span>
              <Select
                valid={errors.biopsyResult ? false : undefined}
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.biopsyResult}
                onChange={(e) => setField("biopsyResult", e.target.value)}
              >
                <option value="">Select biopsy result</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </Select>
              {errors.biopsyResult ? (
                <HelperText valid={false}>{errors.biopsyResult}</HelperText>
              ) : null}
            </Label>
          ) : null}
        </div>
      </div>
    </ModulePageShell>
  );
}