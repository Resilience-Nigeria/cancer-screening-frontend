import React, { useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { Loader2, Save, Settings as SettingsIcon, Bell, Shield } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import NotificationProvidersPanel from "../components/NotificationProvidersPanel";
import api from "../../lib/api";

type SettingRow = {
  settingId: number;
  key: string;
  value: string | null;
  type: "string" | "boolean" | "integer" | "select";
  group: string;
  label: string | null;
  description: string | null;
  options: Record<string, string> | null;
};

const GROUP_META: Record<string, { label: string; icon: any }> = {
  general: { label: "General", icon: SettingsIcon },
  notifications: { label: "Notifications & Providers", icon: Bell },
  security: { label: "Security", icon: Shield },
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<Record<string, SettingRow[]>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setGroups(data.settings || {});
      const initialValues: Record<string, string> = {};
      Object.values(data.settings || {}).forEach((rows: any) => {
        rows.forEach((row: SettingRow) => {
          initialValues[row.key] = row.value ?? "";
        });
      });
      setValues(initialValues);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error("Could not load settings.");
      }
    } finally {
      setLoading(false);
    }
  }

  function setValue(key: string, value: string) {
    setValues((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/settings", { settings: values });
      toast.success("Settings saved.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  function renderField(row: SettingRow) {
    const value = values[row.key] ?? "";

    if (row.type === "boolean") {
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value === "1" || value === "true"}
            onChange={(e) => setValue(row.key, e.target.checked ? "1" : "0")}
            className="w-4 h-4 text-green-600 rounded"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Enabled</span>
        </label>
      );
    }

    if (row.type === "select" && row.options) {
      return (
        <Select className="mt-2 rounded-2xl h-12" value={value} onChange={(e) => setValue(row.key, e.target.value)}>
          {Object.entries(row.options).map(([optValue, optLabel]) => (
            <option key={optValue} value={optValue}>{optLabel}</option>
          ))}
        </Select>
      );
    }

    if (row.type === "integer") {
      return (
        <Input
          type="number"
          className="mt-2 rounded-2xl h-12"
          value={value}
          onChange={(e) => setValue(row.key, e.target.value)}
        />
      );
    }

    return (
      <Input
        className="mt-2 rounded-2xl h-12"
        value={value}
        onChange={(e) => setValue(row.key, e.target.value)}
      />
    );
  }

  if (forbidden) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-16">
          <Shield className="w-10 h-10 mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Super Admins only</h3>
          <p className="text-sm text-gray-500 mt-2">You don't have permission to view system settings.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <PageTitle>Settings</PageTitle>
          <p className="text-sm text-gray-500 mt-1">Platform-wide configuration, including notification providers.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</span>}
        </Button>
      </div>

      <div className="space-y-6 max-w-2xl">
        {Object.entries(groups).map(([groupKey, rows]) => {
          const meta = GROUP_META[groupKey] || { label: groupKey, icon: SettingsIcon };
          const Icon = meta.icon;
          return (
            <div key={groupKey} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-5">
                <Icon className="w-5 h-5 text-green-700" /> {meta.label}
              </h3>
              <div className="space-y-5">
                {rows.map((row) => (
                  <div key={row.key}>
                    <Label>
                      <span className="text-sm font-semibold">{row.label || row.key}</span>
                      {renderField(row)}
                    </Label>
                    {row.description && (
                      <p className="text-xs text-gray-400 mt-1">{row.description}</p>
                    )}
                  </div>
                ))}
              </div>

              {groupKey === "notifications" && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <NotificationProvidersPanel />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
