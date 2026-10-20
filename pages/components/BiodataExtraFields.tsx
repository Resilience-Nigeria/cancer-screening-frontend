import React from "react";
import { Input, Label, Select } from "@roketid/windmill-react-ui";

export const RELIGION_OPTIONS = [
  { value: "islam", label: "Islam" },
  { value: "christianity", label: "Christianity" },
  { value: "traditional", label: "Traditional religion" },
  { value: "other", label: "Other (specify)" },
];

export const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "separated", label: "Separated" },
];

/**
 * Religion + current marital status, shared by the Stage 2 clinical page and the guided wizard.
 * Renders as grid children, so drop it directly inside the biodata grid.
 *
 * `wideClass` is the full-width grid class for the "Other religion" input:
 *   "col-span-2"     → ClinicalScreeningPage (plain 2-column grid)
 *   "sm:col-span-2"  → ScreeningWizard (responsive grid)
 */
export default function BiodataExtraFields({
  value,
  onChange,
  wideClass = "col-span-2",
}: {
  value: Record<string, any>;
  onChange: (name: string, v: any) => void;
  wideClass?: string;
}) {
  return (
    <>
      <Label>
        <span className="text-sm font-semibold">Religion</span>
        <Select
          className="mt-2 rounded-2xl h-12"
          value={value.religion ?? ""}
          onChange={(e) => {
            onChange("religion", e.target.value);
            if (e.target.value !== "other") onChange("religionOther", "");
          }}
        >
          <option value="">Select religion</option>
          {RELIGION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Label>

      <Label>
        <span className="text-sm font-semibold">Current Marital Status</span>
        <Select
          className="mt-2 rounded-2xl h-12"
          value={value.maritalStatus ?? ""}
          onChange={(e) => onChange("maritalStatus", e.target.value)}
        >
          <option value="">Select status</option>
          {MARITAL_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Label>

      {value.religion === "other" && (
        <Label className={wideClass}>
          <span className="text-sm font-semibold">Other religion (specify)</span>
          <Input
            className="mt-2 rounded-2xl h-12"
            value={value.religionOther ?? ""}
            onChange={(e) => onChange("religionOther", e.target.value)}
          />
        </Label>
      )}
    </>
  );
}