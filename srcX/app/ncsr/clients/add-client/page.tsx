"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Input,
  HelperText,
  Label,
  Select,
  Textarea,
  Button,
} from "@roketid/windmill-react-ui";
import {
  User,
  CalendarDays,
  Phone,
  MapPin,
  Building2,
  FileText,
  Loader2,
  Users,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import Layout from "../../../containers/Layout";
import PageTitle from "../../../components/Typography/PageTitle";
import SectionTitle from "../../../components/Typography/SectionTitle";

import api from "../../../../../lib/api";
import toast from "react-hot-toast";

function AddClientPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    phoneNumber: "",
    screeningCategory: "new_client",
    state: "",
    lga: "",
    residence: "",
    registrationDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

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

    if (!form.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!form.gender) newErrors.gender = "Gender is required.";
    if (!form.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required.";
    if (!form.registrationDate) {
      newErrors.registrationDate = "Registration date is required.";
    }

    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setServerError("");

    try {
      await api.post("/clients", form);

      toast.success("Client created successfully.");
      router.push("/clients");
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
        response?.message || "Unable to create client. Please try again.";

      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Add Client</PageTitle>

        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
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
                  Register a new client
                </h2>

                <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                  Capture client demographic and registration information
                  clearly so screening, referrals, and follow-up can be tracked
                  accurately.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Clients</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>Add Client</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {serverError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {serverError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
            <SectionTitle>Personal Information</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Basic demographic details of the client.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Full Name</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Input
                    valid={errors.fullName ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                {errors.fullName ? (
                  <HelperText valid={false}>{errors.fullName}</HelperText>
                ) : null}
              </Label>

              <Label>
                <span className="text-sm font-semibold">Gender</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Select
                    valid={errors.gender ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </Select>
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                {errors.gender ? (
                  <HelperText valid={false}>{errors.gender}</HelperText>
                ) : null}
              </Label>

              <Label>
                <span className="text-sm font-semibold">Date of Birth</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Input
                    valid={errors.dateOfBirth ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                </div>
                {errors.dateOfBirth ? (
                  <HelperText valid={false}>{errors.dateOfBirth}</HelperText>
                ) : null}
              </Label>

              <Label>
                <span className="text-sm font-semibold">Phone Number</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Input
                    valid={errors.phoneNumber ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="08012345678"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <Phone className="w-4 h-4" />
                  </div>
                </div>
              </Label>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
            <SectionTitle>Registration Details</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Screening registration and location details.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Client Category</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Select
                    valid={errors.screeningCategory ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    name="screeningCategory"
                    value={form.screeningCategory}
                    onChange={handleChange}
                  >
                    <option value="new_client">New Client</option>
                    <option value="follow_up">Follow Up</option>
                  </Select>
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Registration Date</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Input
                    valid={errors.registrationDate ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    type="date"
                    name="registrationDate"
                    value={form.registrationDate}
                    onChange={handleChange}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                </div>
                {errors.registrationDate ? (
                  <HelperText valid={false}>
                    {errors.registrationDate}
                  </HelperText>
                ) : null}
              </Label>

              <Label>
                <span className="text-sm font-semibold">State</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Input
                    valid={errors.state ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </Label>

              <Label>
                <span className="text-sm font-semibold">LGA</span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Input
                    valid={errors.lga ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    name="lga"
                    value={form.lga}
                    onChange={handleChange}
                    placeholder="Enter local government area"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
              </Label>

              <Label className="md:col-span-2">
                <span className="text-sm font-semibold">
                  Residence / Address
                </span>
                <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                  <Input
                    valid={errors.residence ? false : undefined}
                    className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 h-12 shadow-sm"
                    name="residence"
                    value={form.residence}
                    onChange={handleChange}
                    placeholder="Enter residential address"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center ml-4 pointer-events-none">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </Label>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
            <SectionTitle>Additional Notes</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Optional remarks for this client’s registration.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <Label>
              <span className="text-sm font-semibold">Notes</span>
              <div className="relative mt-2 text-gray-500 focus-within:text-green-600">
                <Textarea
                  valid={errors.notes ? false : undefined}
                  className="pl-11 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                  rows={5}
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Enter any relevant notes about the client..."
                />
                <div className="absolute top-3 left-4 pointer-events-none">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <HelperText>
                Optional. Use this for registration remarks or other useful
                notes.
              </HelperText>
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
                  {submitting ? "Saving Client..." : "Create Client"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}

export default AddClientPage;
