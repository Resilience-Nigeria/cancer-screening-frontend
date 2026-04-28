import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Badge, Button, Modal, ModalHeader, ModalBody, ModalFooter } from "@roketid/windmill-react-ui";
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
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import SectionTitle from "../components/Typography/SectionTitle";
import NewVisitModal from "../components/modals/NewVisit";
import RiskProfileModal from "../components/modals/RiskProfile";
import ScreeningModuleSelector from "../components/modals/ScreeningModal";
// import OutcomeModal from "../components/modals/OutcomeModal";
import api from "../../lib/api";

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
  clientId: number;
  fullName: string;
  gender: string;
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

  async function fetchClient() {
    if (!clientId) return;

    setLoading(true);

    try {
      const { data } = await api.get(`/clients/${clientId}`);
      const rawClient = data?.client || data?.data;

      const riskProfiles = rawClient.risk_profiles || rawClient.riskProfiles || [];
      const latestRiskProfile = riskProfiles.length > 0 ? riskProfiles[0] : null;

      const mappedClient: ClientDetail = {
        clientId: rawClient.clientId ?? rawClient.id,
        fullName: rawClient.fullName ?? rawClient.full_name ?? "",
        gender: rawClient.gender ?? "",
        phoneNumber: rawClient.phoneNumber ?? rawClient.phone_number ?? "",
        screeningCategory: rawClient.screeningCategory ?? rawClient.screening_category ?? "",
        state: rawClient.state ?? "",
        lga: rawClient.lga ?? "",
        residence: rawClient.residence ?? "",
        registrationDate: rawClient.registrationDate ?? rawClient.registration_date ?? "",
        latestRiskProfile: latestRiskProfile,
        outcome: rawClient.outcome ?? null,
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
    fetchClient(); // Refresh data
  }

  function handleRiskProfileComplete() {
    setShowRiskProfileModal(false);
    fetchClient(); // Refresh data
  }

  function handleScreeningComplete() {
    setShowScreeningModal(false);
    fetchClient(); // Refresh data
  }

  function handleOutcomeComplete() {
    setShowOutcomeModal(false);
    fetchClient(); // Refresh data
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
                  Risk Profile
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl h-11 border-white text-white hover:bg-white/10"
                  onClick={() => setShowOutcomeModal(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Outcome
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-8">
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
          <div className="mt-3">
            <Badge type={hasRiskProfile ? "success" : "warning"}>
              {hasRiskProfile ? "Risk Profile Complete" : "Risk Profile Pending"}
            </Badge>
          </div>
        </div>
      </div>

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
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Outcome Status</h3>
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <Badge type={client.outcome ? "success" : "neutral"}>
            {client.outcome ? "Recorded" : "Not Recorded"}
          </Badge>
        </div>
      </div>

      {/* Visit History */}
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

                      {/* Show completed modules */}
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
        clientId={Number(clientId)}
        clientName={client.fullName}
        onVisitCreated={handleVisitCreated}
      />

      <RiskProfileModal
        isOpen={showRiskProfileModal}
        onClose={() => setShowRiskProfileModal(false)}
        clientId={Number(clientId)}
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

      {/* <OutcomeModal
        isOpen={showOutcomeModal}
        onClose={() => setShowOutcomeModal(false)}
        clientId={Number(clientId)}
        existingOutcome={client.outcome}
        onComplete={handleOutcomeComplete}
      /> */}
    </Layout>
  );
}