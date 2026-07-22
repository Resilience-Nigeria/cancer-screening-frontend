import React, { useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Loader2, Save, Menu as MenuIcon } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";

type Rule = {
  ruleId: number;
  menuKey: string;
  menuLabel: string;
  allowedRoles: string[] | null;
};

const ROLE_LABELS: Record<string, string> = {
  NICRAT_SUPER_ADMIN: "Super Admin",
  NICRAT_ADMIN: "NICRAT Admin",
  NAVIGATOR: "Navigator",
  HOSPITAL_ADMIN: "Hospital Admin",
  NURSE: "Nurse",
  DOCTOR: "Doctor",
  PARTNER: "Partner",
};

export default function MenuVisibilityPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[] | null>>({});

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const { data } = await api.get("/menu-visibility");
      setRules(data.rules || []);
      setRoles(data.roles || []);
      const initial: Record<string, string[] | null> = {};
      (data.rules || []).forEach((r: Rule) => {
        initial[r.menuKey] = r.allowedRoles;
      });
      setMatrix(initial);
    } catch {
      toast.error("Could not load menu visibility rules.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(menuKey: string, role: string) {
    setMatrix((prev) => {
      const current = prev[menuKey];
      // Switching from "Everyone" (null) by checking a specific role
      // means "restrict to just this role" — start from an empty set,
      // not from every role. Toggling within an existing restricted
      // set (including down to empty, meaning nobody) works normally.
      const base = current === null || current === undefined ? [] : current;
      const next = base.includes(role) ? base.filter((r) => r !== role) : [...base, role];
      return { ...prev, [menuKey]: next };
    });
  }

  function setEveryone(menuKey: string) {
    setMatrix((prev) => ({ ...prev, [menuKey]: null }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/menu-visibility", { rules: matrix });
      toast.success("Menu visibility saved.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save menu visibility.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <MenuIcon className="w-4 h-4 text-green-700" /> Menu Visibility by Role
        </h4>
        <Button onClick={handleSave} disabled={saving} className="h-10 px-4 rounded-xl bg-green-700 border-green-700 hover:bg-green-800">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5 text-sm"><Save className="w-3.5 h-3.5" /> Save</span>}
        </Button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Leave every box unchecked (or click "Everyone") to make a menu item visible to all roles.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="py-2 pr-4">Menu Item</th>
              {roles.map((role) => (
                <th key={role} className="py-2 px-2 text-center whitespace-nowrap">{ROLE_LABELS[role] || role}</th>
              ))}
              <th className="py-2 px-2 text-center">Everyone</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const allowed = matrix[rule.menuKey];
              const isEveryone = allowed === null || allowed === undefined;
              return (
                <tr key={rule.menuKey} className="border-b border-gray-50 dark:border-gray-800">
                  <td className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {rule.menuLabel}
                    {!isEveryone && (allowed || []).length === 0 && (
                      <span className="block text-xs font-normal text-amber-600">No role assigned — hidden from everyone</span>
                    )}
                  </td>
                  {roles.map((role) => (
                    <td key={role} className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={!isEveryone && (allowed || []).includes(role)}
                        onChange={() => toggle(rule.menuKey, role)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center">
                    <input
                      type="radio"
                      checked={isEveryone}
                      onChange={() => setEveryone(rule.menuKey)}
                      className="w-4 h-4 text-green-600"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
