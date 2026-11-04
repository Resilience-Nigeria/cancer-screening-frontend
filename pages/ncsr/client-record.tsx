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
  Pencil,
  Activity,
  FileText,
  FlaskConical,
  Paperclip,
} from "lucide-react";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import {
  cancerLabel,
  SCREENING_GROUPS,
  getRiskGroupsFor,
  dedupeFields,
  hydrateRiskProfile,
  CancerType,
} from "../../lib/screeningWizardConfig";
import { CERVICAL_RISK_GROUPS } from "../../lib/cervicalRisk";
import RecordFields from "../components/RecordFields";
import ResultAttachmentViewer from "../components/ResultAttachmentViewer";
import { buildSections } from "../../lib/recordDisplay";
import { findTest, resultLabel, cancerName } from "../../lib/screeningTests";

const ALL_CANCERS: CancerType[] = ["breast", "cervical", "prostate", "colorectal", "liver"];

const SEVERITY_CHIP: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  abnormal: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};

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

const OUTCOME_NAME: Record<string, string> = {
  normal: "Normal",
  low_suspicion: "Low suspicion",
  suspicious: "Referral for further diagnosis",
  urgent_referral: "Urgent referral for treatment",
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

function ScreeningRecordCard({ type, record }: { type: string; record: any }) {
  // Built from the same field definitions the clinical screening page uses, so every answer collected
  // there is shown here. Anything stored but not in those definitions goes under "Other details".
  const sections = buildSections(SCREENING_GROUPS[type as CancerType] || [], record, { includeOther: true });
  if (sections.length === 0) return null;

  const result = record.screeningResult as string | undefined;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
          {cancerLabel(type as any)}
        </p>
        {result && <Pill label={capitalize(result)} tone={RESULT_TONE[result]} />}
      </div>
      <RecordFields sections={sections} />
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
  const [testResults, setTestResults] = useState<any[]>([]);
  const [pendingSamples, setPendingSamples] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any>(null);

  useEffect(() => {
    if (!clientId) return;
    // Lab samples and results (with printout images) recorded on the Samples & Test Results pages
    (async () => {
      try {
        const [done, waiting] = await Promise.all([
          api.get("/screening-samples/results", { params: { clientId, perPage: 50 } }),
          api.get("/screening-samples", { params: { status: "collected", clientId } }),
        ]);
        setTestResults(done.data?.results ?? []);
        setPendingSamples(waiting.data?.samples ?? []);
      } catch {
        // supplementary; the rest of the record still shows
      }
    })();
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

        {/* Each button opens the matching section of the clinical screening page for this client */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/ncsr/clinical-screening?search=${encodeURIComponent(client.clientId)}`} className="inline-flex items-center gap-2 rounded-2xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 h-10">
            <Stethoscope className="w-4 h-4" /> New Screening
          </Link>
          <Link href={`/ncsr/clinical-screening?search=${encodeURIComponent(client.clientId)}&edit=1`} className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-gray-600 text-sm font-semibold px-4 h-10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Pencil className="w-4 h-4" /> Edit Details
          </Link>
          <Link href={`/ncsr/clinical-screening?search=${encodeURIComponent(client.clientId)}&step=risk`} className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-gray-600 text-sm font-semibold px-4 h-10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Activity className="w-4 h-4" /> {riskProfile ? "Edit Risk Profile" : "Add Risk Profile"}
          </Link>
          {visits.length > 0 && (
            <Link
              href={`/ncsr/clinical-screening?search=${encodeURIComponent(client.clientId)}&step=outcome&visitId=${Math.max(...visits.map((v: any) => Number(v.visitId) || 0))}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-gray-600 text-sm font-semibold px-4 h-10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4" /> {visits.some((v: any) => v.overallOutcome) ? "Edit Outcome" : "Add Outcome"}
            </Link>
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
          <Field label="Hospital Number" value={client.hospitalNumber} />
          <Field label={client.phoneNotClients ? "Phone Number (caregiver's)" : "Phone Number"} value={client.phoneNumber} />
          <Field label="Caregiver's Name" value={client.caregiverName} />
          <Field label="Caregiver's Phone" value={client.caregiverPhoneNumber} />
          <Field label="Email" value={client.email} />
          <Field label="Marital Status" value={capitalize(client.maritalStatus)} />
          <Field label="Religion" value={client.religion === "other" && client.religionOther ? client.religionOther : capitalize(client.religion)} />
          <Field label="Occupation" value={client.occupation} />
          <Field label="NIN" value={client.nin} />
          <Field label="Registration Date" value={fmtDate(client.registrationDate)} />
          <Field label="Screening Category" value={capitalize(client.screeningCategory)} />
          {client.otpSkipped && <Field label="OTP Verification" value={`Skipped${client.otpSkipReason ? ` (${client.otpSkipReason})` : ""}`} />}
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
            <RecordFields
              sections={buildSections(
                dedupeFields([
                  ...getRiskGroupsFor(ALL_CANCERS, client.gender),
                  ...(client.gender === "female" ? CERVICAL_RISK_GROUPS : []),
                ]),
                hydrateRiskProfile(riskProfile),
                { includeOther: true, skip: ["comorbidities", "comorbiditiesOther"] }
              )}
            />
            {Array.isArray(riskProfile.comorbiditiesJson) && riskProfile.comorbiditiesJson.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Comorbidities</p>
                <div className="flex flex-wrap gap-2">
                  {riskProfile.comorbiditiesJson.map((c: string, i: number) => (
                    <Pill key={i} label={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Samples & test results, including the uploaded machine printout */}
      <Card title="Samples & Test Results" icon={<FlaskConical className="w-5 h-5" />}>
        {pendingSamples.length === 0 && testResults.length === 0 ? (
          <p className="text-sm text-gray-400">No samples or tests recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {pendingSamples.map((x) => {
              const t = findTest(x.testType);
              return (
                <div key={x.sampleId} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">{t?.label ?? x.testType} <span className="text-gray-500 font-normal">· {cancerName(x.cancerType)}</span></p>
                    <p className="text-xs text-gray-600">{x.sampleRef} · {t?.kind === "procedure" ? "performed" : "taken"} {fmtDate(x.sampleDate)}</p>
                  </div>
                  <Pill label="Awaiting result" tone="bg-amber-100 text-amber-800" />
                </div>
              );
            })}
            {testResults.map((x) => {
              const t = findTest(x.testType);
              const extra: string[] = [];
              if (x.resultValue != null && t?.value) extra.push(`${x.resultValue} ${t.value.unit}`);
              if (x.resultDetail && t?.detail) extra.push(`${t.detail.label}: ${t.detail.options.find((o) => o.value === x.resultDetail)?.label ?? x.resultDetail}`);
              if (x.resultMeta?.runStatus && x.resultMeta.runStatus !== "Valid") extra.push(`Run ${String(x.resultMeta.runStatus).toLowerCase()}`);
              if (x.resultMeta?.controlCt != null) extra.push(`Control Ct ${x.resultMeta.controlCt}`);
              return (
                <div key={x.sampleId} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{t?.label ?? x.testType} <span className="text-gray-500 font-normal">· {cancerName(x.cancerType)}</span></p>
                      <p className="text-xs text-gray-500">
                        {x.sampleRef} · {t?.kind === "procedure" ? "performed" : "taken"} {fmtDate(x.sampleDate)} · released {fmtDate(x.resultDate)}
                      </p>
                      {extra.length > 0 && <p className="text-xs text-gray-600 mt-1">{extra.join(" · ")}</p>}
                      {x.resultNotes && <p className="text-xs text-gray-600 mt-1">{x.resultNotes}</p>}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${SEVERITY_CHIP[x.resultSeverity || "neutral"]}`}>
                      {resultLabel(t, x.result)}
                    </span>
                  </div>
                  {x.hasAttachment && (
                    <button type="button" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-green-700 underline" onClick={() => setViewing(x)}>
                      <Paperclip className="w-3 h-3" /> View result image
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
          <Link href="/ncsr/screening-tests-page" className="text-green-700 underline">Record sample / result</Link>
          {testResults.length > 0 && (
            <Link href={`/ncsr/test-results?clientId=${encodeURIComponent(client.clientId)}`} className="text-green-700 underline">Open in results list</Link>
          )}
        </div>
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
                <Pill label={OUTCOME_NAME[visit.overallOutcome] ?? capitalize(visit.overallOutcome)} tone={OUTCOME_TONE[visit.overallOutcome]} />
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
                  {(() => {
                    const shown = ["heightCm","weightKg","bmi","bloodPressureSystolic","bloodPressureDiastolic","pulse","temperatureCelsius","pallor","weightLossNoted","enlargedLymphNodes","enlargedLymphNodesSite","jaundice","notes"];
                    const extra = buildSections([], visit.examination, { includeOther: true, skip: shown });
                    return extra.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <RecordFields sections={extra} />
                      </div>
                    ) : null;
                  })()}
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
                    <Field label="Outcome" value={OUTCOME_NAME[visit.overallOutcome] ?? capitalize(visit.overallOutcome)} />
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
      {viewing && (
        <ResultAttachmentViewer
          sampleId={viewing.sampleId}
          title={`${findTest(viewing.testType)?.label ?? "Result"} · ${viewing.sampleRef}`}
          onClose={() => setViewing(null)}
        />
      )}
    </Layout>
  );
}
