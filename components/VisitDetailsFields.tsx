import React from "react";
import { Input, Label, Select } from "@roketid/windmill-react-ui";

// Visit-level intake fields from the standardized form (§3 and §4). These describe THIS encounter,
// not the client, so they are sent with the visit (not stored on the client record).

export const REASON_FOR_VISIT_OPTIONS = [
  { value: "routine_screening", label: "Routine screening" },
  { value: "referral", label: "Referral" },
  { value: "abnormality_detected", label: "Abnormality detected" },
];

export const ENTRY_POINT_OPTIONS = [
  { value: "art_clinic", label: "ART Clinic" },
  { value: "fp_clinic", label: "FP Clinic" },
  { value: "anc", label: "ANC" },
  { value: "preventive_oncology", label: "Preventive Oncology" },
  { value: "wellness_center", label: "Wellness Center" },
  { value: "opd", label: "OPD" },
  { value: "other", label: "Other" },
];

export const initialVisitMeta = () => ({
  reasonForVisit: "",
  referredIn: "",
  referralNumber: "",
  entryPoint: "",
  entryPointOther: "",
});

export type VisitMeta = ReturnType<typeof initialVisitMeta>;

/** Whole years between a date of birth and today; null when the date is missing/invalid. */
export function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(`${String(dob).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

// export default function VisitDetailsFields({
//   value,
//   onChange,
// }: {
//   value: VisitMeta;
//   onChange: (name: keyof VisitMeta, v: string) => void;
// }) {
export default function VisitDetailsFields({
  value = initialVisitMeta(),
  onChange = () => {},
}: {
  value?: VisitMeta;
  onChange?: (name: keyof VisitMeta, v: string) => void;
}) {
  const set = (name: keyof VisitMeta, v: string) => {
    onChange(name, v);
    // Clear dependent fields when their trigger no longer applies.
    if (name === "referredIn" && v !== "yes") onChange("referralNumber", "");
    if (name === "entryPoint" && v !== "other") onChange("entryPointOther", "");
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Visit Details</h4>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Label className="sm:col-span-2">
          <span className="text-sm font-semibold">Reason for Current Visit</span>
          <Select
            className="mt-2 rounded-2xl h-12"
            value={value.reasonForVisit}
            onChange={(e) => set("reasonForVisit", e.target.value)}
          >
            <option value="">Select</option>
            {REASON_FOR_VISIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Label>

        <Label>
          <span className="text-sm font-semibold">Referred in from another facility / service point</span>
          <Select
            className="mt-2 rounded-2xl h-12"
            value={value.referredIn}
            onChange={(e) => set("referredIn", e.target.value)}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </Label>

        {value.referredIn === "yes" && (
          <Label>
            <span className="text-sm font-semibold">Referral Number</span>
            <Input
              className="mt-2 rounded-2xl h-12"
              value={value.referralNumber}
              onChange={(e) => set("referralNumber", e.target.value)}
            />
          </Label>
        )}

        <Label>
          <span className="text-sm font-semibold">Entry Point</span>
          <Select
            className="mt-2 rounded-2xl h-12"
            value={value.entryPoint}
            onChange={(e) => set("entryPoint", e.target.value)}
          >
            <option value="">Select</option>
            {ENTRY_POINT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Label>

        {value.entryPoint === "other" && (
          <Label>
            <span className="text-sm font-semibold">Other Entry Point (specify)</span>
            <Input
              className="mt-2 rounded-2xl h-12"
              value={value.entryPointOther}
              onChange={(e) => set("entryPointOther", e.target.value)}
            />
          </Label>
        )}
      </div>
    </div>
  );
}