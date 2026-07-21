import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, ShieldCheck, Info } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Role = {
  roleId: number;
  roleName: string;
  roleDescription: string | null;
  dataScopeType: string | null;
};

const SCOPE_OPTIONS = [
  { value: "national", label: "Country-wide", description: "Sees every facility, no restriction." },
  { value: "state", label: "State-wide", description: "Sees every facility in the same state as their own." },
  { value: "hub_hierarchy", label: "Hub-wide", description: "Sees their Hub plus every SubHub and Feeder under it." },
  { value: "subhub_hierarchy", label: "SubHub-wide", description: "Sees their SubHub plus every Feeder under it." },
  { value: "facility_only", label: "Single Facility Only", description: "Sees only their own assigned facility." },
];

function scopeLabel(value: string | null) {
  return SCOPE_OPTIONS.find((o) => o.value === value)?.label || "Not configured";
}

export default function RolesScopePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    setLoading(true);
    try {
      const { data } = await api.get("/roles");
      setRoles(data.roles || []);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error("Could not load roles.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateScope(role: Role, newScope: string) {
    setSavingId(role.roleId);
    try {
      await api.patch(`/roles/${role.roleId}/scope`, { dataScopeType: newScope });
      setRoles((prev) => prev.map((r) => (r.roleId === role.roleId ? { ...r, dataScopeType: newScope } : r)));
      toast.success(`${role.roleName} updated to ${scopeLabel(newScope)}.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not update this role's scope.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </Layout>
    );
  }

  if (forbidden) {
    return (
      <Layout>
        <p className="text-sm text-gray-500">Only a Super Admin can view or change role data-scope settings.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link
          href="/ncsr/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="mt-3">
          <PageTitle>Role Data Scope</PageTitle>
          <p className="text-sm text-gray-500 mt-1">
            Controls how much of the system each role can see — from a single facility up to the whole country.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          This is role-level configuration — everyone with a given role shares the same scope type. The actual
          facilities each person sees still depends on their own assigned facility (e.g. two Navigators with
          "Hub-wide" scope, but at different Hubs, each see only their own Hub's hierarchy).
        </p>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <div
            key={role.roleId}
            className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{role.roleName}</p>
                  {role.roleDescription && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">{role.roleDescription}</p>
                  )}
                </div>
              </div>

              {role.roleName === "CLIENT" ? (
                <span className="text-xs text-gray-400 italic">Uses a separate portal login — no scope applies</span>
              ) : (
                <div className="flex items-center gap-2">
                  {savingId === role.roleId && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  <select
                    value={role.dataScopeType || ""}
                    disabled={savingId === role.roleId}
                    onChange={(e) => updateScope(role, e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="" disabled>Select scope</option>
                    {SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {role.dataScopeType && role.roleName !== "CLIENT" && (
              <p className="mt-2 text-xs text-gray-400">
                {SCOPE_OPTIONS.find((o) => o.value === role.dataScopeType)?.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
