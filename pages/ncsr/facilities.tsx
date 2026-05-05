"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Activity,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import api from "../../lib/api";
import Layout from "../containers/Layout";

interface Facility {
  id: number;
  facilityName: string;
  facilityCode: string;
  facilityState: string;
  facilityLga: string;
  facilityAddress: string;
  phoneNumber: string;
  email: string;
  activeUsers: number;
  totalScreenings: number;
  status: "active" | "inactive";
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  totalUsers: number;
}

interface FormData {
  facilityName: string;
  facilityCode: string;
  facilityState: string;
  facilityLga: string;
  facilityAddress: string;
  phoneNumber: string;
  email: string;
  status: "active" | "inactive";
}

export default function FacilitiesManagementPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    inactive: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "add" | "edit">("view");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    facilityName: "",
    facilityCode: "",
    facilityState: "",
    facilityLga: "",
    facilityAddress: "",
    phoneNumber: "",
    email: "",
    status: "active",
  });

  // Fetch facilities and states on mount
  useEffect(() => {
    fetchFacilities();
    fetchStates();
  }, []);

  async function fetchFacilities() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get("/facilities");
      
      if (data.status) {
        setFacilities(data.facilities);
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load facilities");
      console.error("Error fetching facilities:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStates() {
    try {
      const { data } = await api.get("/facilities/states");
      if (data.status) {
        setStates(data.states);
      }
    } catch (err) {
      console.error("Error fetching states:", err);
    }
  }

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const matchesSearch =
        facility.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.facilityCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.facilityState.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesState =
        filterState === "all" || facility.facilityState === filterState;

      const matchesStatus =
        filterStatus === "all" || facility.status === filterStatus;

      return matchesSearch && matchesState && matchesStatus;
    });
  }, [facilities, searchQuery, filterState, filterStatus]);

  function openModal(mode: "view" | "add" | "edit", facility?: Facility) {
    setModalMode(mode);
    setSelectedFacility(facility || null);
    
    if (mode === "add") {
      setFormData({
        facilityName: "",
        facilityCode: "",
        facilityState: "",
        facilityLga: "",
        facilityAddress: "",
        phoneNumber: "",
        email: "",
        status: "active",
      });
    } else if (facility) {
      setFormData({
        facilityName: facility.facilityName,
        facilityCode: facility.facilityCode,
        facilityState: facility.facilityState,
        facilityLga: facility.facilityLga,
        facilityAddress: facility.facilityAddress,
        phoneNumber: facility.phoneNumber,
        email: facility.email,
        status: facility.status,
      });
    }
    
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedFacility(null);
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalMode === "add") {
        const { data } = await api.post("/facilities", formData);
        if (data.status) {
          await fetchFacilities();
          closeModal();
        }
      } else if (modalMode === "edit" && selectedFacility) {
        const { data } = await api.put(`/facilities/${selectedFacility.id}`, formData);
        if (data.status) {
          await fetchFacilities();
          closeModal();
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(facility: Facility) {
    if (!confirm(`Are you sure you want to delete ${facility.facilityName}?`)) {
      return;
    }

    try {
      const { data } = await api.delete(`/facilities/${facility.id}`);
      if (data.status) {
        await fetchFacilities();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete facility");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading facilities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white font-semibold mb-2">Error Loading Facilities</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchFacilities}
            className="px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-green-600 shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Facilities Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Manage healthcare facilities and screening centers
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Facilities
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.active}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Active Facilities
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.inactive}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Inactive Facilities
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalUsers}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Active Users
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by facility name, code, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showFilters ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Add Facility Button */}
          <button
            onClick={() => openModal("add")}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-lg transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add Facility
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                State
              </label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All States</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFacilities.map((facility) => (
          <div
            key={facility.id}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-xl transition-all duration-300 group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {facility.facilityName}
                  </h3>
                </div>
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {facility.facilityCode}
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  facility.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {facility.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Location */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>{facility.facilityAddress}</p>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {facility.facilityLga}, {facility.facilityState}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {facility.phoneNumber}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {facility.email}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {facility.activeUsers}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Active Users
                </p>
              </div>
              <div className="w-px h-10 bg-gray-300 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {facility.totalScreenings}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Screenings
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal("view", facility)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => openModal("edit", facility)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(facility)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredFacilities.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No facilities found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Try adjusting your search or filters
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterState("all");
              setFilterStatus("all");
            }}
            className="px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Modal (View/Add/Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {modalMode === "add"
                  ? "Add New Facility"
                  : modalMode === "edit"
                  ? "Edit Facility"
                  : "Facility Details"}
              </h2>
              <button
                onClick={closeModal}
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {modalMode === "view" && selectedFacility ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedFacility.facilityName}
                    </h3>
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                      {selectedFacility.facilityCode}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        State
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedFacility.facilityState}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        LGA
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedFacility.facilityLga}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Address
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedFacility.facilityAddress}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedFacility.phoneNumber}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedFacility.email}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Active Users
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedFacility.activeUsers}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Total Screenings
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedFacility.totalScreenings}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Facility Name *
                      </label>
                      <input
                        type="text"
                        value={formData.facilityName}
                        onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter facility name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Facility Code *
                      </label>
                      <input
                        type="text"
                        value={formData.facilityCode}
                        onChange={(e) => setFormData({ ...formData, facilityCode: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., LUTH001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        State *
                      </label>
                      <select
                        value={formData.facilityState}
                        onChange={(e) => setFormData({ ...formData, facilityState: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        LGA *
                      </label>
                      <input
                        type="text"
                        value={formData.facilityLga}
                        onChange={(e) => setFormData({ ...formData, facilityLga: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter LGA"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Address *
                      </label>
                      <textarea
                        rows={3}
                        value={formData.facilityAddress}
                        onChange={(e) => setFormData({ ...formData, facilityAddress: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        placeholder="Enter full address"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+234 800 000 0000"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="facility@example.com"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {submitting ? "Saving..." : modalMode === "add" ? "Add Facility" : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* View Mode Footer */}
            {modalMode === "view" && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}