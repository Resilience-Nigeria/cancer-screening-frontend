import React, { useEffect, useState } from "react";
import { Button, Input, Label, Select, Textarea } from "@roketid/windmill-react-ui";
import {
  Loader2, Scissors, Pill, Radiation, Syringe,
  ShieldPlus, Crosshair, HeartHandshake, Trash2, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";

const MODALITIES = [
  { key: "surgery", label: "Surgery", icon: Scissors },
  { key: "chemotherapy", label: "Chemotherapy", icon: Pill },
  { key: "radiotherapy", label: "Radiotherapy", icon: Radiation },
  { key: "hormonal_therapy", label: "Hormonal Therapy", icon: Syringe },
  { key: "immunotherapy", label: "Immunotherapy", icon: ShieldPlus },
  { key: "targeted_therapy", label: "Targeted Therapy", icon: Crosshair },
  { key: "palliative_care", label: "Palliative Care", icon: HeartHandshake },
] as const;

const PALLIATIVE_SERVICES = [
  "Pain management", "Symptom control", "Nutritional support",
  "Psychological support", "Spiritual care", "Family counselling", "Home-based care",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function CompletionFields({ status, setStatus, reason, setReason, completionDate, setCompletionDate }: any) {
  return (
    <>
      <Label>
        <span className="text-sm font-semibold">Completion Status</span>
        <Select className="mt-2 rounded-2xl h-12" value={status} onChange={(e: any) => setStatus(e.target.value)}>
          <option value="">Select status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="discontinued">Discontinued</option>
        </Select>
      </Label>
      {status === "discontinued" && (
        <Label>
          <span className="text-sm font-semibold">Reason for Discontinuation</span>
          <Input className="mt-2 rounded-2xl h-12" value={reason} onChange={(e: any) => setReason(e.target.value)} />
        </Label>
      )}
      {status === "completed" && (
        <Label>
          <span className="text-sm font-semibold">Completion Date</span>
          <Input type="date" className="mt-2 rounded-2xl h-12" value={completionDate} onChange={(e: any) => setCompletionDate(e.target.value)} />
        </Label>
      )}
    </>
  );
}

export default function TreatmentModalitiesPanel({
  planId,
  onRecordsChange,
}: {
  planId: number;
  onRecordsChange?: (records: any[]) => void;
}) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModality, setActiveModality] = useState<string>("surgery");
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState(todayStr());
  const [completionStatus, setCompletionStatus] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [reasonForDiscontinuation, setReasonForDiscontinuation] = useState("");
  const [notes, setNotes] = useState("");

  const [fields, setFields] = useState<Record<string, any>>({});
  const [palliativeServices, setPalliativeServices] = useState<string[]>([]);

  useEffect(() => {
    if (planId) fetchRecords();
  }, [planId]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const { data } = await api.get(`/treatment-plans/${planId}/records`);
      setRecords(data.records || []);
      onRecordsChange?.(data.records || []);
    } catch {
      toast.error("Could not load treatment records.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStartDate(todayStr());
    setCompletionStatus("");
    setCompletionDate("");
    setReasonForDiscontinuation("");
    setNotes("");
    setFields({});
    setPalliativeServices([]);
  }

  function setField(key: string, value: any) {
    setFields((p) => ({ ...p, [key]: value }));
  }

  async function saveRecord() {
    if (!planId) return;
    setSaving(true);
    try {
      const modalityDetails = activeModality === "palliative_care"
        ? { ...fields, services: palliativeServices }
        : fields;

      const { data } = await api.post(`/treatment-plans/${planId}/records`, {
        modalityType: activeModality,
        startDate: startDate || null,
        completionDate: completionDate || null,
        completionStatus: completionStatus || null,
        reasonForDiscontinuation,
        notes,
        modalityDetails,
      });
      const updated = [...records, data.record];
      setRecords(updated);
      onRecordsChange?.(updated);
      toast.success(`${MODALITIES.find((m) => m.key === activeModality)?.label} record added.`);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save this record.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(recordId: number) {
    try {
      await api.delete(`/treatment-records/${recordId}`);
      const updated = records.filter((r) => r.treatmentRecordId !== recordId);
      setRecords(updated);
      onRecordsChange?.(updated);
      toast.success("Record removed.");
    } catch {
      toast.error("Could not remove this record.");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  }

  return (
    <div>
      {records.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recorded Treatments</h3>
          {records.map((r) => {
            const isExpanded = expandedRecordId === r.treatmentRecordId;
            const details = r.modalityDetails || {};
            const detailEntries = Object.entries(details).filter(([, v]) => v !== "" && v !== null && (!Array.isArray(v) || v.length > 0));
            return (
              <div key={r.treatmentRecordId} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setExpandedRecordId(isExpanded ? null : r.treatmentRecordId)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white capitalize">{r.modalityType.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-500">{r.startDate} · {r.completionStatus || "status not set"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); deleteRecord(r.treatmentRecordId); }}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {r.completionDate && (
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Completion Date</span><span className="text-gray-800 dark:text-white font-medium">{r.completionDate}</span></div>
                    )}
                    {r.reasonForDiscontinuation && (
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Reason for Discontinuation</span><span className="text-gray-800 dark:text-white font-medium">{r.reasonForDiscontinuation}</span></div>
                    )}
                    {detailEntries.length === 0 ? (
                      <p className="text-xs text-gray-400">No additional details recorded.</p>
                    ) : (
                      detailEntries.map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs gap-4">
                          <span className="text-gray-500 capitalize flex-shrink-0">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                          <span className="text-gray-800 dark:text-white font-medium text-right">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                        </div>
                      ))
                    )}
                    {r.notes && (
                      <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">Notes</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{r.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {MODALITIES.map((m) => (
          <button
            key={m.key}
            onClick={() => { setActiveModality(m.key); resetForm(); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeModality === m.key ? "bg-green-700 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            <m.icon className="w-4 h-4" /> {m.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {activeModality === "surgery" && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><Scissors className="w-5 h-5 text-green-700" /> Surgery</h3>
            <Label><span className="text-sm font-semibold">Procedure Performed</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.procedurePerformed || ""} onChange={(e) => setField("procedurePerformed", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Label><span className="text-sm font-semibold">Surgeon</span>
                <Input className="mt-2 rounded-2xl h-12" value={fields.surgeon || ""} onChange={(e) => setField("surgeon", e.target.value)} />
              </Label>
              <Label><span className="text-sm font-semibold">Hospital</span>
                <Input className="mt-2 rounded-2xl h-12" value={fields.hospital || ""} onChange={(e) => setField("hospital", e.target.value)} />
              </Label>
            </div>
            <Label><span className="text-sm font-semibold">Surgical Margins</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.surgicalMargins || ""} onChange={(e) => setField("surgicalMargins", e.target.value)} placeholder="Clear / involved / close" />
            </Label>
            <Label><span className="text-sm font-semibold">Lymph Node Dissection</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.lymphNodeDissection || ""} onChange={(e) => setField("lymphNodeDissection", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Complications</span>
              <Textarea className="mt-2 rounded-2xl" rows={2} value={fields.complications || ""} onChange={(e) => setField("complications", e.target.value)} />
            </Label>
          </>
        )}

        {activeModality === "chemotherapy" && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><Pill className="w-5 h-5 text-green-700" /> Chemotherapy</h3>
            <Label><span className="text-sm font-semibold">Regimen</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.regimen || ""} onChange={(e) => setField("regimen", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Drug Names</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.drugNames || ""} onChange={(e) => setField("drugNames", e.target.value)} placeholder="Comma-separated" />
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <Label><span className="text-sm font-semibold">Cycle Number</span>
                <Input className="mt-2 rounded-2xl h-12" value={fields.cycleNumber || ""} onChange={(e) => setField("cycleNumber", e.target.value)} />
              </Label>
              <Label><span className="text-sm font-semibold">Dose</span>
                <Input className="mt-2 rounded-2xl h-12" value={fields.dose || ""} onChange={(e) => setField("dose", e.target.value)} />
              </Label>
              <Label><span className="text-sm font-semibold">Frequency</span>
                <Input className="mt-2 rounded-2xl h-12" value={fields.frequency || ""} onChange={(e) => setField("frequency", e.target.value)} />
              </Label>
            </div>
            <Label><span className="text-sm font-semibold">Start Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Label>
            <CompletionFields status={completionStatus} setStatus={setCompletionStatus} reason={reasonForDiscontinuation} setReason={setReasonForDiscontinuation} completionDate={completionDate} setCompletionDate={setCompletionDate} />
            <Label><span className="text-sm font-semibold">Toxicity</span>
              <Textarea className="mt-2 rounded-2xl" rows={2} value={fields.toxicity || ""} onChange={(e) => setField("toxicity", e.target.value)} />
            </Label>
          </>
        )}

        {activeModality === "radiotherapy" && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><Radiation className="w-5 h-5 text-green-700" /> Radiotherapy</h3>
            <Label><span className="text-sm font-semibold">Treatment Centre</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.treatmentCentre || ""} onChange={(e) => setField("treatmentCentre", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Radiation Type</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.radiationType || ""} onChange={(e) => setField("radiationType", e.target.value)} />
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Label><span className="text-sm font-semibold">Dose</span>
                <Input className="mt-2 rounded-2xl h-12" value={fields.dose || ""} onChange={(e) => setField("dose", e.target.value)} />
              </Label>
              <Label><span className="text-sm font-semibold">Fractions</span>
                <Input className="mt-2 rounded-2xl h-12" value={fields.fractions || ""} onChange={(e) => setField("fractions", e.target.value)} />
              </Label>
            </div>
            <Label><span className="text-sm font-semibold">Start Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Label>
            <CompletionFields status={completionStatus} setStatus={setCompletionStatus} reason={reasonForDiscontinuation} setReason={setReasonForDiscontinuation} completionDate={completionDate} setCompletionDate={setCompletionDate} />
            <Label><span className="text-sm font-semibold">Side Effects</span>
              <Textarea className="mt-2 rounded-2xl" rows={2} value={fields.sideEffects || ""} onChange={(e) => setField("sideEffects", e.target.value)} />
            </Label>
          </>
        )}

        {activeModality === "hormonal_therapy" && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><Syringe className="w-5 h-5 text-green-700" /> Hormonal Therapy</h3>
            <Label><span className="text-sm font-semibold">Drug</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.drug || ""} onChange={(e) => setField("drug", e.target.value)} placeholder="Tamoxifen, aromatase inhibitor, ADT..." />
            </Label>
            <Label><span className="text-sm font-semibold">Duration</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.duration || ""} onChange={(e) => setField("duration", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Compliance</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.compliance || ""} onChange={(e) => setField("compliance", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Side Effects</span>
              <Textarea className="mt-2 rounded-2xl" rows={2} value={fields.sideEffects || ""} onChange={(e) => setField("sideEffects", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Start Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Label>
            <CompletionFields status={completionStatus} setStatus={setCompletionStatus} reason={reasonForDiscontinuation} setReason={setReasonForDiscontinuation} completionDate={completionDate} setCompletionDate={setCompletionDate} />
          </>
        )}

        {activeModality === "immunotherapy" && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><ShieldPlus className="w-5 h-5 text-green-700" /> Immunotherapy</h3>
            <Label><span className="text-sm font-semibold">Drug</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.drug || ""} onChange={(e) => setField("drug", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Cycle</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.cycle || ""} onChange={(e) => setField("cycle", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Immune-Related Adverse Events</span>
              <Textarea className="mt-2 rounded-2xl" rows={2} value={fields.immuneRelatedAdverseEvents || ""} onChange={(e) => setField("immuneRelatedAdverseEvents", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Treatment Response</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.treatmentResponse || ""} onChange={(e) => setField("treatmentResponse", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Start Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Label>
            <CompletionFields status={completionStatus} setStatus={setCompletionStatus} reason={reasonForDiscontinuation} setReason={setReasonForDiscontinuation} completionDate={completionDate} setCompletionDate={setCompletionDate} />
          </>
        )}

        {activeModality === "targeted_therapy" && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><Crosshair className="w-5 h-5 text-green-700" /> Targeted Therapy</h3>
            <Label><span className="text-sm font-semibold">Biomarker</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.biomarker || ""} onChange={(e) => setField("biomarker", e.target.value)} placeholder="HER2, EGFR mutation, BRCA..." />
            </Label>
            <Label><span className="text-sm font-semibold">Drug</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.drug || ""} onChange={(e) => setField("drug", e.target.value)} placeholder="Trastuzumab, EGFR inhibitor, PARP inhibitor..." />
            </Label>
            <Label><span className="text-sm font-semibold">Response</span>
              <Input className="mt-2 rounded-2xl h-12" value={fields.response || ""} onChange={(e) => setField("response", e.target.value)} />
            </Label>
            <Label><span className="text-sm font-semibold">Start Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Label>
            <CompletionFields status={completionStatus} setStatus={setCompletionStatus} reason={reasonForDiscontinuation} setReason={setReasonForDiscontinuation} completionDate={completionDate} setCompletionDate={setCompletionDate} />
          </>
        )}

        {activeModality === "palliative_care" && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-green-700" /> Palliative Care</h3>
            <div>
              <p className="text-sm font-semibold mb-2">Services</p>
              <div className="flex flex-wrap gap-2">
                {PALLIATIVE_SERVICES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPalliativeServices((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      palliativeServices.includes(s) ? "bg-green-700 text-white border-green-700" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Label><span className="text-sm font-semibold">Start Date</span>
              <Input type="date" className="mt-2 rounded-2xl h-12" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Label>
          </>
        )}

        <Label><span className="text-sm font-semibold">Additional Notes</span>
          <Textarea className="mt-2 rounded-2xl" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Label>

        <Button onClick={saveRecord} disabled={saving} className="w-full h-12 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add {MODALITIES.find((m) => m.key === activeModality)?.label} Record</span>}
        </Button>
      </div>
    </div>
  );
}
