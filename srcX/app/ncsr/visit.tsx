import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Input,
  HelperText,
  Label,
  Select,
  Textarea,
  Button,
} from "@roketid/windmill-react-ui";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  ChevronRight,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "example/containers/Layout";
import PageTitle from "example/components/Typography/PageTitle";
import SectionTitle from "example/components/Typography/SectionTitle";
import api from "../../../lib/api";

type Client = {
  clientId: number;
  fullName: string;
  phoneNumber?: string | null;
};

export default function NewClientVisitPage() {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);

  const [form, setForm] = useState({
    visitDate: new Date().toISOString().split("T")[0],
    visitType: "initial",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function fetchClient() {
    if (!clientId) return;

    setLoadingClient(true);

    try {
      const { data } = await api.get(`/clients/${clientId}`);
      const rawClient = data?.client;

      setClient({
        clientId: rawClient.clientId ?? rawClient.id,
        fullName: rawClient.fullName ?? rawClient.full_name ?? "",
        phoneNumber: rawClient.phoneNumber ?? rawClient.phone_number ?? "",
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load client.");
    } finally {
      setLoadingClient(false);
    }
  }

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }

  function validate() {
    const newErrors: Record<string, string> = {};

    if (!form.visitDate) newErrors.visitDate = "Visit date is required.";
    if (!form.visitType) newErrors.visitType = "Visit type is required.";

    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please correct the required fields and try again.");
      return;
    }

    if (!clientId) return;

    setSubmitting(true);

    try {
      const { data } = await api.post(`/clients/${clientId}/visits`, {
        visitDate: form.visitDate,
        visitType: form.visitType,
        notes: form.notes,
      });

      toast.success("Screening visit created successfully.");
      router.push(`/nscr/visits?visitId=${data.visit.visitId}`);
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

      toast.error(response?.message || "Unable to create visit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>New Visit</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  National Cancer Screening Register
                </div>

                <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                  Create a visit for{" "}
                  {loadingClient ? "client..." : client?.fullName || "client"}
                </h2>

                <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                  Keep this step short. Create the visit first, then complete
                  any relevant screening modules.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Clients</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{client?.fullName || "Client"}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>New Visit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
            <SectionTitle>Client</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              This visit will be attached to the selected client automatically.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <UserRound className="w-4 h-4" />
                Selected Client
              </div>
              <p className="mt-2 font-semibold text-gray-800 dark:text-gray-100">
                {loadingClient ? "Loading..." : client?.fullName || "—"}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {client?.phoneNumber || "No phone number"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
            <SectionTitle>Visit Information</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Record only the essentials here.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
            <Label>
              <span className="text-sm font-semibold">Visit Date</span>
              <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                <Input
                  valid={errors.visitDate ? false : undefined}
                  className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                  type="date"
                  name="visitDate"
                  value={form.visitDate}
                  onChange={handleChange}
                />
                <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              {errors.visitDate ? (
                <HelperText valid={false}>{errors.visitDate}</HelperText>
              ) : null}
            </Label>

            <Label>
              <span className="text-sm font-semibold">Visit Type</span>
              <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                <Select
                  valid={errors.visitType ? false : undefined}
                  className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                  name="visitType"
                  value={form.visitType}
                  onChange={handleChange}
                >
                  <option value="initial">Initial Visit</option>
                  <option value="follow_up">Follow Up</option>
                </Select>
                <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              {errors.visitType ? (
                <HelperText valid={false}>{errors.visitType}</HelperText>
              ) : null}
            </Label>

            <Label className="md:col-span-2">
              <span className="text-sm font-semibold">Notes</span>
              <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                <Textarea
                  className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                  rows={5}
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Enter observations or visit notes..."
                />
                <div className="absolute top-3 left-4 pointer-events-none">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <HelperText>Optional. You can keep this brief.</HelperText>
            </Label>
          </div>
        </div>

        <div className="sticky bottom-0 z-10">
          <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl px-4 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                layout="outline"
                type="button"
                className="rounded-2xl h-11"
                onClick={() => router.back()}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                disabled={submitting}
              >
                <span className="inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Creating Visit..." : "Create Visit"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}
