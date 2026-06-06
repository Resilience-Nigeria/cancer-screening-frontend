import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Input,
  HelperText,
  Label,
  Select,
  Button,
  Textarea,
} from "@roketid/windmill-react-ui";
import {
  ChevronRight,
  ShieldCheck,
  Loader2,
  UserRound,
  Edit,
  Save,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import SectionTitle from "../components/Typography/SectionTitle";
import api from "../../lib/api";

type ClientSummary = {
  clientId: number;
  fullName: string;
  phoneNumber?: string | null;
};

type RiskProfile = {
  riskProfileId?: number;
  familyHistory: string;
  
  // Detailed Smoking fields
  smokingStatus?: string;
  cigarettesPerDay?: number;
  packetsPerWeek?: number;
  cigaretteBrands?: string;
  smokingDuration?: number;
  passiveSmokingExposure?: boolean;
  passiveSmokingSource?: string[];
  passiveSmokingFrequency?: string;
  passiveSmokingLocation?: string[];
  
  // Detailed Alcohol fields
  alcoholConsumption?: string;
  alcoholUnitsPerWeek?: number;
  alcoholFrequency?: string;
  alcoholTypes?: string[];
  alcoholDuration?: number;
  
  // Physical measurements
  weightKg?: number | string;
  heightCm?: number | string;
  bmi?: number | string;
  
  // Infectious Disease Status - HIV now OPTIONAL
  hivStatus?: string;
  hbvStatus?: string;
  hcvStatus?: string;
  
  // General
  comorbiditiesJson?: string[];
  recordedAt?: string;
};

export default function RiskProfilePage() {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<ClientSummary | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    familyHistory: "",
    
    // Smoking fields
    smokingStatus: "",
    cigarettesPerDay: "",
    packetsPerWeek: "",
    cigaretteBrands: "",
    smokingDuration: "",
    passiveSmokingExposure: "",
    passiveSmokingSource: [] as string[],
    passiveSmokingFrequency: "",
    passiveSmokingLocation: [] as string[],
    
    // Alcohol fields
    alcoholConsumption: "",
    alcoholUnitsPerWeek: "",
    alcoholFrequency: "",
    alcoholTypes: [] as string[],
    alcoholDuration: "",
    
    // Physical
    weightKg: "",
    heightCm: "",
    
    // Infectious Disease - HIV OPTIONAL
    hivStatus: "",
    hbvStatus: "",
    hcvStatus: "",
    
    comorbiditiesJson: [] as string[],
  });

  const [comorbidityInput, setComorbidityInput] = useState("");

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function toggleArrayValue(field: 'passiveSmokingSource' | 'passiveSmokingLocation' | 'alcoholTypes', value: string) {
    setForm(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  }

  async function fetchData() {
    if (!clientId) return;

    setLoading(true);

    try {
      const [clientRes, riskRes] = await Promise.all([
        api.get(`/clients/${clientId}`),
        api.get(`/clients/${clientId}/risk-profile`).catch(() => null),
      ]);

      const rawClient = clientRes.data?.client || clientRes.data?.data;
      setClient({
        clientId: rawClient.clientId ?? rawClient.id,
        fullName: rawClient.fullName ?? rawClient.full_name ?? "",
        phoneNumber: rawClient.phoneNumber ?? rawClient.phone_number ?? "",
      });

      const rawRisk =
        riskRes?.data?.risk_profile ||
        riskRes?.data?.riskProfile ||
        riskRes?.data?.profile ||
        riskRes?.data?.data ||
        riskRes?.data;

      if (rawRisk && (rawRisk.riskProfileId || rawRisk.risk_profile_id)) {
        const profile: RiskProfile = {
          riskProfileId: rawRisk.riskProfileId ?? rawRisk.risk_profile_id,
          familyHistory: rawRisk.familyHistory ?? rawRisk.family_history ?? "",
          
          // Smoking
          smokingStatus: rawRisk.smokingStatus ?? rawRisk.smoking_status ?? "",
          cigarettesPerDay: rawRisk.cigarettesPerDay ?? rawRisk.cigarettes_per_day,
          packetsPerWeek: rawRisk.packetsPerWeek ?? rawRisk.packets_per_week,
          cigaretteBrands: rawRisk.cigaretteBrands ?? rawRisk.cigarette_brands ?? "",
          smokingDuration: rawRisk.smokingDuration ?? rawRisk.smoking_duration,
          passiveSmokingExposure: rawRisk.passiveSmokingExposure ?? rawRisk.passive_smoking_exposure,
          passiveSmokingSource: rawRisk.passiveSmokingSource ?? rawRisk.passive_smoking_source ?? [],
          passiveSmokingFrequency: rawRisk.passiveSmokingFrequency ?? rawRisk.passive_smoking_frequency ?? "",
          passiveSmokingLocation: rawRisk.passiveSmokingLocation ?? rawRisk.passive_smoking_location ?? [],
          
          // Alcohol
          alcoholConsumption: rawRisk.alcoholConsumption ?? rawRisk.alcohol_consumption ?? "",
          alcoholUnitsPerWeek: rawRisk.alcoholUnitsPerWeek ?? rawRisk.alcohol_units_per_week,
          alcoholFrequency: rawRisk.alcoholFrequency ?? rawRisk.alcohol_frequency ?? "",
          alcoholTypes: rawRisk.alcoholTypes ?? rawRisk.alcohol_types ?? [],
          alcoholDuration: rawRisk.alcoholDuration ?? rawRisk.alcohol_duration,
          
          // Physical
          weightKg: rawRisk.weightKg ?? rawRisk.weight_kg ?? "",
          heightCm: rawRisk.heightCm ?? rawRisk.height_cm ?? "",
          bmi: rawRisk.bmi ?? "",
          
          // Infectious Disease
          hivStatus: rawRisk.hivStatus ?? rawRisk.hiv_status ?? "",
          hbvStatus: rawRisk.hbvStatus ?? rawRisk.hbv_status ?? "",
          hcvStatus: rawRisk.hcvStatus ?? rawRisk.hcv_status ?? "",
          
          comorbiditiesJson: rawRisk.comorbiditiesJson ?? rawRisk.comorbidities_json ?? [],
          recordedAt: rawRisk.recordedAt ?? rawRisk.recorded_at ?? "",
        };

        setRiskProfile(profile);
        setIsEditMode(false);

        // Pre-fill form for editing
        setForm({
          familyHistory: profile.familyHistory ?? "",
          
          smokingStatus: profile.smokingStatus ?? "",
          cigarettesPerDay: (profile.cigarettesPerDay ?? "").toString(),
          packetsPerWeek: (profile.packetsPerWeek ?? "").toString(),
          cigaretteBrands: profile.cigaretteBrands ?? "",
          smokingDuration: (profile.smokingDuration ?? "").toString(),
          passiveSmokingExposure: (profile.passiveSmokingExposure ?? "").toString(),
          passiveSmokingSource: profile.passiveSmokingSource ?? [],
          passiveSmokingFrequency: profile.passiveSmokingFrequency ?? "",
          passiveSmokingLocation: profile.passiveSmokingLocation ?? [],
          
          alcoholConsumption: profile.alcoholConsumption ?? "",
          alcoholUnitsPerWeek: (profile.alcoholUnitsPerWeek ?? "").toString(),
          alcoholFrequency: profile.alcoholFrequency ?? "",
          alcoholTypes: profile.alcoholTypes ?? [],
          alcoholDuration: (profile.alcoholDuration ?? "").toString(),
          
          weightKg: (profile.weightKg ?? "").toString(),
          heightCm: (profile.heightCm ?? "").toString(),
          
          hivStatus: profile.hivStatus ?? "",
          hbvStatus: profile.hbvStatus ?? "",
          hcvStatus: profile.hcvStatus ?? "",
          
          comorbiditiesJson: profile.comorbiditiesJson ?? [],
        });
      } else {
        setRiskProfile(null);
        setIsEditMode(true);
      }
    } catch (err: any) {
      console.error("Error fetching risk profile:", err);
      toast.error(
        err?.response?.data?.message || "Unable to load risk profile."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [clientId]);

  function addComorbidity() {
    const trimmed = comorbidityInput.trim();
    if (!trimmed) return;

    if (!form.comorbiditiesJson.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        comorbiditiesJson: [...prev.comorbiditiesJson, trimmed],
      }));
    }

    setComorbidityInput("");
  }

  function removeComorbidity(index: number) {
    setForm((prev) => ({
      ...prev,
      comorbiditiesJson: prev.comorbiditiesJson.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setServerError("");

    try {
      const payload = {
        familyHistory: form.familyHistory === "yes",
        
        // Smoking
        smokingStatus: form.smokingStatus || null,
        cigarettesPerDay: form.cigarettesPerDay ? parseInt(form.cigarettesPerDay) : null,
        packetsPerWeek: form.packetsPerWeek ? parseInt(form.packetsPerWeek) : null,
        cigaretteBrands: form.cigaretteBrands || null,
        smokingDuration: form.smokingDuration ? parseInt(form.smokingDuration) : null,
        passiveSmokingExposure: form.passiveSmokingExposure === "true",
        passiveSmokingSource: form.passiveSmokingSource.length > 0 ? form.passiveSmokingSource : null,
        passiveSmokingFrequency: form.passiveSmokingFrequency || null,
        passiveSmokingLocation: form.passiveSmokingLocation.length > 0 ? form.passiveSmokingLocation : null,
        
        // Alcohol
        alcoholConsumption: form.alcoholConsumption || null,
        alcoholUnitsPerWeek: form.alcoholUnitsPerWeek ? parseInt(form.alcoholUnitsPerWeek) : null,
        alcoholFrequency: form.alcoholFrequency || null,
        alcoholTypes: form.alcoholTypes.length > 0 ? form.alcoholTypes : null,
        alcoholDuration: form.alcoholDuration ? parseInt(form.alcoholDuration) : null,
        
        // Physical
        weightKg: form.weightKg ? parseFloat(form.weightKg.toString()) : null,
        heightCm: form.heightCm ? parseFloat(form.heightCm.toString()) : null,
        
        // Infectious Disease - HIV is now OPTIONAL
        hivStatus: form.hivStatus || null,
        hbvStatus: form.hbvStatus || null,
        hcvStatus: form.hcvStatus || null,
        
        comorbiditiesJson: form.comorbiditiesJson,
      };

      await api.put(`/clients/${clientId}/risk-profile`, payload);
      toast.success("Risk profile saved successfully.");

      await fetchData();
    } catch (err: any) {
      const response = err?.response?.data;

      if (response?.errors) {
        const mapped: Record<string, string> = {};
        Object.keys(response.errors).forEach((key) => {
          if (
            Array.isArray(response.errors[key]) &&
            response.errors[key].length > 0
          ) {
            mapped[key] = response.errors[key][0];
          }
        });
        setErrors(mapped);
      }

      const message = response?.message || "Unable to save risk profile.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <PageTitle>Risk Profile</PageTitle>
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Loading risk profile...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Risk Profile</PageTitle>

        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  National Cancer Screening Register
                </div>

                <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                  Risk profile for {client?.fullName || "client"}
                </h2>

                <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                  Comprehensive risk assessment covering general risk factors for all 5 cancers.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Clients</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{client?.fullName || "Client"}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>Risk Profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {serverError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {serverError}
        </div>
      ) : null}

      {!isEditMode && riskProfile ? (
        <div className="space-y-6">
          {/* View Mode */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60 flex justify-between items-center">
              <SectionTitle>Risk Profile Summary</SectionTitle>
              <Button
                size="small"
                className="rounded-xl"
                onClick={() => setIsEditMode(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </span>
              </Button>
            </div>

            <div className="px-5 py-6 sm:px-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Family History</p>
                  <p className="mt-1 font-semibold">{riskProfile.familyHistory}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Smoking Status</p>
                  <p className="mt-1 font-semibold capitalize">{riskProfile.smokingStatus || "—"}</p>
                </div>

                {riskProfile.smokingStatus === "active_smoker" && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cigarettes/Day</p>
                      <p className="mt-1 font-semibold">{riskProfile.cigarettesPerDay || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Packets/Week</p>
                      <p className="mt-1 font-semibold">{riskProfile.packetsPerWeek || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Brands</p>
                      <p className="mt-1 font-semibold">{riskProfile.cigaretteBrands || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Duration (years)</p>
                      <p className="mt-1 font-semibold">{riskProfile.smokingDuration || "—"}</p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Passive Smoking Exposure</p>
                  <p className="mt-1 font-semibold">{riskProfile.passiveSmokingExposure ? "Yes" : "No"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Alcohol Consumption</p>
                  <p className="mt-1 font-semibold capitalize">{riskProfile.alcoholConsumption?.replace(/_/g, ' ') || "—"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">HIV Status</p>
                  <p className="mt-1 font-semibold capitalize">{riskProfile.hivStatus || "Not Specified"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              layout="outline"
              className="rounded-2xl"
              onClick={() => router.push(`/ncsr/client-details?clientId=${clientId}`)}
            >
              Back to Client
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Risk Factors */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>General Risk Factors</SectionTitle>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Common factors across all 5 cancers
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6 space-y-5">
              <Label>
                <span className="text-sm font-semibold">Family History of Cancer</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.familyHistory}
                  onChange={(e) => setField("familyHistory", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Label>
            </div>
          </div>

          {/* Detailed Smoking Assessment */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Smoking Status</SectionTitle>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Detailed smoking assessment including passive exposure
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6 space-y-5">
              <Label>
                <span className="text-sm font-semibold">Smoking Status</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.smokingStatus}
                  onChange={(e) => setField("smokingStatus", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="non_smoker">Non-smoker</option>
                  <option value="active_smoker">Active smoker</option>
                  <option value="former_smoker">Former smoker</option>
                  <option value="passive_smoker">Passive smoker (exposed to secondhand smoke)</option>
                </Select>
              </Label>

              {form.smokingStatus === "active_smoker" && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Label>
                    <span className="text-sm font-semibold">Cigarettes per Day</span>
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      type="number"
                      min="0"
                      value={form.cigarettesPerDay}
                      onChange={(e) => setField("cigarettesPerDay", e.target.value)}
                      placeholder="How many sticks"
                    />
                  </Label>

                  <Label>
                    <span className="text-sm font-semibold">Packets per Week</span>
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      type="number"
                      min="0"
                      value={form.packetsPerWeek}
                      onChange={(e) => setField("packetsPerWeek", e.target.value)}
                      placeholder="Number of packets"
                    />
                  </Label>

                  <Label className="md:col-span-2">
                    <span className="text-sm font-semibold">Cigarette Brands</span>
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      value={form.cigaretteBrands}
                      onChange={(e) => setField("cigaretteBrands", e.target.value)}
                      placeholder="Enter brand names (e.g., Marlboro, Benson)"
                    />
                  </Label>

                  <Label>
                    <span className="text-sm font-semibold">Duration (years)</span>
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      type="number"
                      min="0"
                      value={form.smokingDuration}
                      onChange={(e) => setField("smokingDuration", e.target.value)}
                      placeholder="Years smoking"
                    />
                  </Label>
                </div>
              )}

              <div className="border-t pt-5">
                <Label>
                  <span className="text-sm font-semibold">Passive Smoking Exposure</span>
                  <p className="mt-1 text-xs text-gray-500">Does anyone around you smoke?</p>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.passiveSmokingExposure}
                    onChange={(e) => setField("passiveSmokingExposure", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </Label>

                {form.passiveSmokingExposure === "true" && (
                  <div className="mt-5 space-y-5">
                    <div>
                      <span className="text-sm font-semibold">Who smokes around you? (Select all that apply)</span>
                      <div className="mt-3 space-y-2">
                        {['family_members', 'spouse_partner', 'friends', 'colleagues', 'other'].map((source) => (
                          <Label key={source} check>
                            <Input
                              type="checkbox"
                              checked={form.passiveSmokingSource.includes(source)}
                              onChange={() => toggleArrayValue('passiveSmokingSource', source)}
                            />
                            <span className="ml-2 capitalize">{source.replace(/_/g, ' ')}</span>
                          </Label>
                        ))}
                      </div>
                    </div>

                    <Label>
                      <span className="text-sm font-semibold">Exposure Frequency</span>
                      <Select
                        className="mt-2 rounded-2xl h-12 shadow-sm"
                        value={form.passiveSmokingFrequency}
                        onChange={(e) => setField("passiveSmokingFrequency", e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="daily">Daily</option>
                        <option value="several_times_weekly">Several times per week</option>
                        <option value="occasionally">Occasionally</option>
                      </Select>
                    </Label>

                    <div>
                      <span className="text-sm font-semibold">Exposure Location (Select all that apply)</span>
                      <div className="mt-3 space-y-2">
                        {['home', 'workplace', 'social_settings', 'multiple_locations'].map((location) => (
                          <Label key={location} check>
                            <Input
                              type="checkbox"
                              checked={form.passiveSmokingLocation.includes(location)}
                              onChange={() => toggleArrayValue('passiveSmokingLocation', location)}
                            />
                            <span className="ml-2 capitalize">{location.replace(/_/g, ' ')}</span>
                          </Label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Alcohol Consumption */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Alcohol Consumption</SectionTitle>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Detailed alcohol usage assessment
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6 space-y-5">
              <Label>
                <span className="text-sm font-semibold">Alcohol Frequency</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.alcoholFrequency}
                  onChange={(e) => setField("alcoholFrequency", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="never">Never</option>
                  <option value="occasionally">Occasionally (less than once a week)</option>
                  <option value="weekly">Weekly (1-2 times per week)</option>
                  <option value="regularly">Regularly (3-6 times per week)</option>
                  <option value="daily">Daily</option>
                </Select>
              </Label>

              {form.alcoholFrequency && form.alcoholFrequency !== "never" && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Label>
                    <span className="text-sm font-semibold">Units per Week</span>
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      type="number"
                      min="0"
                      value={form.alcoholUnitsPerWeek}
                      onChange={(e) => setField("alcoholUnitsPerWeek", e.target.value)}
                      placeholder="Number of units"
                    />
                  </Label>

                  <Label>
                    <span className="text-sm font-semibold">Duration (years)</span>
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      type="number"
                      min="0"
                      value={form.alcoholDuration}
                      onChange={(e) => setField("alcoholDuration", e.target.value)}
                      placeholder="Years of consumption"
                    />
                  </Label>

                  <div className="md:col-span-2">
                    <span className="text-sm font-semibold">Type of Alcohol (Select all that apply)</span>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {['beer', 'wine', 'spirits', 'mixed_drinks', 'other'].map((type) => (
                        <Label key={type} check>
                          <Input
                            type="checkbox"
                            checked={form.alcoholTypes.includes(type)}
                            onChange={() => toggleArrayValue('alcoholTypes', type)}
                          />
                          <span className="ml-2 capitalize">{type.replace(/_/g, ' ')}</span>
                        </Label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Physical Measurements */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Physical Measurements</SectionTitle>
            </div>

            <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Weight (kg)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.weightKg}
                  onChange={(e) => setField("weightKg", e.target.value)}
                  placeholder="Enter weight in kg"
                />
              </Label>

              <Label>
                <span className="text-sm font-semibold">Height (cm)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.heightCm}
                  onChange={(e) => setField("heightCm", e.target.value)}
                  placeholder="Enter height in cm"
                />
              </Label>
            </div>
          </div>

          {/* Infectious Disease Status - HIV NOW OPTIONAL */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Infectious Disease Status</SectionTitle>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Optional - HIV status is not required
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-3">
              <Label>
                <span className="text-sm font-semibold">HIV Status (Optional)</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hivStatus}
                  onChange={(e) => setField("hivStatus", e.target.value)}
                >
                  <option value="">Not Specified</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Hepatitis B Status</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hbvStatus}
                  onChange={(e) => setField("hbvStatus", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Hepatitis C Status</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.hcvStatus}
                  onChange={(e) => setField("hcvStatus", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Label>
            </div>
          </div>

          {/* Comorbidities */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Comorbidities</SectionTitle>
            </div>

            <div className="px-5 py-6 sm:px-6">
              <Label>
                <span className="text-sm font-semibold">
                  Add Comorbidity Conditions
                </span>
                <div className="mt-2 flex gap-2">
                  <Input
                    className="rounded-2xl h-12 shadow-sm"
                    value={comorbidityInput}
                    onChange={(e) => setComorbidityInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addComorbidity();
                      }
                    }}
                    placeholder="e.g., Diabetes, Hypertension"
                  />
                  <Button
                    type="button"
                    onClick={addComorbidity}
                    className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 whitespace-nowrap"
                  >
                    Add
                  </Button>
                </div>
              </Label>

              {form.comorbiditiesJson.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {form.comorbiditiesJson.map((item, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-sm text-green-800 dark:text-green-200"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeComorbidity(index)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 z-10">
            <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl px-4 py-4 sm:px-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {riskProfile && (
                  <Button
                    layout="outline"
                    type="button"
                    className="rounded-2xl h-11"
                    onClick={() => setIsEditMode(false)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Cancel
                    </span>
                  </Button>
                )}

                <Button
                  layout="outline"
                  type="button"
                  className="rounded-2xl h-11"
                  onClick={() =>
                    router.push(`/ncsr/client-details?clientId=${clientId}`)
                  }
                >
                  Back to Client
                </Button>

                <Button
                  type="submit"
                  className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                  disabled={submitting}
                >
                  <span className="inline-flex items-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    {submitting ? "Saving..." : "Save Risk Profile"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </Layout>
  );
}