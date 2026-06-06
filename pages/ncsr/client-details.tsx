import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Badge, Button } from "@roketid/windmill-react-ui";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  Activity,
  Stethoscope,
  AlertTriangle,
  Heart,
  Users,
  HeartPulse,
  Wine,
  Cigarette,
  FlaskConical,
  Building2,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import SectionTitle from "../components/Typography/SectionTitle";
import RiskProfileModal from "../components/modals/RiskProfile";
import ScreeningModuleSelector from "../components/modals/ScreeningModal";
import OutcomeModal from "../components/modals/Outcome";
import api from "../../lib/api";
import AgeCard from "../components/Cards/AgeCard";

type Visit = {
  visitId: number;
  visitDate: string;
  visitType: string;
  notes?: string | null;
  cervicalScreening?: any;
  breastScreening?: any;
  colorectalScreening?: any;
  liverScreening?: any;
  prostateScreening?: any;
};

type ClientDetail = {
  id: number;
  clientId: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber?: string | null;
  screeningCategory?: string;
  state?: string | null;
  lga?: string | null;
  residence?: string | null;
  registrationDate?: string | null;
  latestRiskProfile?: any;
  outcome?: any;
  visits?: Visit[];
};

/**
 * Risk scoring — aligned to the actual risk-profile columns.
 */
function calculateRiskLevel(
  rp: any
): "high" | "medium" | "low" | "unknown" {
  if (!rp) return "unknown";

  let score = 0;

  // Smoking
  if (rp.smokingStatus === "active_smoker") {
    score += 3;
    if (rp.cigarettesPerDay && rp.cigarettesPerDay > 10) score += 2;
    if (rp.smokingDuration && rp.smokingDuration > 10) score += 2;
  } else if (rp.smokingStatus === "former_smoker") {
    score += 1;
  } else if (rp.smokingStatus === "passive_smoker") {
    score += 1;
  }

  // Alcohol (stored as alcoholConsumption / alcoholFrequency)
  const alcohol = rp.alcoholFrequency ?? rp.alcoholConsumption;
  if (alcohol === "daily" || alcohol === "regularly") {
    score += 2;
    if (rp.alcoholUnitsPerWeek && rp.alcoholUnitsPerWeek > 14) score += 2;
  } else if (alcohol === "weekly" || alcohol === "occasionally") {
    score += 1;
  }

  // Viral / HIV status
  if (rp.hivStatus === "positive") score += 2;
  if (rp.hbvStatus === "positive") score += 2;
  if (rp.hcvStatus === "positive") score += 2;

  // Family history (boolean or yes/no)
  if ( rp.familyHistory === "yes") score += 3;

  // BMI
  if (rp.bmi) {
    const bmi = parseFloat(rp.bmi);
    if (bmi >= 30) score += 2;
    else if (bmi >= 25) score += 1;
  }

  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function getRiskBadgeType(level: string): string {
  switch (level) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "neutral";
  }
}

function getRiskLevelText(level: string): string {
  switch (level) {
    case "high":
      return "High Risk";
    case "medium":
      return "Medium Risk";
    case "low":
      return "Low Risk";
    default:
      return "Not Assessed";
  }
}

export default function ClientSummaryPage() {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRiskProfile, setHasRiskProfile] = useState(false);

  // Edit modals (corrections only — new encounters go through the wizard)
  const [showRiskProfileModal, setShowRiskProfileModal] = useState(false);
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

  const riskLevel = client?.latestRiskProfile
    ? calculateRiskLevel(client.latestRiskProfile)
    : "unknown";

  async function fetchClient() {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/clients/${clientId}`);
      const rawClient = data?.client || data?.data;

      const riskProfiles =
        rawClient.risk_profiles || rawClient.riskProfiles || [];
      const latestRiskProfile = riskProfiles.length > 0 ? riskProfiles[0] : null;

      let outcome = rawClient.outcome;
      if (!outcome) {
        try {
          const outcomeRes = await api.get(`/clients/${clientId}/outcome`);
          outcome = outcomeRes?.data?.data;
        } catch {
          // no outcome
        }
      }

      const mappedClient: ClientDetail = {
        id: rawClient.id,
        clientId: rawClient.clientId ?? rawClient.id,
        fullName: rawClient.fullName ?? rawClient.full_name ?? "",
        gender: rawClient.gender ?? "",
        dateOfBirth: rawClient.dateOfBirth ?? "",
        phoneNumber: rawClient.phoneNumber ?? rawClient.phone_number ?? "",
        screeningCategory:
          rawClient.screeningCategory ?? rawClient.screening_category ?? "",
        state: rawClient.stateOfResidence ?? rawClient.state ?? "",
        lga: rawClient.lgaOfResidence ?? rawClient.lga ?? "",
        residence: rawClient.residence ?? "",
        registrationDate:
          rawClient.registrationDate ?? rawClient.registration_date ?? "",
        latestRiskProfile,
        outcome,
        visits: (rawClient.visits || []).map((visit: any) => ({
          visitId: visit.visitId ?? visit.id,
          visitDate: visit.visitDate ?? visit.visit_date,
          visitType: visit.visitType ?? visit.visit_type,
          notes: visit.notes,
          cervicalScreening:
            visit.cervicalScreening ?? visit.cervical_screening ?? null,
          breastScreening:
            visit.breastScreening ?? visit.breast_screening ?? null,
          colorectalScreening:
            visit.colorectalScreening ?? visit.colorectal_screening ?? null,
          liverScreening: visit.liverScreening ?? visit.liver_screening ?? null,
          prostateScreening:
            visit.prostateScreening ?? visit.prostate_screening ?? null,
        })),
      };

      setClient(mappedClient);
      setHasRiskProfile(
        !!(
          latestRiskProfile &&
          (latestRiskProfile.riskProfileId ||
            latestRiskProfile.risk_profile_id)
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // New encounters run through the guided wizard, which auto-creates the visit.
  function startScreening() {
    router.push(`/ncsr/screening-wizard?clientId=${clientId}`);
  }

  function openVisitScreening(visitId: number) {
    setSelectedVisitId(visitId);
    setShowScreeningModal(true);
  }

  if (loading) {
    return (
      <Layout>
        <PageTitle>Client Summary</PageTitle>
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Loading client...
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <PageTitle>Client Summary</PageTitle>
        <div className="mt-6 text-sm text-red-600">Client not found.</div>
      </Layout>
    );
  }

  const completedModules =
    client.visits?.reduce((total, visit) => {
      return (
        total +
        [
          visit.cervicalScreening,
          visit.breastScreening,
          visit.colorectalScreening,
          visit.liverScreening,
          visit.prostateScreening,
        ].filter(Boolean).length
      );
    }, 0) || 0;

  const formatRiskValue = (value: any) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    if (value === null || value === undefined || value === "")
      return "Not provided";
    if (value === "yes") return "Yes";
    if (value === "no") return "No";
    if (value === "non_smoker") return "Non-smoker";
    if (value === "active_smoker") return "Active Smoker";
    if (value === "former_smoker") return "Former Smoker";
    if (value === "passive_smoker") return "Passive Smoker";
    return String(value).replace(/_/g, " ");
  };

  const rp = client.latestRiskProfile;

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Client Summary</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  National Cancer Screening Register
                </div>

                <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                  {client.fullName}
                </h2>

                <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                  Complete client record with visit history, risk assessment,
                  screenings, and outcome tracking.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Clients</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{client.fullName}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Button
                  className="rounded-2xl h-11 w-full sm:w-auto text-green-800 border-white hover:bg-green-50"
                  onClick={startScreening}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    New Screening
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl h-11 w-full sm:w-auto border-white text-white hover:bg-white/10"
                  onClick={() => setShowRiskProfileModal(true)}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4" />
                    {hasRiskProfile ? "Edit Risk Profile" : "Add Risk Profile"}
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl h-11 w-full sm:w-auto border-white text-white hover:bg-white/10"
                  onClick={() => setShowOutcomeModal(true)}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    {client.outcome ? "Edit Outcome" : "Add Outcome"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guided-flow hint */}
      <div className="mb-8 rounded-2xl border border-green-100 dark:border-green-900 bg-green-50/60 dark:bg-green-900/20 px-4 py-3 flex items-start gap-3">
        <Stethoscope className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-800 dark:text-green-300">
          Use <span className="font-semibold">New Screening</span> to run a
          guided encounter — counselling, risk profile, the screening itself,
          and the outcome. A visit is created automatically; you don&apos;t add
          one separately.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5 mb-8">
        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <UserRound className="w-4 h-4" />
            Gender
          </div>
          <p className="mt-2 font-semibold text-gray-800 dark:text-gray-100 capitalize">
            {client.gender || "—"}
          </p>
          <div className="mt-3">
            <Badge
              type={client.screeningCategory === "new_client" ? "success" : "primary"}
            >
              {client.screeningCategory === "new_client"
                ? "New Client"
                : "Follow-up"}
            </Badge>
          </div>
        </div>

        <AgeCard dateOfBirth={client.dateOfBirth} variant="detailed" />

        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Phone className="w-4 h-4" />
            Phone
          </div>
          <p className="mt-2 font-semibold text-gray-800 dark:text-gray-100">
            {client.phoneNumber || "—"}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            Location
          </div>
          <p className="mt-2 font-semibold text-gray-800 dark:text-gray-100">
            {[client.lga, client.state].filter(Boolean).join(", ") || "—"}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <CalendarDays className="w-4 h-4" />
            Registered
          </div>
          <p className="mt-2 font-semibold text-gray-800 dark:text-gray-100">
            {client.registrationDate
              ? new Date(client.registrationDate).toLocaleDateString()
              : "—"}
          </p>
        </div>
      </div>

      {/* Risk Profile Section — aligned to real columns */}
      {hasRiskProfile && rp && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-600" />
              <SectionTitle>Risk Profile Assessment</SectionTitle>
              <Badge type={getRiskBadgeType(riskLevel) as any}>
                {getRiskLevelText(riskLevel)}
              </Badge>
            </div>
            <Button
              size="small"
              layout="outline"
              className="rounded-xl"
              onClick={() => setShowRiskProfileModal(true)}
            >
              Edit Risk Profile
            </Button>
          </div>

          <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Basic Health */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-green-600" />
                    Basic Health
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Weight:</span> {formatRiskValue(rp.weightKg)}{rp.weightKg ? " kg" : ""}</p>
                    <p><span className="text-gray-500">Height:</span> {formatRiskValue(rp.heightCm)}{rp.heightCm ? " cm" : ""}</p>
                    <p><span className="text-gray-500">BMI:</span> {formatRiskValue(rp.bmi)}</p>
                  </div>
                </div>

                {/* Smoking */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Cigarette className="w-4 h-4 text-orange-600" />
                    Smoking History
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Status:</span> {formatRiskValue(rp.smokingStatus)}</p>
                    {rp.cigarettesPerDay ? (
                      <p><span className="text-gray-500">Cigarettes/Day:</span> {rp.cigarettesPerDay}</p>
                    ) : null}
                    {rp.smokingDuration ? (
                      <p><span className="text-gray-500">Duration:</span> {rp.smokingDuration} years</p>
                    ) : null}
                  </div>
                </div>

                {/* Alcohol */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Wine className="w-4 h-4 text-purple-600" />
                    Alcohol History
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Frequency:</span> {formatRiskValue(rp.alcoholFrequency ?? rp.alcoholConsumption)}</p>
                    {rp.alcoholUnitsPerWeek ? (
                      <p><span className="text-gray-500">Units/Week:</span> {rp.alcoholUnitsPerWeek}</p>
                    ) : null}
                  </div>
                </div>

                {/* Infectious status */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-red-600" />
                    Infectious Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">HIV:</span> {formatRiskValue(rp.hivStatus)}</p>
                    <p><span className="text-gray-500">Hepatitis B:</span> {formatRiskValue(rp.hbvStatus)}</p>
                    <p><span className="text-gray-500">Hepatitis C:</span> {formatRiskValue(rp.hcvStatus)}</p>
                  </div>
                </div>

                {/* Family History */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Family History
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Family History of Cancer:</span> {formatRiskValue(rp.familyHistory)}</p>
                  </div>
                </div>

                {/* Comorbidities */}
                {Array.isArray(rp.comorbiditiesJson) && rp.comorbiditiesJson.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-600" />
                      Comorbidities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {rp.comorbiditiesJson.map((c: string, i: number) => (
                        <span
                          key={i}
                          className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Section */}
      {client.outcome && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              <SectionTitle>Case Outcome</SectionTitle>
            </div>
            <Button
              size="small"
              layout="outline"
              className="rounded-xl"
              onClick={() => setShowOutcomeModal(true)}
            >
              Edit Outcome
            </Button>
          </div>

          <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Screening Result
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Result:</span>
                      <Badge
                        type={client.outcome.screeningResult === "positive" ? "danger" : "success"}
                        className="ml-2"
                      >
                        {formatRiskValue(client.outcome.screeningResult)}
                      </Badge>
                    </p>
                    {client.outcome.screeningDate && (
                      <p><span className="text-gray-500">Date:</span> {new Date(client.outcome.screeningDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {client.outcome.screeningResult === "positive" &&
                  client.outcome.cancerType && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        Diagnosis
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Cancer Type:</span> {formatRiskValue(client.outcome.cancerType)}</p>
                        {client.outcome.cancerStage && (
                          <p><span className="text-gray-500">Stage:</span> {formatRiskValue(client.outcome.cancerStage)}</p>
                        )}
                        {client.outcome.diagnosisDate && (
                          <p><span className="text-gray-500">Diagnosis Date:</span> {new Date(client.outcome.diagnosisDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  )}

                {client.outcome.treatmentFacility && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      Referral / Treatment Centre
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>{client.outcome.treatmentFacility}</p>
                      {client.outcome.linkageToTreatment && (
                        <p><span className="text-gray-500">Linked:</span> {formatRiskValue(client.outcome.linkageToTreatment)}</p>
                      )}
                    </div>
                  </div>
                )}

                {(client.outcome.treatmentStatus || client.outcome.treatmentCommenced) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-600" />
                      Treatment
                    </h4>
                    <div className="space-y-2 text-sm">
                      {client.outcome.treatmentCommenced && (
                        <p><span className="text-gray-500">Commenced:</span> {formatRiskValue(client.outcome.treatmentCommenced)}</p>
                      )}
                      {client.outcome.treatmentStatus && (
                        <p><span className="text-gray-500">Status:</span> {formatRiskValue(client.outcome.treatmentStatus)}</p>
                      )}
                      {client.outcome.clinicalOutcome && (
                        <p><span className="text-gray-500">Clinical Outcome:</span> {formatRiskValue(client.outcome.clinicalOutcome)}</p>
                      )}
                    </div>
                  </div>
                )}

                {client.outcome.nextFollowUpDate && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-green-600" />
                      Follow-up
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Next Follow-up Date:</span> {new Date(client.outcome.nextFollowUpDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {client.outcome.remarks && (
                  <div className="md:col-span-2 lg:col-span-3 space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Remarks</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{client.outcome.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards Row */}
      <div className="grid gap-5 md:grid-cols-3 mb-8">
        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Total Visits</h3>
            <ClipboardList className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">{client.visits?.length || 0}</p>
        </div>

        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Screenings Done</h3>
            <Stethoscope className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">{completedModules}</p>
        </div>

        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Risk Assessment</h3>
            <ShieldCheck className="w-5 h-5 text-green-600" />
          </div>
          {hasRiskProfile ? (
            <div className="space-y-2">
              <Badge type={getRiskBadgeType(riskLevel) as any}>
                {getRiskLevelText(riskLevel)}
              </Badge>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Based on profile assessment
              </p>
            </div>
          ) : (
            <Badge type="warning">Not Assessed</Badge>
          )}
        </div>
      </div>

      {/* Visit History */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <SectionTitle>Visit History</SectionTitle>
          <Button
            size="small"
            className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
            onClick={startScreening}
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Screening
            </span>
          </Button>
        </div>

        <div className="grid gap-4">
          {client.visits && client.visits.length > 0 ? (
            client.visits.map((visit) => {
              const modulesCompleted = [
                visit.cervicalScreening,
                visit.breastScreening,
                visit.colorectalScreening,
                visit.liverScreening,
                visit.prostateScreening,
              ].filter(Boolean).length;

              return (
                <div
                  key={visit.visitId}
                  className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                          Visit #{visit.visitId}
                        </h4>
                        <Badge type="primary">
                          {visit.visitType === "follow_up" ? "Follow Up" : "Initial"}
                        </Badge>
                        <Badge type={modulesCompleted > 0 ? "success" : "neutral"}>
                          {modulesCompleted} module{modulesCompleted === 1 ? "" : "s"}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {visit.visitDate
                          ? new Date(visit.visitDate).toLocaleDateString()
                          : "—"}
                      </p>

                      {visit.notes && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {visit.notes}
                        </p>
                      )}

                      {modulesCompleted > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {visit.cervicalScreening && <Badge type="success">Cervical ✓</Badge>}
                          {visit.breastScreening && <Badge type="success">Breast ✓</Badge>}
                          {visit.prostateScreening && <Badge type="success">Prostate ✓</Badge>}
                          {visit.colorectalScreening && <Badge type="success">Colorectal ✓</Badge>}
                          {visit.liverScreening && <Badge type="success">Liver ✓</Badge>}
                        </div>
                      )}
                    </div>

                    <Button
                      size="small"
                      layout="outline"
                      className="rounded-xl w-full md:w-auto"
                      onClick={() => openVisitScreening(visit.visitId)}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <Stethoscope className="w-4 h-4" />
                        Manage Screenings
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
              <ClipboardList className="w-10 h-10 mx-auto text-gray-400" />
              <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                No visits recorded
              </h4>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Start a guided screening — the visit is created for you as part
                of the flow.
              </p>

              <div className="mt-5">
                <Button
                  className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                  onClick={startScreening}
                >
                  <span className="inline-flex items-center gap-2">
                    Start Screening
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modals (corrections only) */}
      <RiskProfileModal
        isOpen={showRiskProfileModal}
        onClose={() => setShowRiskProfileModal(false)}
        clientId={String(clientId)}
        existingProfile={client.latestRiskProfile}
        onComplete={() => {
          setShowRiskProfileModal(false);
          fetchClient();
        }}
      />

      <ScreeningModuleSelector
        isOpen={showScreeningModal}
        onClose={() => setShowScreeningModal(false)}
        visitId={selectedVisitId}
        clientGender={client.gender}
        onComplete={() => {
          setShowScreeningModal(false);
          fetchClient();
        }}
      />

      <OutcomeModal
        isOpen={showOutcomeModal}
        onClose={() => setShowOutcomeModal(false)}
        clientId={String(clientId)}
        existingOutcome={client.outcome}
        onComplete={() => {
          setShowOutcomeModal(false);
          fetchClient();
        }}
      />
    </Layout>
  );
}