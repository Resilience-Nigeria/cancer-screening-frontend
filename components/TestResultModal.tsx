import React, { useEffect, useState } from "react";
import { X, Loader2, Building2, Download, ExternalLink } from "lucide-react";
import { Button } from "@roketid/windmill-react-ui";

import api from "../lib/api";
import { hpvRiskLabel } from "../lib/hpvRisk";
import { findTest, resultLabel, cancerName } from "../lib/screeningTests";

const chip: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  abnormal: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};

const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ageOf = (dob?: string | null) => {
  if (!dob) return null;
  const b = new Date(`${String(dob).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};

const human = (v?: string | null) => (v ? String(v).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "");

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-100 break-words">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h4>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">{children}</dl>
    </section>
  );
}

/** Inline picture/PDF of the uploaded printout (private storage, fetched with the user's token). */
function Printout({ sampleId }: { sampleId: number }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    api
      .get(`/screening-samples/${sampleId}/attachment`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setType(res.data.type || "");
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setError("Could not load the image."));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sampleId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!url) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>;
  return (
    <div>
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {type === "application/pdf" ? (
          <iframe src={url} title="Result printout" className="w-full h-[60vh]" />
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
            <img src={url} alt="Result printout" className="w-full max-h-[60vh] object-contain" />
          </a>
        )}
      </div>
      <div className="mt-2 flex gap-4 text-xs font-semibold">
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 underline">
          <ExternalLink className="w-3 h-3" /> Open full size
        </a>
        <a href={url} download={`result-${sampleId}`} className="inline-flex items-center gap-1 text-green-700 underline">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    </div>
  );
}

/**
 * Pop-up with the full result: test and result details, where it was done, the client's biodata
 * and the uploaded printout.
 */
export default function TestResultModal({
  sample,
  onClose,
  onOpenClient,
}: {
  sample: any;
  onClose: () => void;
  onOpenClient: (clientId: string) => void;
}) {
  const t = findTest(sample.testType);
  const c = sample.client || {};
  const m = sample.resultMeta || {};
  const age = ageOf(c.dateOfBirth);
  const detailOpt = t?.detail && sample.resultDetail ? t.detail.options.find((o: any) => o.value === sample.resultDetail)?.label ?? sample.resultDetail : null;
  const facility = sample.facility?.facilityName
    ? `${sample.facility.facilityName}${sample.facility.facilityState ? `, ${sample.facility.facilityState}` : ""}`
    : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="w-full sm:max-w-2xl max-h-[94vh] bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-800 dark:text-white break-words">{t?.label ?? sample.testType}</p>
            <p className="text-xs text-gray-500">{cancerName(sample.cancerType)} · {sample.sampleRef}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${chip[sample.resultSeverity || "neutral"]}`}>
              {sample.status === "result_released" ? resultLabel(t, sample.result) : "Awaiting result"}
            </span>
            <button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <Section title="Result">
            <Row label="Result" value={sample.status === "result_released" ? resultLabel(t, sample.result) : "Awaiting result"} />
            <Row label="Value" value={sample.resultValue != null && t?.value ? `${sample.resultValue} ${t.value.unit}` : null} />
            <Row label={t?.detail?.label ?? "Detail"} value={detailOpt} />
            <Row label="Result released" value={sample.resultDate ? fmt(sample.resultDate) : null} />
            {m.riskCategory && (
              <Row
                label="HPV risk category"
                value={`${hpvRiskLabel(String(m.riskCategory))}${m.riskOverridden === "yes" && m.riskSuggested ? ` (changed from suggested ${hpvRiskLabel(String(m.riskSuggested)).toLowerCase()})` : ""}`}
              />
            )}
            {Object.entries(m).filter(([k]) => !["riskCategory", "riskSuggested", "riskOverridden"].includes(k)).map(([k, v]) => (
              <Row key={k} label={human(k.replace(/([a-z])([A-Z])/g, "$1 $2"))} value={String(v)} />
            ))}
            {sample.resultNotes && <div className="sm:col-span-2"><Row label="Notes" value={sample.resultNotes} /></div>}
          </Section>

          <Section title={t?.kind === "procedure" ? "Test" : "Sample"}>
            <Row label={t?.kind === "procedure" ? "Date performed" : "Date taken"} value={fmt(sample.sampleDate)} />
            <Row
              label="Facility"
              value={facility && <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-gray-400" />{facility}</span>}
            />
            <Row label="Specimen" value={sample.specimenType} />
            <Row label="Collection method" value={human(sample.collectionMethod)} />
            <Row label="Lab sample number" value={sample.labSampleNumber} />
            <Row label="Collected by" value={sample.collectedBy} />
            {sample.notes && <div className="sm:col-span-2"><Row label="Sample notes" value={sample.notes} /></div>}
          </Section>

          <Section title="Client">
            <Row label="Name" value={c.fullName} />
            <Row label="Client ID" value={sample.clientId} />
            <Row label="Hospital number" value={c.hospitalNumber} />
            <Row label="Age / sex" value={[age != null ? `${age} yrs` : null, human(c.gender)].filter(Boolean).join(" · ")} />
            <Row label="Phone" value={c.phoneNumber} />
            <Row label="Email" value={c.email} />
            <Row label="Residence" value={[c.lgaOfResidence, c.stateOfResidence].filter(Boolean).join(", ")} />
            <Row label="Address" value={c.address} />
          </Section>

          {sample.hasAttachment && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Uploaded result image</h4>
              <Printout sampleId={sample.sampleId} />
            </section>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
          <Button layout="outline" className="rounded-2xl" onClick={() => onOpenClient(sample.clientId)}>
            Open client
          </Button>
          <Button className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
