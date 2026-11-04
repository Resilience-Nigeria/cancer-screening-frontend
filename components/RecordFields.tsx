import React from "react";
import type { ViewSection } from "../../lib/recordDisplay";

/** Read-only label/value grid for the sections produced by buildSections(). */
export default function RecordFields({ sections, empty = "Nothing recorded." }: { sections: ViewSection[]; empty?: string }) {
  if (sections.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <div className="space-y-5">
      {sections.map((s, i) => (
        <div key={`${s.title}-${i}`}>
          {s.title && <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{s.title}</h5>}
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {s.items.map((it) => (
              <div key={it.label} className="min-w-0">
                <dt className="text-gray-500 text-xs">{it.label}</dt>
                <dd className="text-gray-800 dark:text-gray-100 break-words">{it.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
