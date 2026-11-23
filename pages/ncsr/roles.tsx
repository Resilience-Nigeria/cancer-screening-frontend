import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Loader2, ArrowLeft, ShieldCheck, Info, Plus, Pencil, Trash2, X, Users, Lock, Building2, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Role = {
  roleId: number;
  roleName: string;
  label: string;
  roleDescription: string | null;
  dataScopeType: string | null;
  requiresOrganization: boolean;
  canManageUsers: boolean;
  manageableRoleIds: number[];
  isSystem: boolean;
  isStaffRole: boolean;
  userCount?: number;
};

type Draft = {
  roleId?: number;
  label: string;
  roleDescription: string;
  dataScopeType: string;
  requiresOrganization: boolean;
  canManageUsers: boolean;
  manageableRoleIds: number[];
};

const SCOPE_OPTIONS = [
  { value: "national", label: "Country-wide", description: "Sees every facility. No facility needs to be chosen for the person." },
  { value: "assigned", label: "Assigned facilities", description: "Each person is given all facilities or a list of facilities when they are added." },
  { value: "state", label: "State-wide", description: "Sees every facility in the same state as their own facility." },
  { value: "hub_hierarchy", label: "Hub-wide", description: "Sees their Hub plus every SubHub and Feeder under it." },
  { value: "subhub_hierarchy", label: "SubHub-wide", description: "Sees their SubHub plus every Feeder under it." },
  { value: "facility_only", label: "Single facility", description: "Sees only their own facility." },
];
const scopeLabel = (v: string | null) => SCOPE_OPTIONS.find((o) => o.value === v)?.label || "Not configured";

const input = "w-full h-11 px-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent";
const lbl = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition shrink-0 disabled:opacity-50 ${on ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function RolesScopePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { fetchRoles(); }, []);

  async function fetchRoles() {
    try {
      const { data } = await api.get("/roles");
      setRoles(data.roles || []);
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
      else toast.error("Could not load roles.");
    } finally {
      setLoading(false);
    }
  }

  const editing = roles.find((r) => r.roleId === draft?.roleId);
  const isSuper = editing?.roleName === "NICRAT_SUPER_ADMIN";

  function openNew() {
    setDraft({ label: "", roleDescription: "", dataScopeType: "facility_only", requiresOrganization: false, canManageUsers: false, manageableRoleIds: [] });
  }
  function openEdit(r: Role) {
    setDraft({
      roleId: r.roleId, label: r.label, roleDescription: r.roleDescription ?? "", dataScopeType: r.dataScopeType ?? "facility_only",
      requiresOrganization: r.requiresOrganization, canManageUsers: r.canManageUsers, manageableRoleIds: (r.manageableRoleIds ?? []).map(Number),
    });
  }

  async function save() {
    if (!draft) return;
    if (!draft.label.trim()) return toast.error("Give the role a name.");
    setSaving(true);
    try {
      const body = { ...draft, label: draft.label.trim() };
      if (draft.roleId) await api.put(`/roles/${draft.roleId}`, body);
      else await api.post("/roles", body);
      toast.success(draft.roleId ? "Role saved." : "Role created.");
      setDraft(null);
      await fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save the role.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Role) {
    if (!window.confirm(`Delete the role "${r.label}"?`)) return;
    setDeleting(r.roleId);
    try {
      await api.delete(`/roles/${r.roleId}`);
      toast.success("Role deleted.");
      await fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not delete the role.");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div></Layout>;
  }
  if (forbidden) {
    return <Layout><p className="py-10 text-sm text-gray-500">Only a Super Admin can view or change roles.</p></Layout>;
  }

  const staffRoles = roles.filter((r) => r.isStaffRole !== false);
  const nameOf = (id: number) => roles.find((r) => Number(r.roleId) === Number(id))?.label ?? `#${id}`;

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/ncsr/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <PageTitle>Roles &amp; Access</PageTitle>
            <p className="text-sm text-gray-500 -mt-4">What each role can see and do. Changes apply to everyone with the role.</p>
          </div>
          <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold">
            <Plus className="w-4 h-4" /> New role
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          A person can hold several roles: they see the facilities of their widest role, plus any facilities given to them on the Users page.
          Built-in roles <Lock className="inline w-3 h-3" /> can be changed but not deleted.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roles.map((r) => (
          <div key={r.roleId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white inline-flex items-center gap-1.5 flex-wrap">
                    {r.label} {r.isSystem && <Lock className="w-3 h-3 text-gray-400" />}
                  </p>
                  <p className="text-xs text-gray-400 break-all">{r.roleName}</p>
                  {r.roleDescription && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.roleDescription}</p>}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 shrink-0"><Users className="w-3.5 h-3.5" /> {r.userCount ?? 0}</span>
            </div>

            {r.isStaffRole === false ? (
              <p className="mt-3 text-xs text-gray-400 italic">Uses a separate portal login — not given to staff.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {scopeLabel(r.dataScopeType)}</span>
                {r.requiresOrganization && <span className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700">Belongs to an organisation</span>}
                {r.canManageUsers && (
                  <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                    {r.manageableRoleIds?.length ? `Can add: ${r.manageableRoleIds.map(nameOf).join(", ")}` : "Can view users"}
                  </span>
                )}
              </div>
            )}

            {r.isStaffRole !== false && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => openEdit(r)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                {!r.isSystem && (
                  <button type="button" onClick={() => remove(r)} disabled={deleting === r.roleId}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-red-200 text-sm font-medium text-red-600 disabled:opacity-50">
                    {deleting === r.roleId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {draft && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={() => setDraft(null)}>
          <div className="w-full sm:max-w-xl max-h-[94vh] flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl whitespace-normal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{draft.roleId ? `Edit role · ${editing?.label ?? ""}` : "New role"}</h2>
              <button type="button" onClick={() => setDraft(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
              <div>
                <label className={lbl}>Name *</label>
                <input className={input} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. State Coordinator" />
                {!draft.roleId && <p className="text-xs text-gray-500 mt-1">The system code is made from the name (e.g. STATE_COORDINATOR).</p>}
              </div>
              <div>
                <label className={lbl}>Description</label>
                <textarea className={`${input} h-20 py-2`} value={draft.roleDescription} onChange={(e) => setDraft({ ...draft, roleDescription: e.target.value })} />
              </div>
              <div>
                <label className={lbl}>Which facilities they see</label>
                <div className="space-y-2">
                  {SCOPE_OPTIONS.map((o) => (
                    <label key={o.value} className={`flex items-start gap-2 p-3 rounded-xl border ${isSuper ? "opacity-60" : "cursor-pointer"} ${draft.dataScopeType === o.value ? "border-green-600 bg-green-50/60 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                      <input type="radio" className="mt-1" disabled={isSuper} checked={draft.dataScopeType === o.value} onChange={() => setDraft({ ...draft, dataScopeType: o.value })} />
                      <span className="text-sm"><b className="text-gray-800 dark:text-white">{o.label}</b><span className="block text-xs text-gray-500">{o.description}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm"><b className="text-gray-800 dark:text-white">Belongs to an organisation</b><span className="block text-xs text-gray-500">Pick an organisation (e.g. a partner) when adding the person.</span></span>
                <Toggle on={draft.requiresOrganization} onChange={(v) => setDraft({ ...draft, requiresOrganization: v })} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm"><b className="text-gray-800 dark:text-white">Can manage users</b><span className="block text-xs text-gray-500">Can open User Management for the facilities they see.</span></span>
                <Toggle on={draft.canManageUsers} disabled={isSuper} onChange={(v) => setDraft({ ...draft, canManageUsers: v, manageableRoleIds: v ? draft.manageableRoleIds : [] })} />
              </div>
              {draft.canManageUsers && !isSuper && (
                <div>
                  <label className={lbl}>Roles they can give</label>
                  <p className="text-xs text-gray-500 mb-2">None ticked = they can only view users.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {staffRoles.filter((r) => r.roleName !== "NICRAT_SUPER_ADMIN").map((r) => {
                      const on = draft.manageableRoleIds.includes(Number(r.roleId));
                      return (
                        <button key={r.roleId} type="button"
                          onClick={() => setDraft({ ...draft, manageableRoleIds: on ? draft.manageableRoleIds.filter((i) => i !== Number(r.roleId)) : [...draft.manageableRoleIds, Number(r.roleId)] })}
                          className="flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                          {on ? <CheckSquare className="w-4 h-4 text-green-700 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                          <span className="text-gray-800 dark:text-gray-100">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {isSuper && <p className="text-xs text-gray-500">The Super Admin role always sees all facilities and can give every other role.</p>}
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="h-11 px-6 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="h-11 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {draft.roleId ? "Save role" : "Create role"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}
