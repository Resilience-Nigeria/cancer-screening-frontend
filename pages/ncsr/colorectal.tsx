import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Input, HelperText, Label, Select } from "@roketid/windmill-react-ui";
import toast from "react-hot-toast";

import SectionTitle from "../components/Typography/SectionTitle";
import ModulePageShell from "../components/ModulePageShell";
import api from "../../lib/api";

export default function ColorectalModulePage() {
  const router = useRouter();
  const { visitId } = router.query;

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
    return next;
  }

  async function fetchExisting() {
    if (!visitId) return;
    try {
      const { data } = await api.get(`/visits/${visitId}/colorectal-screening`);
      const raw = data?.screening || data?.colorectalScreening || data?.data;
      if (raw) {
        setForm({
          method: raw.method ?? "fit",
          screeningDate:
            raw.screeningDate ??
            raw.screening_date ??
            new Date().toISOString().split("T")[0],
          result: raw.result ?? "negative",
          polypDetected: !!(raw.polypDetected ?? raw.polyp_detected),
          histology: raw.histology ?? "",
          treatmentReferral:
            raw.treatmentReferral ?? raw.treatment_referral ?? "",
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
      await api.post(`/visits/${visitId}/colorectal-screening`, form);
      toast.success("Colorectal screening saved successfully.");
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
      const message =
        response?.message || "Unable to save colorectal screening.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModulePageShell
      title="Colorectal Screening"
      description="Record FIT, FOBT, colonoscopy, histology, and referral details for this visit."
      visitId={String(visitId)}
      submitting={submitting}
      submitLabel="Save Colorectal Screening"
      serverError={serverError}
      onSubmit={handleSubmit}
    >
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
              <option value="fit">FIT</option>
              <option value="fobt">FOBT</option>
              <option value="colonoscopy">Colonoscopy</option>
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

          <Label check>
            <Input
              type="checkbox"
              checked={form.polypDetected}
              onChange={(e) => setField("polypDetected", e.target.checked)}
            />
            <span className="ml-2">Polyp detected</span>
          </Label>

          <Label>
            <span className="text-sm font-semibold">Histology</span>
            <Select
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.histology}
              onChange={(e) => setField("histology", e.target.value)}
            >
              <option value="">Select histology</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </Select>
          </Label>

          <Label>
            <span className="text-sm font-semibold">Treatment Referral</span>
            <Select
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.treatmentReferral}
              onChange={(e) => setField("treatmentReferral", e.target.value)}
            >
              <option value="">Select treatment referral</option>
              <option value="referred">Referred</option>
              <option value="not_referred">Not Referred</option>
            </Select>
          </Label>
        </div>
      </div>
    </ModulePageShell>
  );
}
