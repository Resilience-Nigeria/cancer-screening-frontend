import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Input, HelperText, Label, Select } from "@roketid/windmill-react-ui";
import toast from "react-hot-toast";

import SectionTitle from "../components/Typography/SectionTitle";
import ModulePageShell from "../components/ModulePageShell";
import api from "../../lib/api";

export default function LiverModulePage() {
  const router = useRouter();
  const { visitId } = router.query;

  const [form, setForm] = useState({
    hbvStatus: "negative",
    hcvStatus: "negative",
    method: "uss",
    afpValue: "",
    lesionDetected: false,
    referral: "",
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
    if (!form.hbvStatus) next.hbvStatus = "HBV status is required.";
    if (!form.hcvStatus) next.hcvStatus = "HCV status is required.";
    if (!form.method) next.method = "Method is required.";
    return next;
  }

  async function fetchExisting() {
    if (!visitId) return;
    try {
      const { data } = await api.get(`/visits/${visitId}/liver-screening`);
      const raw = data?.screening || data?.liverScreening || data?.data;
      if (raw) {
        setForm({
          hbvStatus: raw.hbvStatus ?? raw.hbv_status ?? "negative",
          hcvStatus: raw.hcvStatus ?? raw.hcv_status ?? "negative",
          method: raw.method ?? "uss",
          afpValue: raw.afpValue ?? raw.afp_value ?? "",
          lesionDetected: !!(raw.lesionDetected ?? raw.lesion_detected),
          referral: raw.referral ?? "",
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
      await api.post(`/visits/${visitId}/liver-screening`, {
        ...form,
        afpValue: form.afpValue ? Number(form.afpValue) : null,
      });

      toast.success("Liver screening saved successfully.");
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
      const message = response?.message || "Unable to save liver screening.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModulePageShell
      title="Liver Screening"
      description="Record HBV/HCV status, AFP, USS findings, and referral details for this visit."
      visitId={String(visitId)}
      submitting={submitting}
      submitLabel="Save Liver Screening"
      serverError={serverError}
      onSubmit={handleSubmit}
    >
      <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
          <SectionTitle>Screening Details</SectionTitle>
        </div>

        <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
          <Label>
            <span className="text-sm font-semibold">HBV Status</span>
            <Select
              valid={errors.hbvStatus ? false : undefined}
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.hbvStatus}
              onChange={(e) => setField("hbvStatus", e.target.value)}
            >
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </Select>
            {errors.hbvStatus ? (
              <HelperText valid={false}>{errors.hbvStatus}</HelperText>
            ) : null}
          </Label>

          <Label>
            <span className="text-sm font-semibold">HCV Status</span>
            <Select
              valid={errors.hcvStatus ? false : undefined}
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.hcvStatus}
              onChange={(e) => setField("hcvStatus", e.target.value)}
            >
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </Select>
            {errors.hcvStatus ? (
              <HelperText valid={false}>{errors.hcvStatus}</HelperText>
            ) : null}
          </Label>

          <Label>
            <span className="text-sm font-semibold">Method</span>
            <Select
              valid={errors.method ? false : undefined}
              className="mt-2 rounded-2xl h-12 shadow-sm"
              value={form.method}
              onChange={(e) => setField("method", e.target.value)}
            >
              <option value="uss">USS</option>
              <option value="afp">AFP</option>
            </Select>
            {errors.method ? (
              <HelperText valid={false}>{errors.method}</HelperText>
            ) : null}
          </Label>

          <Label>
            <span className="text-sm font-semibold">AFP Value</span>
            <Input
              className="mt-2 rounded-2xl h-12 shadow-sm"
              type="number"
              step="0.01"
              value={form.afpValue}
              onChange={(e) => setField("afpValue", e.target.value)}
              placeholder="Enter AFP value"
            />
          </Label>

          <Label check>
            <Input
              type="checkbox"
              checked={form.lesionDetected}
              onChange={(e) => setField("lesionDetected", e.target.checked)}
            />
            <span className="ml-2">Lesion detected</span>
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
        </div>
      </div>
    </ModulePageShell>
  );
}
