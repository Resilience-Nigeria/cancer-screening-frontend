import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Paperclip, FlaskConical, ExternalLink } from "lucide-react";

import api from "../lib/api";
import RecordFields from "./RecordFields";
import ResultAttachmentViewer from "./ResultAttachmentViewer";
import { buildSections, displayValue } from "../lib/recordDisplay";
import {
  SCREENING_GROUPS,
  getRiskGroupsFor,
  dedupeFields,
  hydrateRiskProfile,
  cancerLabel,
  CancerType,
} from "../lib/screeningWizardConfig";
import { CERVICAL_RISK_GROUPS } from "../lib/cervicalRisk";
import { findTest, resultLabel, cancerName } from "../lib/screeningTests";

const ALL_CANCERS: CancerType[] = ["breast", "cervical", "prostate", "colorectal", "liver"];
const SAMPLES_PATH = "/ncsr/screening-tests-page";

export const OUTCOME_LABEL: Record<string, string> = {
  normal: "Normal",
  low_suspicion: "Low suspicion",
  suspicious: "Referral for further diagnosis",
  urgent_referral: "Urgent referral for treatment",
};
const OUTCOME_TONE: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  low_suspicion: "bg-amber-100 text-amber-800",
  suspicious: "bg-orange-100 text-orange-800",
  urgent_referral: "bg-red-100 text-red-800",
};
const SEVERITY_CHIP: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  abnormal: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};

/** "2026-11-04T00:00:00.000000Z" -> "4 Nov 2026" (date only, no time-zone shift) */
export function formatDate(v?: string | null): string {
  if (!v) return "—";
  const s = String(v).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const pick = (o: any, camel: string, snake: string) => o?.[camel] ?? o?.[snake] ?? null;

type Part = "referral" | "biodata" | "risk" | "visits" | "labs";

type Props = {
  clientId: string;
  referralId?: number | null;
  /** Show only some parts (e.g. just the lab results on the tests step). Default: all. */
  only?: Part[];
  /** Parts that start expanded. */
  open?: Part[];
};

function Block({ title, badge, open, onToggle, children }: { title: string; badge?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-800 dark:text-white">{title}</span>
          {badge}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">{children}</div>}
    </div>
  );
}

/**
 * Everything captured before this client reached the diagnostic stage: referral details, biodata,
 * risk profile and medical history, Stage 2 findings per visit, and lab results with printouts.
 * Read-only, built from the same field definitions the clinical screening page uses.
 */
export default function ClientHistoryPanel({ clientId, referralId, only, open: initiallyOpen = ["referral", "visits"] }: Props) {
  const [client, setClient] = useState<any>(null);
  const [referral, setReferral] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any>(null);
  const [openParts, setOpenParts] = useState<Record<string, boolean>>(
    Object.fromEntries(initiallyOpen.map((p) => [p, true]))
  );

  const show = (p: Part) => !only || only.includes(p);
  const toggle = (p: Part) => setOpenParts((o) => ({ ...o, [p]: !o[p] }));

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Each request is independent: a facility may not be allowed one of them, and the rest should still show.
      const [c, ref, done, wait] = await Promise.allSettled([
        api.get(`/clients/${encodeURIComponent(clientId)}`),
        api.get("/referred-clients", { params: { search: clientId, perPage: 20 } }),
        api.get("/screening-samples/results", { params: { clientId, perPage: 50 } }),
        api.get("/screening-samples", { params: { status: "collected", clientId } }),
      ]);
      if (cancelled) return;
      if (c.status === "fulfilled") setClient(c.value.data?.client || c.value.data?.data || null);
      if (ref.status === "fulfilled") {
        const list: any[] = ref.value.data?.referrals ?? [];
        setReferral(
          (referralId ? list.find((r) => Number(r.referralId) === Number(referralId)) : null) ??
            list.find((r) => r.referralType === "screening_to_confirmation") ??
            list[0] ??
            null
        );
      }
      if (done.status === "fulfilled") setResults(done.value.data?.results ?? []);
      if (wait.status === "fulfilled") setPending(wait.value.data?.samples ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, referralId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading client history…
      </div>
    );
  }

  const riskProfile =
    client?.risk_profiles?.[0] || client?.riskProfiles?.[0] || client?.latestRiskProfile || client?.latest_risk_profile || null;
  const visits: any[] = [...(client?.visits || [])].sort(
    (a, b) => new Date(b.visitDate ?? 0).getTime() - new Date(a.visitDate ?? 0).getTime()
  );
  const latestOutcome = visits.find((v) => v.overallOutcome)?.overallOutcome;
  const urgentLabs = results.filter((x) => x.resultSeverity === "urgent").length;

  const biodata = client
    ? [
        {
          title: "Identity & contact",
          items: [
            { label: "Client ID", value: client.clientId },
            { label: "Hospital number", value: client.hospitalNumber },
            { label: "Date of birth", value: client.dateOfBirth ? formatDate(client.dateOfBirth) : "" },
            { label: "Marital status", value: client.maritalStatus ? displayValue(client.maritalStatus) : "" },
            { label: "Occupation", value: client.occupation },
            { label: client.phoneNotClients ? "Phone (caregiver's)" : "Phone", value: client.phoneNumber },
            { label: "Caregiver", value: [client.caregiverName, client.caregiverPhoneNumber].filter(Boolean).join(" · ") },
            { label: "Email", value: client.email },
          ],
        },
        {
          title: "Location & next of kin",
          items: [
            { label: "Address", value: [client.address, client.landmark].filter(Boolean).join(", ") },
            { label: "Residence", value: [client.lgaOfResidence, client.stateOfResidence].filter(Boolean).join(", ") },
            { label: "Origin", value: [client.lgaOfOrigin, client.stateOfOrigin].filter(Boolean).join(", ") },
            { label: "Next of kin", value: [client.nextOfKinName, client.nextOfKinPhone, client.nextOfKinRelationship].filter(Boolean).join(" · ") },
          ],
        },
      ]
        .map((s) => ({ ...s, items: s.items.filter((i) => i.value).map((i) => ({ ...i, value: String(i.value) })) }))
        .filter((s) => s.items.length)
    : [];

  return (
    <div className="space-y-3">
      {show("referral") && (
        <Block
          title="Referral"
          open={!!openParts.referral}
          onToggle={() => toggle("referral")}
          badge={latestOutcome ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${OUTCOME_TONE[latestOutcome] ?? "bg-gray-100 text-gray-700"}`}>{OUTCOME_LABEL[latestOutcome] ?? displayValue(latestOutcome)}</span> : undefined}
        >
          {referral ? (
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-500">From:</span>{" "}
                <span className="font-medium">{(referral.fromFacility ?? referral.from_facility)?.facilityName ?? "—"}</span>
                <span className="text-gray-500"> on </span>{formatDate(referral.referralDate)}
              </p>
              <p><span className="text-gray-500">Status:</span> <span className="capitalize">{referral.status}</span></p>
              {referral.notes && <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{referral.notes}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No referral details available.</p>
          )}
          {urgentLabs > 0 && <p className="mt-2 text-xs font-semibold text-red-600">{urgentLabs} urgent lab result{urgentLabs === 1 ? "" : "s"} on file.</p>}
        </Block>
      )}

      {show("visits") && (
        <Block title={`Stage 2 screening findings (${visits.length} visit${visits.length === 1 ? "" : "s"})`} open={!!openParts.visits} onToggle={() => toggle("visits")}>
          {visits.length === 0 ? (
            <p className="text-sm text-gray-500">No Stage 2 visits on file.</p>
          ) : (
            <div className="space-y-5">
              {visits.map((v) => (
                <div key={v.visitId} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{formatDate(v.visitDate)}{v.visitType ? ` · ${displayValue(v.visitType)}` : ""}</p>
                    {v.overallOutcome && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${OUTCOME_TONE[v.overallOutcome] ?? "bg-gray-100 text-gray-700"}`}>
                        {OUTCOME_LABEL[v.overallOutcome] ?? displayValue(v.overallOutcome)}
                      </span>
                    )}
                  </div>
                  {v.outcomeNotes && <p className="text-xs text-gray-600 mb-2">{v.outcomeNotes}</p>}
                  <div className="space-y-4">
                    {ALL_CANCERS.map((ct) => {
                      const rec = pick(v, `${ct}Screening`, `${ct}_screening`);
                      if (!rec) return null;
                      return (
                        <div key={ct}>
                          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">{cancerLabel(ct)}</p>
                          <RecordFields sections={buildSections(SCREENING_GROUPS[ct] || [], rec, { includeOther: true })} empty="No findings recorded." />
                        </div>
                      );
                    })}
                    {v.examination && (
                      <div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Physical examination</p>
                        <RecordFields sections={buildSections([], v.examination, { includeOther: true })} empty="No examination recorded." />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Block>
      )}

      {show("risk") && (
        <Block title="Risk profile, family & medical history" open={!!openParts.risk} onToggle={() => toggle("risk")}>
          {!riskProfile ? (
            <p className="text-sm text-gray-500">No risk profile on file.</p>
          ) : (
            <div className="space-y-4">
              <RecordFields
                sections={buildSections(
                  dedupeFields([
                    ...getRiskGroupsFor(ALL_CANCERS, client?.gender),
                    ...(client?.gender === "female" ? CERVICAL_RISK_GROUPS : []),
                  ]),
                  hydrateRiskProfile(riskProfile),
                  { includeOther: true, skip: ["comorbidities", "comorbiditiesOther"] }
                )}
              />
              {Array.isArray(riskProfile.comorbiditiesJson) && riskProfile.comorbiditiesJson.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {riskProfile.comorbiditiesJson.map((c: string, i: number) => (
                    <span key={i} className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs">{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Block>
      )}

      {show("biodata") && (
        <Block title="Biodata" open={!!openParts.biodata} onToggle={() => toggle("biodata")}>
          <RecordFields sections={biodata} empty="Biodata is not available." />
        </Block>
      )}

      {show("labs") && (
        <Block
          title={`Lab samples & results (${results.length + pending.length})`}
          open={!!openParts.labs}
          onToggle={() => toggle("labs")}
          badge={pending.length ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{pending.length} awaiting</span> : undefined}
        >
          <div className="space-y-2">
            {pending.length === 0 && results.length === 0 && <p className="text-sm text-gray-500">No samples or tests recorded yet.</p>}
            {pending.map((x) => {
              const t = findTest(x.testType);
              return (
                <div key={x.sampleId} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">{t?.label ?? x.testType} <span className="text-gray-500 font-normal">· {cancerName(x.cancerType)}</span></p>
                    <p className="text-xs text-gray-600">{x.sampleRef} · {t?.kind === "procedure" ? "performed" : "taken"} {formatDate(x.sampleDate)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">Awaiting result</span>
                </div>
              );
            })}
            {results.map((x) => {
              const t = findTest(x.testType);
              const extra: string[] = [];
              if (x.resultValue != null && t?.value) extra.push(`${x.resultValue} ${t.value.unit}`);
              if (x.resultDetail && t?.detail) extra.push(`${t.detail.label}: ${t.detail.options.find((o: any) => o.value === x.resultDetail)?.label ?? x.resultDetail}`);
              return (
                <div key={x.sampleId} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{t?.label ?? x.testType} <span className="text-gray-500 font-normal">· {cancerName(x.cancerType)}</span></p>
                      <p className="text-xs text-gray-500">{x.sampleRef} · {t?.kind === "procedure" ? "performed" : "taken"} {formatDate(x.sampleDate)} · released {formatDate(x.resultDate)}</p>
                      {extra.length > 0 && <p className="text-xs text-gray-600 mt-1">{extra.join(" · ")}</p>}
                      {x.resultNotes && <p className="text-xs text-gray-600 mt-1">{x.resultNotes}</p>}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${SEVERITY_CHIP[x.resultSeverity || "neutral"]}`}>{resultLabel(t, x.result)}</span>
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
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
            <a href={`${SAMPLES_PATH}?search=${encodeURIComponent(clientId)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 underline">
              <FlaskConical className="w-3 h-3" /> Record a sample or test <ExternalLink className="w-3 h-3" />
            </a>
            <a href={`${SAMPLES_PATH}?tab=results&search=${encodeURIComponent(clientId)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 underline">
              Enter a result <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Block>
      )}

      {viewing && (
        <ResultAttachmentViewer
          sampleId={viewing.sampleId}
          title={`${findTest(viewing.testType)?.label ?? "Result"} · ${viewing.sampleRef}`}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
