import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@roketid/windmill-react-ui";
import { Clock, X } from "lucide-react";

import api from "../lib/api";

type Overdue = {
  days: number;
  total: number;
  byFacility: { facilityId: number; facilityName: string; facilityState?: string | null; count: number; oldest?: string | null }[];
  samples: { sampleId: number; sampleRef: string; testLabel: string; clientId: string; clientName?: string | null; facility?: string | null; daysWaiting?: number | null }[];
};

const RESULTS_PATH = "/ncsr/screening-tests-page?tab=results";

// Once per page load: moving between pages inside the app doesn't show it again, a reload does.
let shownThisLoad = false;

/**
 * Admin-only pop-up: samples / tests still waiting for a result after 7 days.
 * Shows once on every page load / reload while anything is overdue (not on every in-app page change). Non-admins get a 403 from the API and see nothing.
 * Mount it once in the main layout so it appears wherever an admin lands.
 */
export default function OverdueResultsAlert() {
  const [data, setData] = useState<Overdue | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shownThisLoad) return;
    let cancelled = false;
    api
      .get("/screening-samples/overdue", { params: { days: 7 } })
      .then(({ data }) => {
        if (cancelled || !data?.total) return;
        shownThisLoad = true;
        setData(data);
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || !open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="overdue-title">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-6 pb-3">
          <div className="p-2 rounded-full bg-amber-100 text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="overdue-title" className="text-lg font-semibold text-gray-800 dark:text-white">Test results overdue</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              <b>{data.total}</b> sample{data.total === 1 ? "" : "s"} / test{data.total === 1 ? "" : "s"} {data.total === 1 ? "has" : "have"} been waiting
              for a result for more than {data.days} days. Please follow up with the lab or facility.
            </p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {data.byFacility.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">By facility</p>
              <ul className="space-y-1.5 text-sm">
                {data.byFacility.slice(0, 8).map((f) => (
                  <li key={f.facilityId} className="flex items-start justify-between gap-3 rounded-xl bg-amber-50 dark:bg-gray-900 px-3 py-2">
                    <span className="min-w-0 break-words text-gray-800 dark:text-gray-100">
                      {f.facilityName}
                      {f.facilityState ? <span className="text-xs text-gray-500"> · {f.facilityState}</span> : null}
                    </span>
                    <span className="shrink-0 text-right">
                      <b className="text-amber-800">{f.count}</b>
                      {f.oldest && <span className="block text-[11px] text-gray-500">oldest {f.oldest}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.samples.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Longest waiting</p>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {data.samples.slice(0, 8).map((s) => (
                  <li key={s.sampleId} className="py-2 flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words">
                      <span className="font-medium text-gray-800 dark:text-gray-100">{s.testLabel}</span>
                      <span className="text-gray-500"> · {s.clientName || s.clientId}</span>
                      <span className="block text-xs text-gray-500">
                        {s.sampleRef}
                        {s.facility ? ` · ${s.facility}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-red-600 whitespace-nowrap">{s.daysWaiting} days</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t border-gray-100 dark:border-gray-700 mt-4">
          <Button layout="outline" className="rounded-2xl" onClick={() => setOpen(false)}>
            Remind me later
          </Button>
          <Link href={RESULTS_PATH} onClick={() => setOpen(false)}>
            <Button className="w-full rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">Enter the results</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
