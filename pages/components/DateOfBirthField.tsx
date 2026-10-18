import React, { useEffect, useRef, useState } from "react";
import { Select } from "@roketid/windmill-react-ui";
import { ageFromDob } from "./VisitDetailsFields";

/**
 * Date-of-birth input built from Day / Month / Year dropdowns.
 *
 * A native <input type="date"> opens its calendar on today's month, so on a phone a date of birth means
 * tapping "previous month" dozens of times. Three dropdowns use the phone's own wheel picker and need
 * no typing: pick the year, month and day directly.
 *
 * Value in/out is an ISO string ("yyyy-mm-dd"), the same format the date input used, so nothing else
 * in the forms or the API changes. While the date is incomplete (or in the future) the value is "".
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_AGE_YEARS = 120;

type Parts = { d: string; m: string; y: string };

const pad = (n: string | number) => String(n).padStart(2, "0");
const daysIn = (month: number, year: number) => new Date(year, month, 0).getDate(); // month is 1–12

function parse(value?: string | null): Parts {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  return m ? { y: m[1], m: String(parseInt(m[2], 10)), d: String(parseInt(m[3], 10)) } : { d: "", m: "", y: "" };
}

function toIso(p: Parts): string {
  return p.d && p.m && p.y ? `${p.y}-${pad(p.m)}-${pad(p.d)}` : "";
}

export default function DateOfBirthField({
  value,
  onChange,
  hasError = false,
  disabled = false,
  showAge = true,
}: {
  value: string;
  onChange: (iso: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  showAge?: boolean;
}) {
  const [parts, setParts] = useState<Parts>(() => parse(value));
  const lastEmitted = useRef<string>(value || "");

  // Follow outside changes (a client record loaded, form reset) without fighting partial typing:
  // a partial selection emits "" and the parent holds "", so they match and nothing is overwritten.
  useEffect(() => {
    if ((value || "") !== lastEmitted.current) {
      lastEmitted.current = value || "";
      setParts(parse(value));
    }
  }, [value]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: MAX_AGE_YEARS + 1 }, (_, i) => currentYear - i);

  const iso = toIso(parts);
  const future = !!iso && iso > todayIso;
  const age = iso && !future ? ageFromDob(iso) : null;

  function update(key: keyof Parts, val: string) {
    const next: Parts = { ...parts, [key]: val };

    // Keep the day valid when the month or year changes (e.g. 31 → 28 when switching to February).
    if (next.d && next.m) {
      const max = daysIn(parseInt(next.m, 10), next.y ? parseInt(next.y, 10) : 2000);
      if (parseInt(next.d, 10) > max) next.d = String(max);
    }

    setParts(next);

    const nextIso = toIso(next);
    const emit = nextIso && nextIso <= todayIso ? nextIso : "";
    lastEmitted.current = emit;
    onChange(emit);
  }

  const maxDay = parts.m ? daysIn(parseInt(parts.m, 10), parts.y ? parseInt(parts.y, 10) : 2000) : 31;
  const ring = hasError || future ? "ring-2 ring-red-400 border-red-400" : "";

  return (
    <div>
      <div className="mt-2 flex gap-2">
        <Select
          aria-label="Day of birth"
          className={`rounded-2xl h-12 shadow-sm shrink-0 ${ring}`}
          style={{ width: "4.75rem" }}
          value={parts.d}
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update("d", e.target.value)}
        >
          <option value="">Day</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)}>{d}</option>
          ))}
        </Select>

        <Select
          aria-label="Month of birth"
          className={`rounded-2xl h-12 shadow-sm flex-1 min-w-0 ${ring}`}
          value={parts.m}
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update("m", e.target.value)}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1)}>{name}</option>
          ))}
        </Select>

        <Select
          aria-label="Year of birth"
          className={`rounded-2xl h-12 shadow-sm shrink-0 ${ring}`}
          style={{ width: "5.75rem" }}
          value={parts.y}
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update("y", e.target.value)}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </Select>
      </div>

      {future ? (
        <span className="mt-1 block text-xs text-red-500">Date of birth can&apos;t be in the future.</span>
      ) : showAge && age !== null ? (
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Age: {age} years</span>
      ) : null}
    </div>
  );
}