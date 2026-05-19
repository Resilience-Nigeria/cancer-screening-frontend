import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Button,
  Badge,
} from "@roketid/windmill-react-ui";
import {
  ChevronLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  Loader2,
  Activity,
  Heart,
  Stethoscope,
  Shield,
  TestTube,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import SectionTitle from "../components/Typography/SectionTitle";
import CervicalScreeningModal from "../components/modals/screening/CervicalModal";
import BreastScreeningModal from "../components/modals/screening/BreastModal";
import ProstateScreeningModal from "../components/modals/screening/ProstateModal";
import ColorectalScreeningModal from "../components/modals/screening/ColorectalModal";
import LiverScreeningModal from "../components/modals/screening/LiverModal";
import OutcomeModal from "../components/modals/Outcome";
import api from "../../lib/api";

type Client = {
  clientId: string | number;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  address?: string;
  landmark?: string;
  stateOfResidence?: string;
  lgaOfResidence?: string;
};

type Visit = {
  visitId: number;
  visitDate: string;
  visitType: string;
  notes?: string;
  client?: Client;
  cervicalScreening?: any;
  breastScreening?: any;
  colorectalScreening?: any;
  liverScreening?: any;
  prostateScreening?: any;
  riskProfile?: any;
  outcome?: any;
};

function formatVisitType(value?: string) {
  if (!value) return "—";
  if (value === "follow_up" || value === "followUp") return "Follow Up";
  if (value === "initial") return "Initial";
  return value;
}

function getVisitTypeBadge(value?: string) {
  if (value === "initial") return "success";
  if (value === "follow_up" || value === "followUp") return "warning";
  return "primary";
}

export default function VisitDetailsPage() {
  const router = useRouter();
  const { visitId } = router.query;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Individual modal states
  const [cervicalModalOpen, setCervicalModalOpen] = useState(false);
  const [breastModalOpen, setBreastModalOpen] = useState(false);
  const [prostateModalOpen, setProstateModalOpen] = useState(false);
  const [colorectalModalOpen, setColorectalModalOpen] = useState(false);
  const [liverModalOpen, setLiverModalOpen] = useState(false);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);

  async function fetchVisitDetails() {
    if (!visitId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(`/visits/${visitId}`);
      const rawVisit = data?.visit || data?.data;

      const mappedVisit: Visit = {
        visitId: rawVisit.visitId ?? rawVisit.id,
        visitDate: rawVisit.visitDate ?? rawVisit.visit_date ?? "",
        visitType: rawVisit.visitType ?? rawVisit.visit_type ?? "",
        notes: rawVisit.notes ?? "",
        client: rawVisit.client
          ? {
              clientId: rawVisit.client.clientId ?? rawVisit.client.id,
              fullName: rawVisit.client.fullName ?? rawVisit.client.full_name ?? "",
              dateOfBirth: rawVisit.client.dateOfBirth ?? rawVisit.client.date_of_birth,
              gender: rawVisit.client.gender,
              phoneNumber: rawVisit.client.phoneNumber ?? rawVisit.client.phone_number,
              address: rawVisit.client.address,
              landmark: rawVisit.client.landmark,
              stateOfResidence: rawVisit.client.stateOfResidence ?? rawVisit.client.state_of_residence,
              lgaOfResidence: rawVisit.client.lgaOfResidence ?? rawVisit.client.lga_of_residence,
            }
          : undefined,
        cervicalScreening: rawVisit.cervicalScreening ?? rawVisit.cervical_screening,
        breastScreening: rawVisit.breastScreening ?? rawVisit.breast_screening,
        colorectalScreening: rawVisit.colorectalScreening ?? rawVisit.colorectal_screening,
        liverScreening: rawVisit.liverScreening ?? rawVisit.liver_screening,
        prostateScreening: rawVisit.prostateScreening ?? rawVisit.prostate_screening,
        riskProfile: rawVisit.riskProfile ?? rawVisit.risk_profile,
        outcome: rawVisit.outcome ?? rawVisit.case_outcome,
      };

      setVisit(mappedVisit);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load visit details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVisitDetails();
  }, [visitId]);

  function openModal(type: string) {
    switch (type) {
      case "cervical":
        setCervicalModalOpen(true);
        break;
      case "breast":
        setBreastModalOpen(true);
        break;
      case "prostate":
        setProstateModalOpen(true);
        break;
      case "colorectal":
        setColorectalModalOpen(true);
        break;
      case "liver":
        setLiverModalOpen(true);
        break;
      case "outcome":
        setOutcomeModalOpen(true);
        break;
    }
  }

  function handleModalComplete() {
    fetchVisitDetails(); // Refresh visit data
  }

  if (loading) {
    return (
      <Layout>
        <PageTitle>Visit Details</PageTitle>
        <div className="mt-6 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Loading visit details...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!visit) {
    return (
      <Layout>
        <PageTitle>Visit Details</PageTitle>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          Visit not found. Please ensure you have accessed this page from a valid visit record.
        </div>
      </Layout>
    );
  }

  const screeningModules = [
    // Cervical - Females only
    ...(visit.client?.gender === "female"
      ? [
          {
            name: "Cervical Screening",
            icon: TestTube,
            data: visit.cervicalScreening,
            color: "purple",
            moduleType: "cervical",
          },
        ]
      : []),
    
    // Breast - Both genders
    {
      name: "Breast Screening",
      icon: Heart,
      data: visit.breastScreening,
      color: "pink",
      moduleType: "breast",
    },
    
    // Prostate - Males only
    ...(visit.client?.gender === "male"
      ? [
          {
            name: "Prostate Screening",
            icon: Shield,
            data: visit.prostateScreening,
            color: "blue",
            moduleType: "prostate",
          },
        ]
      : []),
    
    // Colorectal - Both genders
    {
      name: "Colorectal Screening",
      icon: Activity,
      data: visit.colorectalScreening,
      color: "orange",
      moduleType: "colorectal",
    },
    
    // Liver - Both genders
    {
      name: "Liver Screening",
      icon: Stethoscope,
      data: visit.liverScreening,
      color: "emerald",
      moduleType: "liver",
    },
  ];

  const completedModules = screeningModules.filter((m) => m.data).length;

  return (
    <Layout>
      <div className="mb-8">
        <div className="mb-4">
          <Link href="/ncsr/visits">
            <Button layout="link" className="text-green-600 hover:text-green-700">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Visits
            </Button>
          </Link>
        </div>

        <PageTitle>Visit Details</PageTitle>

        {/* Visit Header Card */}
        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  Visit #{visit.visitId}
                </div>

                <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                  {visit.client?.fullName || "Unknown Client"}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(visit.visitDate).toLocaleDateString()}</span>
                  </div>
                  <Badge type={getVisitTypeBadge(visit.visitType) as any}>
                    {formatVisitType(visit.visitType)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {completedModules} of {screeningModules.length} modules completed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Client Info & Notes */}
        <div className="space-y-6">
          {/* Client Information */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Client Information</SectionTitle>
            </div>

            <div className="px-5 py-6 sm:px-6 space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {visit.client?.fullName || "—"}
                  </p>
                </div>
              </div>

              {visit.client?.dateOfBirth && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Date of Birth</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {new Date(visit.client.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {visit.client?.gender && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize">
                      {visit.client.gender}
                    </p>
                  </div>
                </div>
              )}

              {visit.client?.phoneNumber && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {visit.client.phoneNumber}
                    </p>
                  </div>
                </div>
              )}

              {visit.client?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {visit.client.address}
                    </p>
                    {visit.client.landmark && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Landmark: {visit.client.landmark}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(visit.client?.stateOfResidence || visit.client?.lgaOfResidence) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {visit.client.lgaOfResidence && `${visit.client.lgaOfResidence}, `}
                      {visit.client.stateOfResidence || "—"}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link href={`/ncsr/client-details?clientId=${visit.client?.clientId}`}>
                  <Button
                    layout="outline"
                    className="w-full rounded-2xl"
                  >
                    View Full Client Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Visit Notes */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Visit Notes</SectionTitle>
            </div>

            <div className="px-5 py-6 sm:px-6">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {visit.notes || "No notes added for this visit."}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Profile */}
          {visit.riskProfile && (
            <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-orange-50/70 dark:bg-orange-900/20">
                <SectionTitle>Risk Profile</SectionTitle>
              </div>

              <div className="px-5 py-6 sm:px-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Assessment Completed
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <Link href={`/ncsr/client-details?clientId=${visit.client?.clientId}#risk-profile`}>
                  <Button layout="outline" className="w-full rounded-2xl">
                    View Risk Profile
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Screening Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Screening Modules Grid */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
              <SectionTitle>Screening Modules</SectionTitle>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {screeningModules.map((module) => {
                  const Icon = module.icon;
                  const isCompleted = !!module.data;

                  return (
                    <div
                      key={module.name}
                      className={`rounded-2xl border-2 p-5 transition ${
                        isCompleted
                          ? `border-${module.color}-200 dark:border-${module.color}-800 bg-${module.color}-50/50 dark:bg-${module.color}-900/10`
                          : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                            isCompleted
                              ? `bg-${module.color}-100 dark:bg-${module.color}-900/30`
                              : "bg-gray-100 dark:bg-gray-700"
                          }`}
                        >
                          <Icon
                            className={`w-6 h-6 ${
                              isCompleted
                                ? `text-${module.color}-600 dark:text-${module.color}-400`
                                : "text-gray-400"
                            }`}
                          />
                        </div>

                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                        )}
                      </div>

                      <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        {module.name}
                      </h4>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                        {isCompleted ? "Screening completed" : "Not completed"}
                      </p>

                      <Button
                        layout={isCompleted ? "outline" : "primary"}
                        className="w-full rounded-xl"
                        onClick={() => openModal(module.moduleType)}
                      >
                        <span className="inline-flex items-center gap-2">
                          {isCompleted ? (
                            <>
                              <Edit className="w-4 h-4" />
                              View/Edit
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Complete
                            </>
                          )}
                        </span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Case Outcome */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-teal-50/70 dark:bg-teal-900/20">
              <SectionTitle>Case Outcome</SectionTitle>
            </div>

            <div className="px-5 py-6 sm:px-6">
              {visit.outcome ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Outcome Recorded
                    </span>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>

                  {visit.outcome.screeningResult && (
                    <div className="mb-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Screening Result
                      </p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize">
                        {visit.outcome.screeningResult.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}

                  <Button 
                    layout="outline" 
                    className="w-full rounded-2xl"
                    onClick={() => openModal("outcome")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      View/Edit Outcome
                    </span>
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      No outcome recorded yet
                    </span>
                  </div>

                  <Button 
                    className="w-full rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                    onClick={() => openModal("outcome")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Record Outcome
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Individual Screening Modals */}
      {visitId && (
        <>
          {/* Cervical - Females only */}
          {visit?.client?.gender === "female" && (
            <CervicalScreeningModal
              isOpen={cervicalModalOpen}
              onClose={() => setCervicalModalOpen(false)}
              visitId={visitId}
              onComplete={handleModalComplete}
            />
          )}

          {/* Breast - Both genders */}
          <BreastScreeningModal
            isOpen={breastModalOpen}
            onClose={() => setBreastModalOpen(false)}
            visitId={visitId}
            onComplete={handleModalComplete}
          />

          {/* Prostate - Males only */}
          {visit?.client?.gender === "male" && (
            <ProstateScreeningModal
              isOpen={prostateModalOpen}
              onClose={() => setProstateModalOpen(false)}
              visitId={visitId}
              onComplete={handleModalComplete}
            />
          )}

          {/* Colorectal - Both genders */}
          <ColorectalScreeningModal
            isOpen={colorectalModalOpen}
            onClose={() => setColorectalModalOpen(false)}
            visitId={visitId}
            onComplete={handleModalComplete}
          />

          {/* Liver - Both genders */}
          <LiverScreeningModal
            isOpen={liverModalOpen}
            onClose={() => setLiverModalOpen(false)}
            visitId={visitId}
            onComplete={handleModalComplete}
          />

          {/* Outcome Modal */}
          <OutcomeModal
            isOpen={outcomeModalOpen}
            onClose={() => setOutcomeModalOpen(false)}
            visitId={visitId}
            clientId={visit?.client?.clientId}
            onComplete={handleModalComplete}
          />
        </>
      )}
    </Layout>
  );
}