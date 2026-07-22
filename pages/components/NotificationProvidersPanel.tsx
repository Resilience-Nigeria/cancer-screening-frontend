import React, { useEffect, useState } from "react";
import { Button, Input, Select } from "@roketid/windmill-react-ui";
import { Loader2, Plus, Trash2, CheckCircle2, X, MessageSquare, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";

type Provider = {
  providerId: number;
  channel: "sms" | "email" | "whatsapp";
  providerKey: string;
  providerName: string;
  config: Record<string, any>;
  isActive: boolean;
  isDefault: boolean;
};

type Template = {
  name: string;
  implemented: boolean;
  fields: Record<string, string>;
};

const CHANNEL_META: Record<string, { label: string; icon: any }> = {
  sms: { label: "SMS", icon: MessageSquare },
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: Phone },
};

export default function NotificationProvidersPanel() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Record<string, Provider[]>>({});
  const [templates, setTemplates] = useState<Record<string, Record<string, Template>>>({});
  const [addingChannel, setAddingChannel] = useState<string | null>(null);
  const [selectedProviderKey, setSelectedProviderKey] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [providerName, setProviderName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    setLoading(true);
    try {
      const { data } = await api.get("/notification-providers");
      setProviders(data.providers || {});
      setTemplates(data.templates || {});
    } catch {
      toast.error("Could not load notification providers.");
    } finally {
      setLoading(false);
    }
  }

  function startAdding(channel: string) {
    setAddingChannel(channel);
    setSelectedProviderKey("");
    setConfigValues({});
    setProviderName("");
  }

  function selectTemplate(channel: string, key: string) {
    setSelectedProviderKey(key);
    setProviderName(templates[channel]?.[key]?.name || "");
    setConfigValues({});
  }

  async function saveNewProvider(channel: string) {
    if (!selectedProviderKey) {
      toast.error("Please select a provider type.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/notification-providers", {
        channel,
        providerKey: selectedProviderKey,
        providerName,
        config: configValues,
      });
      setProviders((p) => ({ ...p, [channel]: [...(p[channel] || []), data.provider] }));
      toast.success("Provider added.");
      setAddingChannel(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not add this provider.");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(provider: Provider) {
    try {
      await api.post(`/notification-providers/${provider.providerId}/default`);
      setProviders((p) => ({
        ...p,
        [provider.channel]: (p[provider.channel] || []).map((row) => ({
          ...row,
          isDefault: row.providerId === provider.providerId,
        })),
      }));
      toast.success(`${provider.providerName} is now the default.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not set default provider.");
    }
  }

  async function removeProvider(provider: Provider) {
    try {
      await api.delete(`/notification-providers/${provider.providerId}`);
      setProviders((p) => ({
        ...p,
        [provider.channel]: (p[provider.channel] || []).filter((row) => row.providerId !== provider.providerId),
      }));
      toast.success("Provider removed.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not remove this provider.");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(templates).map(([channel, channelTemplates]) => {
        const meta = CHANNEL_META[channel] || { label: channel, icon: MessageSquare };
        const Icon = meta.icon;
        const configured = providers[channel] || [];
        const configuredKeys = configured.map((p) => p.providerKey);
        const availableToAdd = Object.entries(channelTemplates).filter(([key]) => !configuredKeys.includes(key));

        return (
          <div key={channel} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Icon className="w-4 h-4 text-green-700" /> {meta.label} Providers
              </h4>
              {availableToAdd.length > 0 && addingChannel !== channel && (
                <button
                  onClick={() => startAdding(channel)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-700 hover:bg-green-800 text-white"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Provider
                </button>
              )}
            </div>

            <div className="space-y-2">
              {configured.length === 0 && addingChannel !== channel && (
                <p className="text-sm text-gray-400">No {meta.label.toLowerCase()} provider configured yet.</p>
              )}
              {configured.map((provider) => {
                const template = channelTemplates[provider.providerKey];
                return (
                  <div key={provider.providerId} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{provider.providerName}</p>
                        {provider.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Default
                          </span>
                        )}
                        {template && !template.implemented && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Sending not yet wired up
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!provider.isDefault && (
                        <button
                          onClick={() => setDefault(provider)}
                          className="text-xs font-medium text-green-700 dark:text-green-400 hover:underline"
                        >
                          Make Default
                        </button>
                      )}
                      {!provider.isDefault && (
                        <button
                          onClick={() => removeProvider(provider)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {addingChannel === channel && (
              <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add a {meta.label} Provider</p>
                  <button onClick={() => setAddingChannel(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <Select
                  className="rounded-xl h-11"
                  value={selectedProviderKey}
                  onChange={(e) => selectTemplate(channel, e.target.value)}
                >
                  <option value="">Select provider type</option>
                  {availableToAdd.map(([key, tpl]) => (
                    <option key={key} value={key}>{tpl.name}{!tpl.implemented ? " (not yet wired for sending)" : ""}</option>
                  ))}
                </Select>

                {selectedProviderKey && (
                  <>
                    <Input
                      className="rounded-xl h-11"
                      placeholder="Display name"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                    />
                    {Object.entries(channelTemplates[selectedProviderKey].fields).map(([fieldKey, fieldLabel]) => (
                      <Input
                        key={fieldKey}
                        className="rounded-xl h-11"
                        placeholder={fieldLabel}
                        value={configValues[fieldKey] || ""}
                        onChange={(e) => setConfigValues((p) => ({ ...p, [fieldKey]: e.target.value }))}
                      />
                    ))}
                    <Button
                      onClick={() => saveNewProvider(channel)}
                      disabled={saving}
                      className="w-full h-11 rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Provider"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
