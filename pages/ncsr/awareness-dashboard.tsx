// pages/ncsr/awareness.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Button, Input, Label, Select, Badge } from "@roketid/windmill-react-ui";
import { Search, UserPlus, Loader2, RefreshCw, Link2 } from "lucide-react";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { nigerianStates, lgasByState, getStateCode } from "../../lib/nigerianstates";
import toast from "react-hot-toast";

type Registration = {
  registrationId: number;
  fullName: string;
  gender: string;
  phoneNumber: string;
  email?: string;
  stateOfResidence: string;
  lgaOfResidence: string;
  status: "pending" | "linked" | "converted";
  clientId?: string;
  createdAt: string;
  facility?: { facilityName: string };
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "warning",
  linked:    "primary",
  converted: "success",
};

export default function AwarenessDashboard() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // New registration form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: "", gender: "", phoneNumber: "",
    email: "", stateOfResidence: "", lgaOfResidence: "",
    campaignSource: "staff_entry",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetchRegistrations(); }, []);

  async function fetchRegistrations() {
    setLoading(true);
    try {
      const { data } = await api.get("/awareness/registrations");
      setRegistrations(data?.data ?? data?.registrations ?? []);
    } catch {
      toast.error("Could not load registrations.");
    } finally {
      setLoading(false);
    }
  }

  function setField(name: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "stateOfResidence") next.lgaOfResidence = "";
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Required";
    if (!form.gender) errs.gender = "Required";
    if (!form.phoneNumber.trim()) errs.phoneNumber = "Required";
    if (!form.stateOfResidence) errs.stateOfResidence = "Required";
    if (!form.lgaOfResidence) errs.lgaOfResidence = "Required";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setSubmitting(true);
    try {
      await api.post("/awareness/register", form);
      toast.success("Client registered and linked to nearest centre.");
      setShowForm(false);
      setForm({
        fullName: "", gender: "", phoneNumber: "",
        email: "", stateOfResidence: "", lgaOfResidence: "",
        campaignSource: "staff_entry",
      });
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = registrations.filter((r) => {
    const matchSearch =
      !search ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.phoneNumber.includes(search);
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <PageTitle>Awareness Registrations</PageTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
            Clients registered through awareness campaigns and self-registration.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            layout="outline"
            className="rounded-xl h-10"
            onClick={fetchRegistrations}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            className="rounded-xl h-10 bg-green-700 border-green-700 hover:bg-green-800"
            onClick={() => setShowForm((v) => !v)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register Client
          </Button>
        </div>
      </div>

      {/* Inline registration form */}
      {showForm && (
        <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
            New Awareness Registration
          </h3>
          <form onSubmit={handleRegister}>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Label className="sm:col-span-2 lg:col-span-1">
                <span className="text-sm font-semibold">Full Name *</span>
                <Input
                  className={`mt-2 rounded-2xl h-12 ${formErrors.fullName ? "ring-2 ring-red-400" : ""}`}
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="Enter full name"
                />
                {formErrors.fullName && <span className="text-xs text-red-500">{formErrors.fullName}</span>}
              </Label>

              <Label>
                <span className="text-sm font-semibold">Gender *</span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${formErrors.gender ? "ring-2 ring-red-400" : ""}`}
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Phone Number *</span>
                <Input
                  type="tel"
                  className={`mt-2 rounded-2xl h-12 ${formErrors.phoneNumber ? "ring-2 ring-red-400" : ""}`}
                  value={form.phoneNumber}
                  onChange={(e) => setField("phoneNumber", e.target.value)}
                  placeholder="080xxxxxxxx"
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Email <span className="text-gray-400 font-normal">(optional)</span></span>
                <Input
                  type="email"
                  className="mt-2 rounded-2xl h-12"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">State *</span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${formErrors.stateOfResidence ? "ring-2 ring-red-400" : ""}`}
                  value={form.stateOfResidence}
                  onChange={(e) => setField("stateOfResidence", e.target.value)}
                >
                  <option value="">Select state</option>
                  {nigerianStates.map((s) => (
                    <option key={s.code} value={s.name}>{s.name}</option>
                  ))}
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">LGA *</span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${formErrors.lgaOfResidence ? "ring-2 ring-red-400" : ""}`}
                  value={form.lgaOfResidence}
                  disabled={!form.stateOfResidence}
                  onChange={(e) => setField("lgaOfResidence", e.target.value)}
                >
                  <option value="">Select LGA</option>
                  {form.stateOfResidence &&
                    lgasByState[getStateCode(form.stateOfResidence)]?.map((lga) => (
                      <option key={lga} value={lga}>{lga}</option>
                    ))}
                </Select>
              </Label>
            </div>

            <div className="flex gap-3 mt-5 justify-end">
              <Button layout="outline" type="button" className="rounded-xl"
                onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}
                className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register & Link"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-11 h-11 rounded-2xl"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="h-11 rounded-2xl w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="linked">Linked</option>
          <option value="converted">Converted</option>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No registrations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-4 text-left">Client</th>
                  <th className="px-5 py-4 text-left">Phone</th>
                  <th className="px-5 py-4 text-left">Location</th>
                  <th className="px-5 py-4 text-left">Linked Centre</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Date</th>
                  <th className="px-5 py-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((r) => (
                  <tr key={r.registrationId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{r.fullName}</p>
                      <p className="text-xs text-gray-400 capitalize">{r.gender}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{r.phoneNumber}</td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700 dark:text-gray-300">{r.stateOfResidence}</p>
                      <p className="text-xs text-gray-400">{r.lgaOfResidence}</p>
                    </td>
                    <td className="px-5 py-4">
                      {r.facility ? (
                        <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400">
                          <Link2 className="w-3.5 h-3.5" />
                          {r.facility.facilityName}
                        </span>
                      ) : (
                        <span className="text-amber-500 text-xs">Not linked</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge type={STATUS_BADGE[r.status] as any}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-NG")}
                    </td>
                    <td className="px-5 py-4">
                      {r.status !== "converted" && (
                        <Button
                          size="small"
                          className="rounded-xl text-xs bg-green-700 border-green-700 hover:bg-green-800"
                          onClick={() => window.location.href =
                            `/ncsr/wizard?awarenessId=${r.registrationId}`}
                        >
                          Start Screening
                        </Button>
                      )}
                      {r.clientId && (
                        <Button size="small" layout="outline" className="rounded-xl text-xs ml-2"
                          onClick={() => window.location.href =
                            `/ncsr/client-details?clientId=${r.clientId}`}>
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}