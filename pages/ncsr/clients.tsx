"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
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

type Client = {
  id: number;
  clientId: string;
  fullName: string;
  gender: string;
  phoneNumber?: string | null;
  screeningCategory?: string;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  stateOfResidence?: string | null;
  lgaOfResidence?: string | null;
  address?: string | null;
  registrationDate?: string | null;
  dateOfBirth?: string | null;
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
  phoneNumber: string;
  screeningCategory: string;
  stateOfOrigin: string;
  lgaOfOrigin: string;
  stateOfResidence: string;
  lgaOfResidence: string;
  address: string;
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
  phoneNumber: "",
  screeningCategory: "",
  stateOfOrigin: "",
  lgaOfOrigin: "",
  stateOfResidence: "",
  lgaOfResidence: "",
  address: "",
  registrationDate: new Date().toISOString().split("T")[0],
};

export default function ClientsIndexPage() {
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
        screeningCategory:
          client.screeningCategory ?? client.screening_category ?? "",
        stateOfOrigin: client.stateOfOrigin ?? client.state_of_origin ?? "",
        lgaOfOrigin: client.lgaOfOrigin ?? client.lga_of_origin ?? "",
        stateOfResidence: client.stateOfResidence ?? client.state_of_residence ?? "",
        lgaOfResidence: client.lgaOfResidence ?? client.lga_of_residence ?? "",
        address: client.address ?? "",
        registrationDate:
          client.registrationDate ?? client.registration_date ?? "",
        dateOfBirth: client.dateOfBirth ?? client.date_of_birth ?? "",
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

  function openModal() {
    setEditingClient(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
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
  setFormData({
    fullName: client.fullName || "",
    gender: client.gender || "",
    dateOfBirth: formatDateForInput(client.dateOfBirth),
    phoneNumber: client.phoneNumber || "",
    screeningCategory: client.screeningCategory || "",
    stateOfOrigin: client.stateOfOrigin || "",
    lgaOfOrigin: client.lgaOfOrigin || "",
    stateOfResidence: client.stateOfResidence || "",
    lgaOfResidence: client.lgaOfResidence || "",
    address: client.address || "",
    registrationDate: formatDateForInput(client.registrationDate),
  });
  setIsModalOpen(true);
}

  function closeModal() {
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
    setIsSubmitting(true);

    try {
      if (editingClient) {
        // Update existing client
        await api.patch(`/clients/${editingClient.clientId}`, formData);
        toast.success("Client updated successfully!");
      } else {
        // Create new client
        await api.post("/clients", formData);
        toast.success("Client added successfully!");
      }
      closeModal();
      fetchClients(); // Refresh the list
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 
        `Failed to ${editingClient ? "update" : "add"} client. Please try again.`
      );
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
                placeholder="Search by client name or phone number"
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
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name <span className="text-red-500">*</span>
                      </span>
                      <Input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
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

                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Date of Birth <span className="text-red-500">*</span>
                      </span>
                      <Input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        max={new Date().toISOString().split("T")[0]}
                        required
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone Number
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
                  </div>

                  {/* Screening Category */}
                  <div>
                    <Label>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Screening Category <span className="text-red-500">*</span>
                      </span>
                      <Select
                        name="screeningCategory"
                        value={formData.screeningCategory}
                        onChange={handleInputChange}
                        className="mt-1 rounded-xl"
                        required
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
                          required
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
                          required
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
                          required
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
                          required
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
                        required
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {client.clientId || "-"}
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
                  <span>{client.phoneNumber || "No phone number"}</span>
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