import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  X,
  Check,
  Heart,
  AlertTriangle,
  Droplets,
  Wind,
  Syringe,
  Users,
  Scale,
  Ruler,
  HeartPulse,
  Wine,
  Cigarette,
  FlaskConical,
  Bone,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import SectionTitle from "../components/Typography/SectionTitle";
import NewVisitModal from "../components/modals/NewVisit";
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
 * Calculate risk level based on risk profile data
 * Returns: 'high' | 'medium' | 'low' | 'unknown'
 */
function calculateRiskLevel(riskProfile: any): 'high' | 'medium' | 'low' | 'unknown' {
  if (!riskProfile) return 'unknown';
  
  let riskScore = 0;
  
  // Smoking (High risk factor for multiple cancers)
  if (riskProfile.smokingStatus === 'active_smoker') {
    riskScore += 3;
    // Heavy smoker gets additional points
    if (riskProfile.cigarettesPerDay && riskProfile.cigarettesPerDay > 10) {
      riskScore += 2;
    }
    // Long-term smoker gets additional points
    if (riskProfile.smokingDurationYears && riskProfile.smokingDurationYears > 10) {
      riskScore += 2;
    }
  } else if (riskProfile.smokingStatus === 'former_smoker') {
    riskScore += 1;
  } else if (riskProfile.smokingStatus === 'passive_smoker') {
    riskScore += 1;
  }
  
  // Alcohol consumption
  if (riskProfile.alcoholFrequency === 'daily' || riskProfile.alcoholFrequency === 'several_times_per_week') {
    riskScore += 2;
    // Heavy drinking gets additional points
    if (riskProfile.alcoholUnitsPerWeek && riskProfile.alcoholUnitsPerWeek > 14) {
      riskScore += 2;
    }
  } else if (riskProfile.alcoholFrequency === 'weekly' || riskProfile.alcoholFrequency === 'monthly') {
    riskScore += 1;
  }
  
  // HIV Status (associated with certain cancers)
  if (riskProfile.hivStatus === 'positive') {
    riskScore += 2;
  }
  
  // Family history of cancer (strong risk factor)
  if (riskProfile.familyHistoryOfCancer === 'yes') {
    riskScore += 3;
    // Multiple cancer types in family increases risk
    if (riskProfile.cancerTypes && riskProfile.cancerTypes.length > 1) {
      riskScore += 1;
    }
  }
  
  // Diabetes
  if (riskProfile.diabetes === 'yes') {
    riskScore += 1;
  }
  
  // Hypertension
  if (riskProfile.hypertension === 'yes') {
    riskScore += 1;
  }
  
  // BMI assessment (obesity is a risk factor)
  if (riskProfile.bmi) {
    const bmi = parseFloat(riskProfile.bmi);
    if (bmi >= 30) { // Obese
      riskScore += 2;
    } else if (bmi >= 25) { // Overweight
      riskScore += 1;
    }
  }
  
  // Categorize based on total score
  if (riskScore >= 8) {
    return 'high';
  } else if (riskScore >= 4) {
    return 'medium';
  } else if (riskScore > 0) {
    return 'low';
  }
  
  return 'low'; // Default to low if no risk factors identified
}

/**
 * Get badge type for risk level
 */
function getRiskBadgeType(riskLevel: 'high' | 'medium' | 'low' | 'unknown'): string {
  switch (riskLevel) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'neutral';
  }
}

/**
 * Get display text for risk level
 */
function getRiskLevelText(riskLevel: 'high' | 'medium' | 'low' | 'unknown'): string {
  switch (riskLevel) {
    case 'high':
      return 'High Risk';
    case 'medium':
      return 'Medium Risk';
    case 'low':
      return 'Low Risk';
    default:
      return 'Not Assessed';
  }
}

export default function ClientSummaryPage() {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRiskProfile, setHasRiskProfile] = useState(false);
  
  // Modal states
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [showRiskProfileModal, setShowRiskProfileModal] = useState(false);
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

  // Calculate risk level
  const riskLevel = client?.latestRiskProfile 
    ? calculateRiskLevel(client.latestRiskProfile)
    : 'unknown';

  async function fetchClient() {
    if (!clientId) return;

    setLoading(true);

    try {
      const { data } = await api.get(`/clients/${clientId}`);
      const rawClient = data?.client || data?.data;

      const riskProfiles = rawClient.risk_profiles || rawClient.riskProfiles || [];
      const latestRiskProfile = riskProfiles.length > 0 ? riskProfiles[0] : null;

      // Fetch outcome separately if not included
      let outcome = rawClient.outcome;
      if (!outcome) {
        try {
          const outcomeRes = await api.get(`/clients/${clientId}/outcome`);
          outcome = outcomeRes?.data?.data;
        } catch (err) {
          // No outcome found
        }
      }

      const mappedClient: ClientDetail = {
        id: rawClient.id,
        clientId: rawClient.clientId ?? rawClient.id,
        fullName: rawClient.fullName ?? rawClient.full_name ?? "",
        gender: rawClient.gender ?? "",
        dateOfBirth: rawClient.dateOfBirth ?? "",
        phoneNumber: rawClient.phoneNumber ?? rawClient.phone_number ?? "",
        screeningCategory: rawClient.screeningCategory ?? rawClient.screening_category ?? "",
        state: rawClient.state ?? "",
        lga: rawClient.lga ?? "",
        residence: rawClient.residence ?? "",
        registrationDate: rawClient.registrationDate ?? rawClient.registration_date ?? "",
        latestRiskProfile: latestRiskProfile,
        outcome: outcome,
        visits: (rawClient.visits || []).map((visit: any) => ({
          visitId: visit.visitId ?? visit.id,
          visitDate: visit.visitDate ?? visit.visit_date,
          visitType: visit.visitType ?? visit.visit_type,
          notes: visit.notes,
          cervicalScreening: visit.cervicalScreening ?? visit.cervical_screening ?? null,
          breastScreening: visit.breastScreening ?? visit.breast_screening ?? null,
          colorectalScreening: visit.colorectalScreening ?? visit.colorectal_screening ?? null,
          liverScreening: visit.liverScreening ?? visit.liver_screening ?? null,
          prostateScreening: visit.prostateScreening ?? visit.prostate_screening ?? null,
        })),
      };

      setClient(mappedClient);

      if (latestRiskProfile && (latestRiskProfile.riskProfileId || latestRiskProfile.risk_profile_id)) {
        setHasRiskProfile(true);
      } else {
        setHasRiskProfile(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  function handleNewVisit() {
    setShowNewVisitModal(true);
  }

  function handleVisitCreated(visitId: number) {
    setShowNewVisitModal(false);
    setSelectedVisitId(visitId);
    setShowScreeningModal(true);
    fetchClient();
  }

  function handleRiskProfileComplete() {
    setShowRiskProfileModal(false);
    fetchClient();
  }

  function handleScreeningComplete() {
    setShowScreeningModal(false);
    fetchClient();
  }

  function handleOutcomeComplete() {
    setShowOutcomeModal(false);
    fetchClient();
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

  const completedModules = client.visits?.reduce((total, visit) => {
    return total + [
      visit.cervicalScreening,
      visit.breastScreening,
      visit.colorectalScreening,
      visit.liverScreening,
      visit.prostateScreening,
    ].filter(Boolean).length;
  }, 0) || 0;

  // Helper function to format risk profile display
  const formatRiskValue = (value: any) => {
    if (!value || value === "") return "Not provided";
    if (value === "yes") return "Yes";
    if (value === "no") return "No";
    if (value === "non_smoker") return "Non-smoker";
    if (value === "active_smoker") return "Active Smoker";
    if (value === "former_smoker") return "Former Smoker";
    if (value === "passive_smoker") return "Passive Smoker";
    return value;
  };

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
                  Complete client record with visit history, risk assessment, screenings, and outcome tracking.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Clients</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{client.fullName}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button 
                  className="rounded-2xl h-11 text-green-800 border-white hover:bg-green-50"
                  onClick={handleNewVisit}
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Visit
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl h-11 border-white text-white hover:bg-white/10"
                  onClick={() => setShowRiskProfileModal(true)}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  {hasRiskProfile ? "Edit Risk Profile" : "Add Risk Profile"}
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl h-11 border-white text-white hover:bg-white/10"
                  onClick={() => setShowOutcomeModal(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {client.outcome ? "Edit Outcome" : "Add Outcome"}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
            <Badge type={client.screeningCategory === "new_client" ? "success" : "primary"}>
              {client.screeningCategory === "new_client" ? "New Client" : "Follow-up"}
            </Badge>
          </div>
        </div>

         {/* Detailed Age Card */}
          <AgeCard
            dateOfBirth={client.dateOfBirth}
            variant="detailed"
          />

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

      {/* Risk Profile Section - Add Risk Level Badge */}
      {hasRiskProfile && client.latestRiskProfile && (
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

          {/* Rest of Risk Profile section remains the same */}
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
                    <p><span className="text-gray-500">Weight:</span> {formatRiskValue(client.latestRiskProfile.weight)} kg</p>
                    <p><span className="text-gray-500">Height:</span> {formatRiskValue(client.latestRiskProfile.height)} cm</p>
                    <p><span className="text-gray-500">BMI:</span> {formatRiskValue(client.latestRiskProfile.bmi)}</p>
                    <p><span className="text-gray-500">Blood Pressure:</span> {formatRiskValue(client.latestRiskProfile.bloodPressure)}</p>
                    <p><span className="text-gray-500">Diabetes:</span> {formatRiskValue(client.latestRiskProfile.diabetes)}</p>
                    <p><span className="text-gray-500">Hypertension:</span> {formatRiskValue(client.latestRiskProfile.hypertension)}</p>
                  </div>
                </div>

                {/* Smoking */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Cigarette className="w-4 h-4 text-orange-600" />
                    Smoking History
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Status:</span> {formatRiskValue(client.latestRiskProfile.smokingStatus)}</p>
                    {client.latestRiskProfile.cigarettesPerDay && (
                      <p><span className="text-gray-500">Cigarettes/Day:</span> {client.latestRiskProfile.cigarettesPerDay}</p>
                    )}
                    {client.latestRiskProfile.smokingDurationYears && (
                      <p><span className="text-gray-500">Duration:</span> {client.latestRiskProfile.smokingDurationYears} years</p>
                    )}
                  </div>
                </div>

                {/* Alcohol */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Wine className="w-4 h-4 text-purple-600" />
                    Alcohol History
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Frequency:</span> {formatRiskValue(client.latestRiskProfile.alcoholFrequency)}</p>
                    {client.latestRiskProfile.alcoholUnitsPerWeek && (
                      <p><span className="text-gray-500">Units/Week:</span> {client.latestRiskProfile.alcoholUnitsPerWeek}</p>
                    )}
                  </div>
                </div>

                {/* HIV Status */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-red-600" />
                    HIV Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>{formatRiskValue(client.latestRiskProfile.hivStatus)}</p>
                  </div>
                </div>

                {/* Family History */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Family History
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Family History of Cancer:</span> {formatRiskValue(client.latestRiskProfile.familyHistoryOfCancer)}</p>
                    {client.latestRiskProfile.cancerTypes?.length > 0 && (
                      <p><span className="text-gray-500">Cancer Types:</span> {client.latestRiskProfile.cancerTypes.join(", ")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Section - Remains the same */}
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
                {/* Screening Result */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Screening Result
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Result:</span> 
                      <Badge type={client.outcome.screeningResult === "positive" ? "danger" : "success"} className="ml-2">
                        {formatRiskValue(client.outcome.screeningResult)}
                      </Badge>
                    </p>
                    {client.outcome.screeningDate && (
                      <p><span className="text-gray-500">Date:</span> {new Date(client.outcome.screeningDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {/* Diagnosis (if positive) */}
                {client.outcome.screeningResult === "positive" && client.outcome.cancerType && (
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

                {/* Treatment Status */}
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

                {/* Follow-up */}
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

                {/* Remarks */}
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

      {/* Summary Cards Row - Updated Risk Assessment Card */}
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

      {/* Visit History - Remains the same */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <SectionTitle>Visit History</SectionTitle>
          <Button
            size="small"
            className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800"
            onClick={handleNewVisit}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Visit
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
                <div key={visit.visitId} className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
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
                        {new Date(visit.visitDate).toLocaleDateString()}
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
                      className="rounded-xl"
                      onClick={() => openVisitScreening(visit.visitId)}
                    >
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Add/View Screenings
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
                Create the first visit for this client to begin screening documentation.
              </p>

              <div className="mt-5">
                <Button
                  className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                  onClick={handleNewVisit}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Visit
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewVisitModal
        isOpen={showNewVisitModal}
        onClose={() => setShowNewVisitModal(false)}
        clientId={String(clientId)}
        clientName={client.fullName}
        onVisitCreated={handleVisitCreated}
      />

      <RiskProfileModal
        isOpen={showRiskProfileModal}
        onClose={() => setShowRiskProfileModal(false)}
        clientId={String(clientId)}
        existingProfile={client.latestRiskProfile}
        onComplete={handleRiskProfileComplete}
      />

      <ScreeningModuleSelector
        isOpen={showScreeningModal}
        onClose={() => setShowScreeningModal(false)}
        visitId={selectedVisitId}
        clientGender={client.gender}
        onComplete={handleScreeningComplete}
      />

      <OutcomeModal
        isOpen={showOutcomeModal}
        onClose={() => setShowOutcomeModal(false)}
        clientId={String(clientId)}
        existingOutcome={client.outcome}
        onComplete={handleOutcomeComplete}
      />
    </Layout>
  );
}