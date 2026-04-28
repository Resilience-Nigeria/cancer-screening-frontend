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
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "example/containers/Layout";
import PageTitle from "example/components/Typography/PageTitle";
import SectionTitle from "example/components/Typography/SectionTitle";
import api from "../../../lib/api";

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

function formatCategory(value?: string | null) {
  if (!value) return "—";
  if (value === "new_client" || value === "newClient") return "New Client";
  if (value === "follow_up" || value === "followUp") return "Follow Up";
  return value;
}

function VisitStatusCard({ visit }: { visit: Visit }) {
  const completedModules = [
    visit.cervicalScreening,
    visit.breastScreening,
    visit.colorectalScreening,
    visit.liverScreening,
    visit.prostateScreening,
  ].filter(Boolean).length;

  return (
    <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Visit #{visit.visitId}
            </h4>
            <Badge type="primary">
              {visit.visitType === "follow_up" ? "Follow Up" : "Initial"}
            </Badge>
          </div>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {new Date(visit.visitDate).toLocaleDateString()}
          </p>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {visit.notes || "No notes added"}
          </p>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {completedModules} module{completedModules === 1 ? "" : "s"}{" "}
            completed
          </p>
        </div>

        <Link href={`/ncsr/visits?visitId=${visit.visitId}`} passHref>
          <Button tag="a" layout="outline" className="rounded-xl">
            Open Visit
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ClientProfilePage() {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchClient() {
    if (!clientId) return;

    setLoading(true);

    try {
      const { data } = await api.get(`/clients/${clientId}`);
      const rawClient = data?.client;

      const mappedClient: ClientDetail = {
        clientId: rawClient.clientId ?? rawClient.id,
        fullName: rawClient.fullName ?? rawClient.full_name ?? "",
        gender: rawClient.gender ?? "",
        phoneNumber: rawClient.phoneNumber ?? rawClient.phone_number ?? "",
        screeningCategory:
          rawClient.screeningCategory ?? rawClient.screening_category ?? "",
        state: rawClient.state ?? "",
        lga: rawClient.lga ?? "",
        residence: rawClient.residence ?? "",
        registrationDate:
          rawClient.registrationDate ?? rawClient.registration_date ?? "",
        latestRiskProfile:
          rawClient.latestRiskProfile ?? rawClient.latest_risk_profile ?? null,
        outcome: rawClient.outcome ?? null,
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  if (loading) {
    return (
      <Layout>
        <PageTitle>Client Profile</PageTitle>
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Loading client...
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <PageTitle>Client Profile</PageTitle>
        <div className="mt-6 text-sm text-red-600">Client not found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Client Profile</PageTitle>

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
                  Use this page as the main base for this client’s risk profile,
                  visits, and outcome tracking.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Clients</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{client.fullName}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/app/clients/${client.clientId}/visits/new`}
                  passHref
                >
                  <Button
                    tag="a"
                    className="rounded-2xl h-11 bg-white text-green-800 border-white hover:bg-green-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      New Visit
                    </span>
                  </Button>
                </Link>

                <Link
                  href={`/app/clients/${client.clientId}/risk-profile`}
                  passHref
                >
                  <Button
                    tag="a"
                    layout="outline"
                    className="rounded-2xl h-11 border-white text-white hover:bg-white/10"
                  >
                    Risk Profile
                  </Button>
                </Link>

                <Link href={`/app/clients/${client.clientId}/outcome`} passHref>
                  <Button
                    tag="a"
                    layout="outline"
                    className="rounded-2xl h-11 border-white text-white hover:bg-white/10"
                  >
                    Outcome
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <UserRound className="w-4 h-4" />
            Gender
          </div>
          <p className="mt-2 font-semibold text-gray-800 dark:text-gray-100 capitalize">
            {client.gender || "—"}
          </p>
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
            <Badge type={client.latestRiskProfile ? "success" : "warning"}>
              {client.latestRiskProfile
                ? "Risk Profile Added"
                : "Risk Profile Pending"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <SectionTitle>Visit History</SectionTitle>
        <p className="mt-1 mb-5 text-sm text-gray-600 dark:text-gray-400">
          Start a new visit from this page and continue documentation from the
          visit workspace.
        </p>

        <div className="grid gap-4">
          {client.visits && client.visits.length > 0 ? (
            client.visits.map((visit) => (
              <VisitStatusCard key={visit.visitId} visit={visit} />
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
              <ClipboardList className="w-10 h-10 mx-auto text-gray-400" />
              <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                No visits recorded
              </h4>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create the first visit for this client to begin screening
                documentation.
              </p>

              <div className="mt-5">
                <Link
                  href={`/app/clients/${client.clientId}/visits/new`}
                  passHref
                >
                  <Button
                    tag="a"
                    className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      New Visit
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
