"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users, UserCog, Building2, Mail, Phone, Shield, Search, Filter, Plus, Edit2, Trash2, Eye, ChevronDown, X,
  Loader2, AlertCircle, Info, CheckSquare, Square, Star, Globe2, Settings2,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";
import Layout from "../containers/Layout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Facility {
  facilityId: number | string;
  facilityName: string;
  facilityCode?: string | null;
  facilityState?: string | null;
}

interface Organization {
  id: number;
  organizationName: string;
}

interface RoleOption {
  roleId: number;
  roleName: string;
  label: string;
  roleDescription?: string | null;
  dataScopeType: string | null;
  needsFacility: boolean;
  usesAssignedFacilities: boolean;
  requiresOrganization: boolean;
}

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string | null;
  role: string;
  roleId: number | string;
  roles: { roleId: number; roleName: string; label: string }[];
  status: "active" | "inactive";
  facilityId: number | null;
  facility: Facility | null;
  allFacilities: boolean;
  usesAssignedFacilities: boolean;
  facilityIds: number[];
  facilities: { facilityId: number; facilityName: string }[];
  organizationId: number | null;
  organizationName: string | null;
  accessText: string;
  canEdit: boolean | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  managers?: number;
  byRole: Record<string, number>;
}

interface Manager {
  canView: boolean;
  canCreate: boolean;
  national: boolean;
  facilityId: number | null;
  canEditRoles: boolean;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber: string;
  roles: number[]; // first = main role
  facilityId: string;
  facilityIds: number[];
  allFacilities: boolean;
  organizationId: string;
  status: "active" | "inactive";
}

const SCOPE_TEXT: Record<string, string> = {
  national: "Sees all facilities",
  state: "Sees facilities in their state",
  hub_hierarchy: "Sees their Hub and everything under it",
  subhub_hierarchy: "Sees their SubHub and everything under it",
  facility_only: "Sees only their facility",
  assigned: "Sees all facilities or only the ones you assign",
};

const BADGES = [
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
];
const badgeFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return BADGES[h % BADGES.length];
};
const prettify = (v: string) => v.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

const input = "w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent";
const label = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

const emptyForm = (): FormState => ({
  firstName: "", lastName: "", email: "", phoneNumber: "", alternatePhoneNumber: "",
  roles: [], facilityId: "", facilityIds: [], allFacilities: false, organizationId: "", status: "active",
});

// ─── Bits ─────────────────────────────────────────────────────────────────────
function Sheet({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-2xl max-h-[94vh] flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl whitespace-normal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

function FacilityChecklist({ facilities, value, onChange, exclude }: { facilities: Facility[]; value: number[]; onChange: (v: number[]) => void; exclude?: number | null }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return facilities
      .filter((f) => Number(f.facilityId) !== Number(exclude))
      .filter((f) => !n || `${f.facilityName} ${f.facilityState ?? ""} ${f.facilityCode ?? ""}`.toLowerCase().includes(n));
  }, [q, facilities, exclude]);
  const set = new Set(value.map(Number));
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-gray-700">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search facilities" className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 dark:text-white" />
        <span className="text-xs text-gray-500 shrink-0">{value.length} chosen</span>
      </div>
      <div className="max-h-52 overflow-y-auto p-1">
        {list.map((f) => {
          const id = Number(f.facilityId);
          const on = set.has(id);
          return (
            <button key={id} type="button" onClick={() => onChange(on ? value.filter((v) => Number(v) !== id) : [...value, id])}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              {on ? <CheckSquare className="w-4 h-4 text-green-700 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
              <span className="text-gray-800 dark:text-gray-100">{f.facilityName}</span>
              {f.facilityState && <span className="text-xs text-gray-400">· {f.facilityState}</span>}
            </button>
          );
        })}
        {list.length === 0 && <p className="p-3 text-sm text-gray-500">No facility matches.</p>}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [allRoles, setAllRoles] = useState<RoleOption[]>([]);
  const [manager, setManager] = useState<Manager | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, byRole: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterFacility, setFilterFacility] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "add" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showExtra, setShowExtra] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchFacilities();
    fetchOrganizations();
    fetchRoles();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get("/users");
      if (data.status) {
        setUsers(data.users ?? []);
        setStats(data.stats ?? { total: 0, active: 0, inactive: 0, byRole: {} });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function fetchFacilities() {
    try {
      const { data } = await api.get("/users/facilities");
      if (data.status) setFacilities(data.facilities ?? []);
    } catch {}
  }

  async function fetchOrganizations() {
    try {
      const { data } = await api.get("/users/organizations");
      if (data.status) setOrganizations(data.organizations || data.data || []);
    } catch {}
  }

  async function fetchRoles() {
    try {
      const { data } = await api.get("/users/roles");
      if (data.status) {
        setRoles(data.roles ?? []);
        setAllRoles(data.allRoles ?? data.roles ?? []);
        setManager(data.manager ?? null);
      }
    } catch {}
  }

  const roleById = useMemo(() => new Map(allRoles.map((r) => [Number(r.roleId), r])), [allRoles]);
  const roleLabel = (name: string) => allRoles.find((r) => r.roleName === name)?.label ?? prettify(name);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !q || [u.firstName, u.lastName, u.email, u.phoneNumber, `${u.firstName} ${u.lastName}`]
        .some((v) => (v ?? "").toLowerCase().includes(q));
      const matchesFacility = filterFacility === "all"
        || String(u.facilityId) === filterFacility
        || (u.facilityIds ?? []).map(String).includes(filterFacility);
      const matchesRole = filterRole === "all" || (u.roles ?? []).some((r) => r.roleName === filterRole) || u.role === filterRole;
      const matchesStatus = filterStatus === "all" || u.status === filterStatus;
      return matchesSearch && matchesFacility && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, filterFacility, filterRole, filterStatus]);

  // ── What the chosen roles need ──
  const chosen = form.roles.map((id) => roleById.get(Number(id))).filter(Boolean) as RoleOption[];
  const needsFacility = chosen.some((r) => r.needsFacility);
  const usesAssigned = chosen.some((r) => r.usesAssignedFacilities);
  const needsOrg = chosen.some((r) => r.requiresOrganization);
  const allNational = chosen.length > 0 && chosen.every((r) => r.dataScopeType === "national");
  const singleFacilityManager = manager && !manager.national && facilities.length <= 1;

  function openModal(mode: "view" | "add" | "edit", user?: UserRow) {
    setModalMode(mode);
    setSelectedUser(user ?? null);
    setShowExtra(false);
    if (mode === "add") {
      setForm({ ...emptyForm(), facilityId: manager && !manager.national && manager.facilityId ? String(manager.facilityId) : "" });
    } else if (user) {
      const ids = (user.roles ?? []).map((r) => Number(r.roleId));
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        phoneNumber: user.phoneNumber ?? "",
        alternatePhoneNumber: user.alternatePhoneNumber ?? "",
        roles: ids.length ? ids : [Number(user.roleId)],
        facilityId: user.facilityId ? String(user.facilityId) : "",
        facilityIds: (user.facilityIds ?? []).map(Number),
        allFacilities: !!user.allFacilities,
        organizationId: user.organizationId ? String(user.organizationId) : "",
        status: user.status,
      });
      setShowExtra((user.facilityIds ?? []).length > 0);
    }
  }

  function closeModal() {
    setModalMode(null);
    setSelectedUser(null);
    setSubmitting(false);
  }

  function toggleRole(id: number) {
    setForm((f) => ({ ...f, roles: f.roles.includes(id) ? f.roles.filter((r) => r !== id) : [...f.roles, id] }));
  }
  function makeMain(id: number) {
    setForm((f) => ({ ...f, roles: [id, ...f.roles.filter((r) => r !== id)] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.roles.length === 0) return toast.error("Choose at least one role.");
    if (needsFacility && !form.facilityId) return toast.error("Choose the person's facility.");
    if (needsOrg && !form.organizationId) return toast.error("Choose the organisation.");
    if (usesAssigned && !form.allFacilities && !form.facilityId && form.facilityIds.length === 0) {
      return toast.error('Choose "All facilities" or at least one facility.');
    }

    const payload: any = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      alternatePhoneNumber: form.alternatePhoneNumber,
      status: form.status,
      roles: form.roles,
      // Country-wide roles don't need a facility; keep one only if chosen.
      facilityId: form.facilityId || null,
      facilityIds: usesAssigned && form.allFacilities ? [] : form.facilityIds,
      allFacilities: usesAssigned ? form.allFacilities : false,
      organizationId: needsOrg ? form.organizationId : null,
    };

    setSubmitting(true);
    try {
      if (modalMode === "add") {
        const { data } = await api.post("/users", payload);
        if (data.status) {
          toast.success(`User created. Login details were sent to ${form.email}.`);
          await fetchUsers();
          closeModal();
        }
      } else if (modalMode === "edit" && selectedUser) {
        const { data } = await api.put(`/users/${selectedUser.id}`, payload);
        if (data.status) {
          toast.success("User updated.");
          await fetchUsers();
          closeModal();
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: UserRow) {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}? They will no longer be able to sign in.`)) return;
    try {
      const { data } = await api.delete(`/users/${user.id}`);
      if (data.status) {
        toast.success("User deleted.");
        await fetchUsers();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete user");
    }
  }

  const RoleBadges = ({ u }: { u: UserRow }) => (
    <div className="flex flex-wrap gap-1.5">
      {(u.roles?.length ? u.roles : [{ roleId: 0, roleName: u.role, label: roleLabel(u.role) }]).map((r, i) => (
        <span key={`${r.roleName}-${i}`} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeFor(r.roleName)}`}>
          {i === 0 && (u.roles?.length ?? 0) > 1 && <Star className="w-3 h-3" />}
          {r.label || roleLabel(r.roleName)}
        </span>
      ))}
    </div>
  );

  const accessLine = (u: UserRow) => {
    if (u.organizationName) return `${u.organizationName} · ${u.accessText}`;
    if (u.facility?.facilityName) return u.accessText === "1 facility" ? u.facility.facilityName : `${u.facility.facilityName} · ${u.accessText}`;
    return u.accessText;
  };

  const StatusPill = ({ s }: { s: string }) => (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"}`}>
      {s === "active" ? "Active" : "Inactive"}
    </span>
  );

  if (loading && users.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-semibold mb-2">Error Loading Users</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button onClick={fetchUsers} className="px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700">Try Again</button>
          </div>
        </div>
      </Layout>
    );
  }

  const canCreate = manager?.canCreate ?? roles.length > 0;

  return (
    <Layout>
      <div className="py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-green-600 shadow-lg shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Users Management</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">Manage system users, their roles and the facilities they can see</p>
            </div>
          </div>
          {manager?.canEditRoles && (
            <Link href="/ncsr/roles" className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Settings2 className="w-4 h-4" /> Manage roles
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: "Total Users", value: stats.total, icon: Users, tone: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
            { label: "Active Users", value: stats.active, icon: UserCog, tone: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
            { label: "Can Manage Users", value: stats.managers ?? 0, icon: Shield, tone: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" },
            { label: "Facilities", value: facilities.length, icon: Building2, tone: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${s.tone}`}><Icon className="w-5 h-5" /></div>
                  <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{s.value}</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search + filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search name, email or phone" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${input} pl-12`} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-11 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium">
                <Filter className="w-4 h-4" /> Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
              {canCreate && (
                <button onClick={() => openModal("add")} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 h-11 rounded-xl bg-green-600 text-white hover:bg-green-700 shadow font-semibold whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Add User
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-3">
              {facilities.length > 1 && (
                <div>
                  <label className={label}>Facility</label>
                  <select value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)} className={input}>
                    <option value="all">All Facilities</option>
                    {facilities.map((f) => <option key={f.facilityId} value={String(f.facilityId)}>{f.facilityName}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={label}>Role</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={input}>
                  <option value="all">All Roles</option>
                  {allRoles.map((r) => <option key={r.roleId} value={r.roleName}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={input}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table (large screens) */}
        <div className="hidden xl:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr className="text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <th className="px-5 py-3 w-[22%]">Name</th>
                <th className="px-5 py-3 w-[20%]">Contact</th>
                <th className="px-5 py-3 w-[20%]">Roles</th>
                <th className="px-5 py-3 w-[20%]">Access</th>
                <th className="px-5 py-3 w-[8%]">Status</th>
                <th className="px-5 py-3 w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 align-top">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white break-words">{u.firstName} {u.lastName}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <p className="break-all">{u.email}</p>
                    <p className="text-xs">{u.phoneNumber}</p>
                  </td>
                  <td className="px-5 py-3"><RoleBadges u={u} /></td>
                  <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 break-words">{accessLine(u)}</td>
                  <td className="px-5 py-3"><StatusPill s={u.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openModal("view", u)} className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="View"><Eye className="w-4 h-4" /></button>
                      {u.canEdit !== false && (
                        <>
                          <button onClick={() => openModal("edit", u)} className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(u)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No users found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Cards (phones and tablets) */}
        <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredUsers.map((u) => (
            <div key={u.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white break-words">{u.firstName} {u.lastName}</h3>
                  <div className="mt-1.5"><RoleBadges u={u} /></div>
                </div>
                <StatusPill s={u.status} />
              </div>
              <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400 flex-1">
                <p className="flex items-start gap-2"><Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /><span className="break-all">{u.email}</span></p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400 shrink-0" />{u.phoneNumber}</p>
                <p className="flex items-start gap-2"><Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /><span className="break-words">{accessLine(u)}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal("view", u)} className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium">
                  <Eye className="w-4 h-4" /> View
                </button>
                {u.canEdit !== false && (
                  <>
                    <button onClick={() => openModal("edit", u)} className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300" aria-label="Edit"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(u)} className="flex items-center justify-center w-10 h-10 rounded-xl border border-red-300 dark:border-red-600 text-red-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
              <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No users found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-5">Try adjusting your search or filters</p>
              <button onClick={() => { setSearchQuery(""); setFilterFacility("all"); setFilterRole("all"); setFilterStatus("all"); }}
                className="px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium">Clear Filters</button>
            </div>
          )}
        </div>
      </div>

      {/* View */}
      <Sheet open={modalMode === "view" && !!selectedUser} title="User Details" onClose={closeModal}>
        {selectedUser && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 break-words">{selectedUser.firstName} {selectedUser.lastName}</h3>
              <RoleBadges u={selectedUser} />
              {(selectedUser.roles?.length ?? 0) > 1 && <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1"><Star className="w-3 h-3" /> main role</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className={label}>Email</p><p className="text-gray-900 dark:text-white break-all">{selectedUser.email}</p></div>
              <div><p className={label}>Phone Number</p><p className="text-gray-900 dark:text-white">{selectedUser.phoneNumber}</p></div>
              {selectedUser.alternatePhoneNumber && <div><p className={label}>Alternate Phone</p><p className="text-gray-900 dark:text-white">{selectedUser.alternatePhoneNumber}</p></div>}
              <div><p className={label}>Status</p><StatusPill s={selectedUser.status} /></div>
              {selectedUser.organizationName && <div><p className={label}>Organisation</p><p className="text-gray-900 dark:text-white">{selectedUser.organizationName}</p></div>}
              <div><p className={label}>Main facility</p><p className="text-gray-900 dark:text-white">{selectedUser.facility?.facilityName ?? "—"}</p></div>
              <div className="sm:col-span-2">
                <p className={label}>Can see</p>
                <p className="text-gray-900 dark:text-white">{selectedUser.allFacilities ? "All facilities" : selectedUser.accessText}</p>
                {(selectedUser.facilities ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedUser.facilities.map((f) => <span key={f.facilityId} className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200">{f.facilityName}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* Add / edit */}
      <Sheet
        open={modalMode === "add" || modalMode === "edit"}
        title={modalMode === "add" ? "Add New User" : "Edit User"}
        onClose={closeModal}
        footer={<>
          <button type="button" onClick={closeModal} disabled={submitting} className="h-11 px-6 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50">Cancel</button>
          <button type="submit" form="user-form" disabled={submitting} className="h-11 px-6 rounded-xl bg-green-600 text-white hover:bg-green-700 font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Saving..." : modalMode === "add" ? "Add User" : "Save Changes"}
          </button>
        </>}
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
          {modalMode === "add" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 dark:text-blue-200">A password is generated automatically and emailed to the user with their login details.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label}>First Name *</label><input className={input} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
            <div><label className={label}>Last Name *</label><input className={input} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            <div className="sm:col-span-2"><label className={label}>Email *</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div><label className={label}>Phone Number *</label><input type="tel" className={input} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} required /></div>
            <div><label className={label}>Alternate Phone</label><input type="tel" className={input} value={form.alternatePhoneNumber} onChange={(e) => setForm({ ...form, alternatePhoneNumber: e.target.value })} /></div>
          </div>

          {/* Roles */}
          <div>
            <label className={label}>Roles *</label>
            <p className="text-xs text-gray-500 mb-2">Tick every role this person has. The starred one is their main role.</p>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">You can't give any roles.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roles.map((r) => {
                  const id = Number(r.roleId);
                  const on = form.roles.includes(id);
                  const main = form.roles[0] === id;
                  return (
                    <div key={id} className={`rounded-xl border p-3 transition ${on ? "border-green-600 bg-green-50/60 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                      <div className="flex items-start gap-2">
                        <button type="button" onClick={() => toggleRole(id)} className="flex items-start gap-2 text-left flex-1 min-w-0">
                          {on ? <CheckSquare className="w-5 h-5 text-green-700 shrink-0" /> : <Square className="w-5 h-5 text-gray-400 shrink-0" />}
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-800 dark:text-white">{r.label}</span>
                            <span className="block text-xs text-gray-500">
                              {r.requiresOrganization ? "Belongs to an organisation" : SCOPE_TEXT[r.dataScopeType ?? ""] ?? "Access set on the Roles page"}
                            </span>
                          </span>
                        </button>
                        {on && form.roles.length > 1 && (
                          <button type="button" onClick={() => makeMain(id)} title={main ? "Main role" : "Make main role"} className="p-1 shrink-0">
                            <Star className={`w-4 h-4 ${main ? "text-amber-500 fill-amber-400" : "text-gray-300"}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Organisation */}
          {needsOrg && (
            <div>
              <label className={label}>Organisation *</label>
              <select className={input} value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })}>
                <option value="">Select organisation</option>
                {organizations.map((o) => <option key={o.id} value={o.id}>{o.organizationName}</option>)}
              </select>
            </div>
          )}

          {/* Facility access */}
          {chosen.length > 0 && (
            <div className="space-y-4">
              {allNational && !usesAssigned && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-900 dark:text-green-200">
                  <Globe2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This role sees all facilities, so no facility needs to be chosen.</span>
                </div>
              )}

              {needsFacility && (
                <div>
                  <label className={label}>Facility *</label>
                  {singleFacilityManager ? (
                    <div className={`${input} flex items-center bg-gray-50 dark:bg-gray-900/40`}>{facilities[0]?.facilityName ?? "Your facility"}</div>
                  ) : (
                    <select className={input} value={form.facilityId} onChange={(e) => setForm({ ...form, facilityId: e.target.value })}>
                      <option value="">Select facility</option>
                      {facilities.map((f) => <option key={f.facilityId} value={String(f.facilityId)}>{f.facilityName}</option>)}
                    </select>
                  )}
                </div>
              )}

              {usesAssigned && (
                <div>
                  <label className={label}>Facilities this person can see *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {manager?.national !== false && (
                      <label className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer ${form.allFacilities ? "border-green-600 bg-green-50/60 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                        <input type="radio" className="mt-1" checked={form.allFacilities} onChange={() => setForm({ ...form, allFacilities: true })} />
                        <span className="text-sm"><b className="text-gray-800 dark:text-white">All facilities</b><span className="block text-xs text-gray-500">Country-wide</span></span>
                      </label>
                    )}
                    <label className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer ${!form.allFacilities ? "border-green-600 bg-green-50/60 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                      <input type="radio" className="mt-1" checked={!form.allFacilities} onChange={() => setForm({ ...form, allFacilities: false })} />
                      <span className="text-sm"><b className="text-gray-800 dark:text-white">Selected facilities</b><span className="block text-xs text-gray-500">Only the ones ticked below</span></span>
                    </label>
                  </div>
                  {!form.allFacilities && (
                    <FacilityChecklist facilities={facilities} value={form.facilityIds} onChange={(v) => setForm({ ...form, facilityIds: v })} exclude={needsFacility ? Number(form.facilityId) : null} />
                  )}
                </div>
              )}

              {!usesAssigned && !allNational && (
                <div>
                  <button type="button" onClick={() => setShowExtra(!showExtra)} className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                    <ChevronDown className={`w-4 h-4 transition-transform ${showExtra ? "rotate-180" : ""}`} />
                    Other facilities this person can also see {form.facilityIds.length > 0 && `(${form.facilityIds.length})`}
                  </button>
                  {showExtra && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-2">On top of what their role already gives them.</p>
                      <FacilityChecklist facilities={facilities} value={form.facilityIds} onChange={(v) => setForm({ ...form, facilityIds: v })} exclude={Number(form.facilityId)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="sm:w-1/2">
            <label className={label}>Status</label>
            <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Sheet>
    </Layout>
  );
}
