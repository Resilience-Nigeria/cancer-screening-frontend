"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Input,
  Button,
  Badge,
  Pagination,
  Label,
  Select,
  Textarea,
} from "@roketid/windmill-react-ui";
import {
  Search,
  Users,
  Phone,
  MapPin,
  CalendarDays,
  Eye,
  Plus,
  X,
  Edit,
  Stethoscope,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { 
  nigerianStates, 
  lgasByState, 
  getStateCode, 
  getLGACode 
} from "../../lib/nigerianstates";
import { nextToolFor } from "../../lib/referralStage";
import BiodataExtraFields from "../components/BiodataExtraFields";

const OCCUPATION_OPTIONS = [
  "Farmer/Agriculture",
  "Trader/Business Owner",
  "Civil Servant",
  "Teacher/Educator",
  "Healthcare Worker",
  "Artisan/Skilled Trade",
  "Driver/Transport",
  "Military/Security",
  "Religious Worker",
  "Student",
  "Homemaker",
  "Retired",
  "Unemployed",
  "Other",
]; // keep in step with the list on the clinical screening page

type Client = {
  id: number;
  clientId: string;
  fullName: string;
  gender: string;
  phoneNumber?: string | null;
  email?: string | null;
  nin?: string | null;
  hospitalNumber?: string | null;
  phoneNotClients?: boolean;
  caregiverName?: string | null;
  caregiverPhoneNumber?: string | null;
  occupation?: string | null;
  religion?: string | null;
  religionOther?: string | null;
  maritalStatus?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  nextOfKinRelationship?: string | null;
  screeningCategory?: string;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  stateOfResidence?: string | null;
  lgaOfResidence?: string | null;
  address?: string | null;
  landmark?: string | null;
  registrationDate?: string | null;
  dateOfBirth?: string | null;
  dobEstimated?: boolean;
  offlineId?: string | null;
  latestReferral?: {
    referralId: number;
    referralType: string;
    status: string;
  } | null;
};

type ClientsResponse = {
  data?: any[];
  clients?: any[];
  total?: number;
};

type ClientForm = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  dobMode: "date" | "age";
  age: string;
  hasCaregiver: boolean;
  phoneNumber: string;
  email: string;
  nin: string;
  hospitalNumber: string;
  phoneNotClients: boolean;
  caregiverName: string;
  caregiverPhoneNumber: string;
  occupation: string;
  religion: string;
  religionOther: string;
  maritalStatus: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  screeningCategory: string;
  stateOfOrigin: string;
  lgaOfOrigin: string;
  stateOfResidence: string;
  lgaOfResidence: string;
  address: string;
  landmark: string;
  registrationDate: string;
};

function formatCategory(value?: string | null) {
  if (!value) return "—";
  if (value === "new_client" || value === "newClient") return "New Client";
  if (value === "follow_up" || value === "followUp") return "Follow Up";
  return value;
}

function getCategoryBadgeType(value?: string | null) {
  if (value === "new_client" || value === "newClient") return "success";
  if (value === "follow_up" || value === "followUp") return "warning";
  return "primary";
}

const initialFormData: ClientForm = {
  fullName: "",
  gender: "",
  dateOfBirth: "",
  dobMode: "date",
  age: "",
  hasCaregiver: false,
  phoneNumber: "",
  email: "",
  nin: "",
  hospitalNumber: "",
  phoneNotClients: false,
  caregiverName: "",
  caregiverPhoneNumber: "",
  occupation: "",
  religion: "",
  religionOther: "",
  maritalStatus: "",
  nextOfKinName: "",
  nextOfKinPhone: "",
  nextOfKinRelationship: "",
  screeningCategory: "",
  stateOfOrigin: "",
  lgaOfOrigin: "",
  stateOfResidence: "",
  lgaOfResidence: "",
  address: "",
  landmark: "",
  registrationDate: new Date().toISOString().split("T")[0],
};

export default function ClientsIndexPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  const [formData, setFormData] = useState<ClientForm>(initialFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const resultsPerPage = 10;

  async function fetchClients() {
    setLoading(true);

    try {
      const { data } = await api.get<ClientsResponse>("/clients", {
        params: { page, search },
      });

      const rawClients = data?.data || data?.clients || [];

      const mappedClients: Client[] = rawClients.map((client: any) => ({
        id: client.id,
        clientId: client.clientId ?? client.id,
        fullName: client.fullName ?? client.full_name ?? "",
        gender: client.gender ?? "",
        phoneNumber: client.phoneNumber ?? client.phone_number ?? "",
        email: client.email ?? "",
        nin: client.nin ?? "",
        hospitalNumber: client.hospitalNumber ?? "",
        phoneNotClients: !!client.phoneNotClients,
        caregiverName: client.caregiverName ?? "",
        caregiverPhoneNumber: client.caregiverPhoneNumber ?? "",
        occupation: client.occupation ?? "",
        religion: client.religion ?? "",
        religionOther: client.religionOther ?? "",
        maritalStatus: client.maritalStatus ?? "",
        nextOfKinName: client.nextOfKinName ?? "",
        nextOfKinPhone: client.nextOfKinPhone ?? "",
        nextOfKinRelationship: client.nextOfKinRelationship ?? "",
        screeningCategory:
          client.screeningCategory ?? client.screening_category ?? "",
        stateOfOrigin: client.stateOfOrigin ?? client.state_of_origin ?? "",
        lgaOfOrigin: client.lgaOfOrigin ?? client.lga_of_origin ?? "",
        stateOfResidence: client.stateOfResidence ?? client.state_of_residence ?? "",
        lgaOfResidence: client.lgaOfResidence ?? client.lga_of_residence ?? "",
        address: client.address ?? "",
        landmark: client.landmark ?? "",
        registrationDate:
          client.registrationDate ?? client.registration_date ?? "",
        dateOfBirth: client.dateOfBirth ?? client.date_of_birth ?? "",
        dobEstimated: !!client.dobEstimated,
        offlineId: client.offlineId ?? null,
        latestReferral: client.latestReferral ?? client.latest_referral ?? null,
      }));

      setClients(mappedClients);
      setTotalResults(data?.total || mappedClients.length || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, [page, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  // "Add Client" now goes straight into Stage 2 (Clinical Screening) instead
  // of this page's own modal or the old screening-wizard — Stage 2 already
  // includes the consent step (OTP), biodata, risk profile, and screening
  // in one seamless flow. The modal is retained only for editing existing
  // client records (see openEditModal).
  function openModal() {
    router.push("/ncsr/clinical-screening?new=1");
  }

  
  // Add this helper function near the top of the component, after the type definitions
function formatDateForInput(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    // Extract just the date part if it's in ISO format
    const dateOnly = dateString.split('T')[0];
    return dateOnly;
  } catch (e) {
    return "";
  }
}

// Then update openEditModal to use it:
function openEditModal(client: Client) {
  setEditingClient(client);
  setFormErrors([]);
  setFormData({
    fullName: client.fullName || "",
    gender: client.gender || "",
    dateOfBirth: formatDateForInput(client.dateOfBirth),
    dobMode: client.dobEstimated ? "age" : "date",
    age: client.dobEstimated && client.dateOfBirth
      ? String(Math.max(0, new Date().getFullYear() - new Date(client.dateOfBirth).getFullYear()))
      : "",
    hasCaregiver: !!(client.caregiverName || client.caregiverPhoneNumber || client.phoneNotClients),
    phoneNumber: client.phoneNumber || "",
    email: client.email || "",
    nin: client.nin || "",
    hospitalNumber: client.hospitalNumber || "",
    phoneNotClients: !!client.phoneNotClients,
    caregiverName: client.caregiverName || "",
    caregiverPhoneNumber: client.caregiverPhoneNumber || "",
    occupation: client.occupation || "",
    religion: client.religion || "",
    religionOther: client.religionOther || "",
    maritalStatus: client.maritalStatus || "",
    nextOfKinName: client.nextOfKinName || "",
    nextOfKinPhone: client.nextOfKinPhone || "",
    nextOfKinRelationship: client.nextOfKinRelationship || "",
    screeningCategory: client.screeningCategory || "",
    stateOfOrigin: client.stateOfOrigin || "",
    lgaOfOrigin: client.lgaOfOrigin || "",
    stateOfResidence: client.stateOfResidence || "",
    lgaOfResidence: client.lgaOfResidence || "",
    address: client.address || "",
    landmark: client.landmark || "",
    registrationDate: formatDateForInput(client.registrationDate),
  });
  setIsModalOpen(true);
}

  function closeModal() {
    setFormErrors([]);
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData(initialFormData);
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      // Reset LGA when state changes
      if (name === "stateOfOrigin") {
        newData.lgaOfOrigin = "";
      }
      if (name === "stateOfResidence") {
        newData.lgaOfResidence = "";
      }
      
      return newData;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Caregiver details only count when "Do you have a caregiver?" is ticked.
    const clientPhone = formData.phoneNumber.trim();
    const caregiverPhone = formData.hasCaregiver ? formData.caregiverPhoneNumber.trim() : "";
    const caregiverName = formData.hasCaregiver ? formData.caregiverName.trim() : "";
    if (!clientPhone && !caregiverPhone) {
      toast.error(
        formData.hasCaregiver
          ? "Enter the client's phone number or the caregiver's phone number."
          : "Enter the client's phone number."
      );
      return;
    }

    const { dobMode, age, hasCaregiver, ...rest } = formData;
    if (dobMode === "age") {
      const n = Number(age);
      if (!age.trim() || !Number.isFinite(n) || n < 0 || n > 120) {
        toast.error("Enter a valid age (0 - 120).");
        return;
      }
    } else if (!formData.dateOfBirth) {
      toast.error("Enter a date of birth, or switch to Age.");
      return;
    }

    const payload: Record<string, any> = {
      ...rest,
      phoneNumber: clientPhone || caregiverPhone,
      phoneNotClients: hasCaregiver && (formData.phoneNotClients || (!clientPhone && !!caregiverPhone)),
      caregiverName: caregiverName || null,
      caregiverPhoneNumber: caregiverPhone || null,
    };
    if (dobMode === "age") {
      // The server converts the age into a birth year and flags the date as estimated.
      delete payload.dateOfBirth;
      payload.age = Number(age);
    } else {
      payload.dobEstimated = false;
    }
    // These two are validated as "required when present", so leave them out instead of sending blanks.
    if (!payload.screeningCategory) delete payload.screeningCategory;
    if (!payload.registrationDate) delete payload.registrationDate;

    setIsSubmitting(true);
    setFormErrors([]);

    try {
      if (editingClient) {
        // Details only. This never creates a visit.
        await api.patch(`/clients/${editingClient.clientId}`, payload);
        toast.success("Client details updated.");
      } else {
        await api.post("/clients", payload);
        toast.success("Client added successfully!");
      }
      closeModal();
      fetchClients(); // Refresh the list
    } catch (err: any) {
      // Keep the modal open and everything typed; list exactly what the server rejected.
      const errors = err?.response?.data?.errors;
      if (errors && typeof errors === "object") {
        setFormErrors(Array.from(new Set(Object.values(errors).flat().map(String))));
        toast.error("Some details need fixing. Nothing you entered has been lost.");
      } else {
        toast.error(
          err?.response?.data?.message ||
            `Failed to ${editingClient ? "update" : "add"} client. Please try again.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Clients</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                National Cancer Screening Register
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                Registered clients
              </h2>

              <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                Search and open a client record, then create a visit directly
                from the client profile.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <Input
                className="pl-11 h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                placeholder="Search by name, phone, Client ID or hospital number"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </form>

          <div className="flex gap-3">
            <Button
              className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              onClick={handleSearchSubmit as any}
            >
              Search
            </Button>

            <Button
              className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              onClick={openModal}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Client
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="fixed inset-0"
            onClick={closeModal}
            aria-hidden="true"
          />
          
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                <div className="space-y-5">
                  {formErrors.length > 0 && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <p className="font-semibold">Please fix the following (everything you entered is still here):</p>
                      <ul className="mt-1 list-disc pl-5 space-y-0.5">
                        {formErrors.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {editingClient && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      Editing {editingClient.clientId}. Saving updates this client&apos;s details only; no visit is recorded.
                    </p>
                  )}
                  {/* Full Name */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name <span className="text-red-500">*</span>
                      </span>
                      <Input
                        name="ncsr-client-fullname"
                        autoComplete="off"
                        data-lpignore="true"
                        value={formData.fullName}
                        onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                        className="mt-1 rounded-xl"
                        placeholder="Enter full name"
                        required
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>

                  {/* Gender and Date of Birth */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Gender <span className="text-red-500">*</span>
                      </span>
                      <Select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        required
                        disabled={isSubmitting}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </Select>
                    </Label>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formData.dobMode === "age" ? "Age" : "Date of Birth"} <span className="text-red-500">*</span>
                        </span>
                        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs">
                          {(["date", "age"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setFormData((p) => ({ ...p, dobMode: m }))}
                              className={`px-3 py-1 ${formData.dobMode === m ? "bg-green-700 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
                            >
                              {m === "date" ? "Date of birth" : "Age"}
                            </button>
                          ))}
                        </div>
                      </div>
                      {formData.dobMode === "age" ? (
                        <>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={120}
                            name="age"
                            value={formData.age}
                            onChange={handleInputChange}
                            className="mt-1 rounded-xl"
                            placeholder="Age in years"
                            disabled={isSubmitting}
                          />
                          {formData.age && Number(formData.age) >= 0 && Number(formData.age) <= 120 ? (
                            <p className="mt-1 text-xs text-gray-500">
                              Recorded as born in {new Date().getFullYear() - Number(formData.age)} (estimated).
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <Input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          max={new Date().toISOString().split("T")[0]}
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  </div>

                  {/* Phone number + caregiver */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone Number{formData.hasCaregiver && formData.caregiverPhoneNumber.trim() ? "" : <span className="text-red-500"> *</span>}
                      </span>
                      <Input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        placeholder="Enter phone number"
                        type="tel"
                        disabled={isSubmitting}
                      />
                    </Label>
                    <label className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={formData.hasCaregiver}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            hasCaregiver: e.target.checked,
                            ...(e.target.checked ? {} : { caregiverName: "", caregiverPhoneNumber: "", phoneNotClients: false }),
                          }))
                        }
                        disabled={isSubmitting}
                      />
                      Does the client have a caregiver?
                    </label>
                    {formData.hasCaregiver ? (
                      <>
                        <label className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={formData.phoneNotClients}
                            onChange={(e) => setFormData((p) => ({ ...p, phoneNotClients: e.target.checked }))}
                            disabled={isSubmitting}
                          />
                          The phone number above belongs to the caregiver
                        </label>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Caregiver&apos;s Name <span className="text-gray-400 font-normal">(optional)</span>
                        </span>
                        <Input
                          name="ncsr-caregiver-name"
                          autoComplete="off"
                          data-lpignore="true"
                          value={formData.caregiverName}
                          onChange={(e) => setFormData((p) => ({ ...p, caregiverName: e.target.value }))}
                          className="mt-1 rounded-xl"
                          disabled={isSubmitting}
                        />
                      </Label>
                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Caregiver&apos;s Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                        </span>
                        <Input
                          name="caregiverPhoneNumber"
                          type="tel"
                          value={formData.caregiverPhoneNumber}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          disabled={isSubmitting}
                        />
                      </Label>
                    </div>
                      </>
                    ) : null}
                  </div>

                  {/* Email Address */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Address <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <Input
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        placeholder="Enter email address"
                        type="email"
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>

                  {/* NIN + Hospital number (both optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        NIN <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <Input
                        name="nin"
                        value={formData.nin}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        placeholder="National Identification Number"
                        inputMode="numeric"
                        maxLength={11}
                        autoComplete="off"
                        disabled={isSubmitting}
                      />
                    </Label>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Hospital Number <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <Input
                        name="ncsr-hospital-number"
                        value={formData.hospitalNumber}
                        onChange={(e) => setFormData((p) => ({ ...p, hospitalNumber: e.target.value }))}
                        className="mt-1 rounded-xl"
                        placeholder="Facility folder / file number"
                        autoComplete="off"
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>

                  {/* Occupation, religion, marital status (same fields as the clinical screening page) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Occupation</span>
                      <Select
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        disabled={isSubmitting}
                      >
                        <option value="">Select occupation</option>
                        {formData.occupation && !OCCUPATION_OPTIONS.includes(formData.occupation) && (
                          <option value={formData.occupation}>{formData.occupation}</option>
                        )}
                        {OCCUPATION_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </Select>
                    </Label>
                    <BiodataExtraFields
                      value={formData}
                      onChange={(n: string, v: any) => setFormData((p) => ({ ...p, [n]: v }))}
                    />
                  </div>

                  {/* Screening Category */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Screening Category{!editingClient && <span className="text-red-500"> *</span>}
                      </span>
                      <Select
                        name="screeningCategory"
                        value={formData.screeningCategory}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        required={!editingClient}
                        disabled={isSubmitting}
                      >
                        <option value="">Select category</option>
                        <option value="new_client">New Client</option>
                        <option value="follow_up">Follow Up</option>
                      </Select>
                    </Label>
                  </div>

                  {/* State and LGA of Origin */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      State of Origin
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          State <span className="text-red-500">*</span>
                        </span>
                        <Select
                          name="stateOfOrigin"
                          value={formData.stateOfOrigin}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          required={!editingClient}
                          disabled={isSubmitting}
                        >
                          <option value="">Select State</option>
                          {nigerianStates.map((state) => (
                            <option key={state.code} value={state.name}>
                              {state.name}
                            </option>
                          ))}
                        </Select>
                      </Label>

                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          LGA <span className="text-red-500">*</span>
                        </span>
                        <Select
                          name="lgaOfOrigin"
                          value={formData.lgaOfOrigin}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          required={!editingClient}
                          disabled={!formData.stateOfOrigin || isSubmitting}
                        >
                          <option value="">Select LGA</option>
                          {formData.stateOfOrigin && lgasByState[getStateCode(formData.stateOfOrigin)]?.map((lga) => (
                            <option key={lga} value={lga}>
                              {lga}
                            </option>
                          ))}
                        </Select>
                      </Label>
                    </div>
                  </div>

                  {/* State and LGA of Residence */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      State of Residence
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          State <span className="text-red-500">*</span>
                        </span>
                        <Select
                          name="stateOfResidence"
                          value={formData.stateOfResidence}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          required={!editingClient}
                          disabled={isSubmitting}
                        >
                          <option value="">Select State</option>
                          {nigerianStates.map((state) => (
                            <option key={state.code} value={state.name}>
                              {state.name}
                            </option>
                          ))}
                        </Select>
                      </Label>

                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          LGA <span className="text-red-500">*</span>
                        </span>
                        <Select
                          name="lgaOfResidence"
                          value={formData.lgaOfResidence}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          required={!editingClient}
                          disabled={!formData.stateOfResidence || isSubmitting}
                        >
                          <option value="">Select LGA</option>
                          {formData.stateOfResidence && lgasByState[getStateCode(formData.stateOfResidence)]?.map((lga) => (
                            <option key={lga} value={lga}>
                              {lga}
                            </option>
                          ))}
                        </Select>
                      </Label>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Residential Address
                      </span>
                      <Textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        placeholder="Enter full residential address"
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>

                  {/* Landmark */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Landmark
                      </span>
                      <Input
                        name="landmark"
                        value={formData.landmark}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        placeholder="Enter nearby landmark (e.g., near City Mall, opposite Central Mosque)"
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>

                  {/* Registration Date */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Registration Date <span className="text-red-500">*</span>
                      </span>
                      <Input
                        type="date"
                        name="registrationDate"
                        value={formData.registrationDate}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        required={!editingClient}
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>

                  {/* Next of kin */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Next of Kin</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</span>
                        <Input
                          name="ncsr-nok-name"
                          autoComplete="off"
                          data-lpignore="true"
                          value={formData.nextOfKinName}
                          onChange={(e) => setFormData((p) => ({ ...p, nextOfKinName: e.target.value }))}
                          className="mt-1 rounded-xl"
                          disabled={isSubmitting}
                        />
                      </Label>
                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</span>
                        <Input
                          name="nextOfKinPhone"
                          type="tel"
                          value={formData.nextOfKinPhone}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          disabled={isSubmitting}
                        />
                      </Label>
                      <Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationship</span>
                        <Input
                          name="nextOfKinRelationship"
                          value={formData.nextOfKinRelationship}
                          onChange={handleInputChange}
                          className="mt-1 rounded-xl"
                          disabled={isSubmitting}
                        />
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <Button
                  layout="outline"
                  onClick={closeModal}
                  type="button"
                  className="rounded-xl"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {editingClient ? "Updating..." : "Adding..."}
                    </span>
                  ) : (
                    editingClient ? "Update Client" : "Add Client"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 animate-pulse"
            >
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-3 w-44 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          ))
        ) : clients.length > 0 ? (
          clients.map((client) => (
            <div
              key={client.clientId}
              className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {client.fullName}
                  </h3>
                  <div className="flex items-start gap-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 break-all">
                      ID: {client.clientId || "-"}
                      {client.hospitalNumber ? ` · Hosp. No: ${client.hospitalNumber}` : ""}
                      {client.offlineId ? ` · Offline ID: ${client.offlineId}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {client.gender || "—"}
                  </p>
                </div>

                <Badge
                  type={getCategoryBadgeType(client.screeningCategory) as any}
                >
                  {formatCategory(client.screeningCategory)}
                </Badge>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {client.phoneNumber || "No phone number"}
                    {client.phoneNotClients ? (
                      <span className="block text-xs text-amber-700">
                        Caregiver&apos;s number{client.caregiverName ? `: ${client.caregiverName}` : ""}
                      </span>
                    ) : null}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-1">
                    {client.address && (
                      <>
                        <span className="text-xs text-gray-500">Address:</span>
                        <span>{client.address}</span>
                      </>
                    )}
                    {client.landmark && (
                      <>
                        <span className="text-xs text-gray-500 mt-1">Landmark:</span>
                        <span>{client.landmark}</span>
                      </>
                    )}
                    <span className="text-xs text-gray-500 mt-1">Origin:</span>
                    <span>
                      {[client.lgaOfOrigin, client.stateOfOrigin].filter(Boolean).join(", ") ||
                        "Not specified"}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">Residence:</span>
                    <span>
                      {[client.lgaOfResidence, client.stateOfResidence].filter(Boolean).join(", ") ||
                        "Not specified"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {client.registrationDate
                      ? `Registered ${new Date(client.registrationDate).toLocaleDateString()}`
                      : "No registration date"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Link href={`/ncsr/client-details?clientId=${client.clientId}`} className="flex-1">
                  <Button className="w-full rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800">
                    <span className="inline-flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Open Client
                    </span>
                  </Button>
                </Link>
                <Button
                  layout="outline"
                  onClick={() => openEditModal(client)}
                  className="rounded-xl"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No clients found
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Try a different search or add a new client.
            </p>
          </div>
        )}

        {!loading && totalResults > resultsPerPage ? (
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={setPage}
              label="Clients navigation"
            />
          </div>
        ) : null}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-normal">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4">Client ID</th>
                <th className="px-6 py-4">Offline ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Origin</th>
                <th className="px-6 py-4">Residence</th>
                <th className="px-6 py-4">Registered</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : clients.length > 0 ? (
                clients.map((client) => (
                  <tr
                    key={client.clientId}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                  >
                    <td className="px-6 py-4 text-sm">
                      {client.clientId || "—"}
                      {client.hospitalNumber ? (
                        <span className="block text-xs text-gray-500">Hosp. No: {client.hospitalNumber}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {client.offlineId ? (
                        <span className="inline-block rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-mono">
                          {client.offlineId}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-semibold mr-3">
                          {client.fullName?.charAt(0)?.toUpperCase() || "C"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {client.fullName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {client.gender || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm capitalize">
                      {client.gender || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {client.phoneNumber || "—"}
                      {client.phoneNotClients ? (
                        <span className="block text-xs text-amber-700">
                          Caregiver{client.caregiverName ? `: ${client.caregiverName}` : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        type={
                          getCategoryBadgeType(client.screeningCategory) as any
                        }
                      >
                        {formatCategory(client.screeningCategory)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {[client.lgaOfOrigin, client.stateOfOrigin].filter(Boolean).join(", ") ||
                        "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {[client.lgaOfResidence, client.stateOfResidence].filter(Boolean).join(", ") ||
                        "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {client.registrationDate
                        ? new Date(client.registrationDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/ncsr/client-details?clientId=${client.clientId}`}
                        >
                          <Button layout="outline" className="rounded-xl">
                            <span className="inline-flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Open
                            </span>
                          </Button>
                        </Link>

                          {/* <Link
                          href={`/ncsr/screening-wizard?clientId=${client.clientId}`}
                        >
                          <Button layout="outline" className="rounded-xl">
                            <span className="inline-flex items-center gap-2">
                              <Stethoscope className="w-4 h-4" />
                              Screen
                            </span>
                          </Button>
                        </Link> */}

                        {(() => {
  const referral = client.latestReferral;
  const tool = referral?.status === "completed" ? null : nextToolFor(referral?.referralType);
  if (!tool) return null;
  const query = new URLSearchParams({ search: client.clientId });
  if (referral?.referralId) query.set("referralId", String(referral.referralId));
  return (
    <Link href={`${tool.href}?${query.toString()}`}>
      <Button layout="outline" className="rounded-xl">
        <span className="inline-flex items-center gap-2">
          <Stethoscope className="w-4 h-4" />
          {tool.label}
        </span>
      </Button>
    </Link>
  );
})()}

                        <Link
                          href={`/ncsr/client-record?clientId=${client.clientId}`}
                          title="View comprehensive record"
                        >
                          <Button layout="outline" className="rounded-xl">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </Link>

                        <Button
                          layout="outline"
                          onClick={() => openEditModal(client)}
                          className="rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Users className="w-10 h-10 mx-auto text-gray-400" />
                    <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                      No clients found
                    </h4>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Try a different search or add a new client.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalResults > resultsPerPage ? (
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={setPage}
              label="Clients table navigation"
            />
          </div>
        ) : null}
      </div>
    </Layout>
  );
}