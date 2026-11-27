import React, { useEffect, useState } from "react";
import { Fingerprint, Loader2, Copy } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";

/**
 * "All IDs for this client" (simulation report §7): the NCSR Client ID is the patient's number;
 * every other number (hospital number, CBE / ultrasound / biopsy / HPV codes, lab numbers, referral numbers)
 * is listed under it, so staff can see they all belong to the same person.
 *
 * Usage (client record / summary page):  <ClientIdentifiers clientId={client.clientId} />
 */
export default function ClientIdentifiers({ clientId }: { clientId: string }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!clientId) return;
    api.get(`/clients/${encodeURIComponent(clientId)}/identifiers`).then(({ data }) => setD(data)).catch(() => setErr("Could not load the IDs."));
  }, [clientId]);

  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast.success("Copied."), () => undefined);
  if (err) return null;
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-green-700" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Patient ID and linked numbers</h3>
      </div>
      {!d ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-green-700" /></div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => copy(d.clientId)} className="inline-flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-3 py-2">
              <span className="text-xs text-green-800 dark:text-green-300">NCSR ID</span>
              <span className="font-mono font-bold text-green-900 dark:text-green-200">{d.clientId}</span>
              <Copy className="w-3.5 h-3.5 text-green-700" />
            </button>
            {d.hospitalNumber ? (
              <span className="text-sm text-gray-700 dark:text-gray-300">Hospital no. <b className="font-mono">{d.hospitalNumber}</b></span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 mt-2">Use the NCSR ID to find this patient anywhere. The codes below are service codes linked to it — any of them also finds the patient.</p>
          {d.services?.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-2 pr-3">Service</th>
                    <th className="py-2 pr-3">Service code</th>
                    <th className="py-2 pr-3">Lab no.</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {d.services.map((s: any) => (
                    <tr key={s.sampleId}>
                      <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{s.test}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{s.status === "booked" ? "booked" : `${d.clientId} · ${s.code}`}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{s.labSampleNumber || "—"}</td>
                      <td className="py-2 text-xs text-gray-600 dark:text-gray-300">{s.date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {d.visits?.some((v: any) => v.referralNumber) ? (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
              Referral / request numbers: {d.visits.filter((v: any) => v.referralNumber).map((v: any) => v.referralNumber).join(", ")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
