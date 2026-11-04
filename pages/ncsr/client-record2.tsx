import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User,
  MapPin,
  Users,
  HeartPulse,
  Stethoscope,
  ClipboardCheck,
  AlertTriangle,
  CalendarDays,
  Building2,
} from "lucide-react";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { cancerLabel } from "../../lib/screeningWizardConfig";

// ---------------------------------------------------------------------------
// Small display primitives
// ---------------------------------------------------------------------------
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-green-700 dark:text-green-400">{icon}</div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const isEmpty = value === undefined || value === null || value === "" || value === "—";
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-sm font-medium ${isEmpty ? "text-gray-300 dark:text-gray-600" : "text-gray-800 dark:text-gray-100"}`}>
        {isEmpty ? "—" : value}
      </p>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{children}</div>;
}

function fmt(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function fmtDate(v: any): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return String(v);
  }
}

function capitalize(v: any): string {
  const s = fmt(v);
  if (s === "—") return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

const OUTCOME_TONE: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  low_suspicion: "bg-amber-100 text-amber-800",
  suspicious: "bg-orange-100 text-orange-800",
  urgent_referral: "bg-red-100 text-red-800",
};

const RESULT_TONE: Record<string, string> = {
  negative: "bg-green-100 text-green-800",
  non_suspicious: "bg-green-100 text-green-800",
  positive: "bg-red-100 text-red-800",
  suspicious: "bg-orange-100 text-orange-800",
};

function Pill({ label, tone }: { label: string; tone?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tone || "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Per-cancer-type screening summary — shows whatever fields are present,
// generically, without needing a bespoke layout for each of the 5 types.
// ---------------------------------------------------------------------------
const SCREENING_KEYS: { type: string; relation: string }[] = [
  { type: "breast", relation: "breastScreening" },
  { type: "cervical", relation: "cervicalScreening" },
  { type: "prostate", relation: "prostateScreening" },
  { type: "colorectal", relation: "colorectalScreening" },
  { type: "liver", relation: "liverScreening" },
];

const SCREENING_LABEL_OVERRIDES: Record<string, string> = {
  screeningDate: "Screening Date",
  screeningResult: "Result",
  method: "Method",
  biradsScore: "BI-RADS Score",
  leftBiradsScore: "Left BI-RADS",
  rightBiradsScore: "Right BI-RADS",
  breastDensity: "Breast Density",
  leftBreastDensity: "Left Density",
  rightBreastDensity: "Right Density",
  leftCbeFinding: "Left CBE Finding",
  rightCbeFinding: "Right CBE Finding",
  leftImagingFinding: "Left Imaging Finding",
  rightImagingFinding: "Right Imaging Finding",
  biopsyDone: "Biopsy Done",
  biopsyResult: "Biopsy Result",
  histologyResult: "Histology Result",
  ihcRequested: "IHC Requested",
  ihcResult: "IHC Result",
  biopsyBookingDate: "Biopsy Booking Date",
  biopsyBookingNotes: "Biopsy Notes",
};

const SCREENING_SKIP_KEYS = new Set([
  "id", "visitId", "clientId", "created_at", "updated_at",
  "biopsyBookingFacilityId",
]);

function ScreeningRecordCard({ type, record }: { type: string; record: any }) {
  const entries = Object.entries(record).filter(
    ([k, v]) => !SCREENING_SKIP_KEYS.has(k) && v !== null && v !== undefined && v !== ""
  );

  if (entries.length === 0) return null;

  const result = record.screeningResult as string | undefined;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
          {cancerLabel(type as any)}
        </p>
        {result && <Pill label={capitalize(result)} tone={RESULT_TONE[result]} />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {entries.map(([k, v]) => (
          <Field
            key={k}
            label={SCREENING_LABEL_OVERRIDES[k] || capitalize(k)}
            value={typeof v === "boolean" ? fmt(v) : k.toLowerCase().includes("date") ? fmtDate(v) : String(v)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ClientRecordPage() {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/clients/${clientId}`);
        setClient(data?.client || data?.data || null);
      } catch {
        setClient(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <p className="text-sm text-gray-500">Client not found.</p>
      </Layout>
    );
  }

  const riskProfile =
    (client.risk_profiles && client.risk_profiles[0]) ||
    (client.riskProfiles && client.riskProfiles[0]) ||
    client.latestRiskProfile ||
    null;

  const visits: any[] = client.visits || [];
  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  );

  return (
    <Layout>
      <div className="mb-6">
        <Link
          href="/ncsr/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <PageTitle>{client.fullName}</PageTitle>
            <p className="text-sm text-gray-500 mt-1">
              {client.clientId} · {capitalize(client.gender)}
              {client.age ? ` · ${client.age} yrs` : ""}
            </p>
          </div>
          {client.facility?.facilityName && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Building2 className="w-4 h-4" /> {client.facility.facilityName}
            </span>
          )}
        </div>
      </div>

      {/* Biodata & Contact */}
      <Card title="Biodata & Contact" icon={<User className="w-5 h-5" />}>
        <FieldGrid>
          <Field label="Full Name" value={client.fullName} />
          <Field label="Sex" value={capitalize(client.gender)} />
          <Field label="Date of Birth" value={fmtDate(client.dateOfBirth)} />
          <Field label="Age" value={client.age ? `${client.age} yrs` : "—"} />
          <Field label="Phone Number" value={client.phoneNumber} />
          <Field label="Email" value={client.email} />
          <Field label="Occupation" value={client.occupation} />
          <Field label="NIN" value={client.nin} />
          <Field label="Registration Date" value={fmtDate(client.registrationDate)} />
          <Field label="Screening Category" value={capitalize(client.screeningCategory)} />
        </FieldGrid>
      </Card>

      {/* Address */}
      <Card title="Address & Location" icon={<MapPin className="w-5 h-5" />}>
        <FieldGrid>
          <Field label="Address" value={client.address} />
          <Field label="Landmark" value={client.landmark} />
          <Field label="State of Residence" value={client.stateOfResidence} />
          <Field label="LGA of Residence" value={client.lgaOfResidence} />
          <Field label="State of Origin" value={client.stateOfOrigin} />
          <Field label="LGA of Origin" value={client.lgaOfOrigin} />
        </FieldGrid>
      </Card>

      {/* Next of Kin */}
      <Card title="Next of Kin" icon={<Users className="w-5 h-5" />}>
        <FieldGrid>
          <Field label="Name" value={client.nextOfKinName} />
          <Field label="Phone" value={client.nextOfKinPhone} />
          <Field label="Relationship" value={client.nextOfKinRelationship} />
        </FieldGrid>
      </Card>

      {/* Risk Profile */}
      <Card title="Risk Profile & Medical History" icon={<HeartPulse className="w-5 h-5" />}>
        {!riskProfile ? (
          <p className="text-sm text-gray-400">No risk profile on file yet.</p>
        ) : (
          <div className="space-y-5">
            <FieldGrid>
              <Field label="Family History of Cancer" value={capitalize(riskProfile.familyHistory)} />
              <Field label="Smoking Status" value={capitalize(riskProfile.smokingStatus)} />
              <Field label="Alcohol Consumption" value={capitalize(riskProfile.alcoholConsumption)} />
              <Field label="Weight" value={riskProfile.weightKg ? `${riskProfile.weightKg} kg` : "—"} />
              <Field label="Height" value={riskProfile.heightCm ? `${riskProfile.heightCm} cm` : "—"} />
              <Field label="BMI" value={riskProfile.bmi} />
              <Field label="HIV Status" value={capitalize(riskProfile.hivStatus)} />
              <Field label="Hepatitis B Status" value={capitalize(riskProfile.hbvStatus)} />
              <Field label="Hepatitis C Status" value={capitalize(riskProfile.hcvStatus)} />
              <Field
                label="Comorbidities"
                value={
                  Array.isArray(riskProfile.comorbiditiesJson) && riskProfile.comorbiditiesJson.length > 0
                    ? riskProfile.comorbiditiesJson.join(", ")
                    : "—"
                }
              />
            </FieldGrid>

            {(riskProfile.ageAtFirstMenstruation || riskProfile.ageAtMenopause || riskProfile.breastfeedingHistory || riskProfile.previousBreastSurgery) && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Women's / Breast Health</p>
                <FieldGrid>
                  <Field label="Age at First Menstruation" value={riskProfile.ageAtFirstMenstruation} />
                  <Field label="Age at Menopause" value={riskProfile.ageAtMenopause} />
                  <Field label="Breastfeeding History" value={capitalize(riskProfile.breastfeedingHistory)} />
                  <Field label="Breastfeeding Duration" value={riskProfile.breastfeedingDuration ? `${riskProfile.breastfeedingDuration} months` : "—"} />
                  <Field label="Previous Breast Surgery" value={capitalize(riskProfile.previousBreastSurgery)} />
                </FieldGrid>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Medical History — Confirmed</p>
              <FieldGrid>
                <Field label="Previous Cancer" value={capitalize(riskProfile.previousCancer)} />
                <Field label="Previous Cancer Details" value={riskProfile.previousCancerDetails} />
                <Field label="Previous Surgeries" value={capitalize(riskProfile.previousSurgeries)} />
                <Field label="Previous Surgeries Details" value={riskProfile.previousSurgeriesDetails} />
                <Field label="Previous Screening" value={capitalize(riskProfile.previousScreening)} />
                <Field label="Previous Screening Details" value={riskProfile.previousScreeningDetails} />
              </FieldGrid>
            </div>
          </div>
        )}
      </Card>

      {/* Visit History */}
      <div className="mb-2 flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-green-700 dark:text-green-400" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Visit History ({sortedVisits.length})
        </h3>
      </div>

      {sortedVisits.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-sm text-gray-400 mb-5">
          No visits recorded yet.
        </div>
      ) : (
        sortedVisits.map((visit) => (
          <div key={visit.visitId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <CalendarDays className="w-4 h-4" />
                <span className="font-semibold">{fmtDate(visit.visitDate)}</span>
                <span className="text-gray-400">·</span>
                <span>{capitalize(visit.visitType)}</span>
              </div>
              {visit.overallOutcome && (
                <Pill label={capitalize(visit.overallOutcome)} tone={OUTCOME_TONE[visit.overallOutcome]} />
              )}
            </div>

            {/* Physical Examination */}
            {visit.examination && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Physical Examination</p>
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                  <FieldGrid>
                    <Field label="Height" value={visit.examination.heightCm ? `${visit.examination.heightCm} cm` : "—"} />
                    <Field label="Weight" value={visit.examination.weightKg ? `${visit.examination.weightKg} kg` : "—"} />
                    <Field label="BMI" value={visit.examination.bmi} />
                    <Field
                      label="Blood Pressure"
                      value={
                        visit.examination.bloodPressureSystolic
                          ? `${visit.examination.bloodPressureSystolic}/${visit.examination.bloodPressureDiastolic} mmHg`
                          : "—"
                      }
                    />
                    <Field label="Pulse" value={visit.examination.pulse ? `${visit.examination.pulse} bpm` : "—"} />
                    <Field label="Temperature" value={visit.examination.temperatureCelsius ? `${visit.examination.temperatureCelsius} °C` : "—"} />
                    <Field label="Pallor" value={fmt(visit.examination.pallor)} />
                    <Field label="Weight Loss Noted" value={fmt(visit.examination.weightLossNoted)} />
                    <Field label="Enlarged Lymph Nodes" value={fmt(visit.examination.enlargedLymphNodes)} />
                    <Field label="Lymph Node Site" value={visit.examination.enlargedLymphNodesSite} />
                    <Field label="Jaundice" value={fmt(visit.examination.jaundice)} />
                  </FieldGrid>
                  {visit.examination.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <Field label="Notes" value={visit.examination.notes} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Per-cancer screenings */}
            {SCREENING_KEYS.some(({ relation }) => visit[relation]) && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Screening Findings</p>
                {SCREENING_KEYS.map(({ type, relation }) =>
                  visit[relation] ? (
                    <ScreeningRecordCard key={relation} type={type} record={visit[relation]} />
                  ) : null
                )}
              </div>
            )}

            {/* Overall outcome */}
            {visit.overallOutcome && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Screening Outcome</p>
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                  <FieldGrid>
                    <Field label="Outcome" value={capitalize(visit.overallOutcome)} />
                    <Field label="Repeat Screening Date" value={fmtDate(visit.repeatScreeningDate)} />
                    <Field label="Classified At" value={fmtDate(visit.outcomeClassifiedAt)} />
                  </FieldGrid>
                  {visit.outcomeNotes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <Field label="Notes" value={visit.outcomeNotes} />
                    </div>
                  )}
                  {(visit.overallOutcome === "suspicious" || visit.overallOutcome === "urgent_referral") && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                      <AlertTriangle className="w-3.5 h-3.5" /> Referral action required
                    </div>
                  )}
                </div>
              </div>
            )}

            {visit.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Field label="Visit Notes" value={visit.notes} />
              </div>
            )}
          </div>
        ))
      )}

      {/* Case outcome / referral tracking, if present */}
      {client.outcome && (
        <Card title="Case Outcome & Referral Tracking" icon={<ClipboardCheck className="w-5 h-5" />}>
          <FieldGrid>
            {Object.entries(client.outcome)
              .filter(([k, v]) => !["id", "clientId", "created_at", "updated_at"].includes(k) && v !== null && v !== "")
              .map(([k, v]) => (
                <Field key={k} label={capitalize(k)} value={typeof v === "boolean" ? fmt(v) : k.toLowerCase().includes("date") ? fmtDate(v) : String(v)} />
              ))}
          </FieldGrid>
        </Card>
      )}
    </Layout>
  );
}
