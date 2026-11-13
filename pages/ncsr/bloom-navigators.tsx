import React, { useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Loader2, CheckCircle2, Ban, Building2, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

type Tab = "pending" | "approved" | "rejected";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Waiting for verification" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Community health workers who signed up in the Bloom app (NAVIGATOR role) and need to be verified. */
export default function BloomNavigatorsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<Tab, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  async function load(t = tab) {
    setLoading(true);
    try {
      const { data } = await api.get("/bloom-admin/navigators", { params: { status: t } });
      setRows(data.data ?? []);
      setSummary(data.summary ?? summary);
    } catch (e) {
      toast.error(friendlyError(e, "Could not load health worker sign-ups."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function approve(r: any) {
    setBusyId(r.id);
    try {
      await api.post(`/bloom-admin/navigators/${r.id}/approve`);
      toast.success(`${r.user?.name ?? "Health worker"} approved. Waiting cases at their facility were assigned to them.`);
      load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not approve."));
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejecting) return;
    if (reason.trim().length < 3) return toast.error("Tell them why, so they can fix it.");
    setBusyId(rejecting.id);
    try {
      await api.post(`/bloom-admin/navigators/${rejecting.id}/reject`, { note: reason.trim() });
      toast.success("Rejected. They have been emailed the reason.");
      setRejecting(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not reject."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout>
      <PageTitle>Bloom Health Workers</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Community health workers sign up in the Bloom app as Navigators. Check the staff ID with the facility to confirm each person really works there before
        approving: once approved they can sign in (app and web) and see the women assigned to them.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
              tab === t.key ? "bg-green-700 border-green-700 text-white" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            {t.label} ({summary[t.key] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            {tab === "pending" ? "No one is waiting for verification." : tab === "approved" ? "No approved sign-ups yet." : "No rejected sign-ups."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-800 dark:text-white break-words">{r.user?.name ?? "Unknown"}</p>
                <span className="text-xs text-gray-500 shrink-0">Signed up {fmt(r.signedUpAt)}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-1">
                <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" /> {r.facility?.name ?? "—"}
                {r.facility?.state ? <span className="text-gray-400">, {r.facility.state}</span> : null}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {r.user?.phone && (
                  <a href={`tel:${r.user.phone}`} className="text-green-700 font-medium inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {r.user.phone}
                  </a>
                )}
                {r.user?.email && (
                  <span className="text-gray-500 inline-flex items-center gap-1 break-all">
                    <Mail className="w-3 h-3 shrink-0" /> {r.user.email}
                  </span>
                )}
              </div>
              {(r.profession || r.staffId) && (
                <p className="text-sm text-gray-700 dark:text-gray-200 break-words">
                  {r.profession ?? "—"}
                  {r.staffId ? <span className="text-gray-500"> · Staff ID <span className="font-semibold text-gray-800 dark:text-white">{r.staffId}</span></span> : null}
                </p>
              )}
              {r.note && <p className="text-sm text-gray-700 dark:text-gray-200 break-words">Says: “{r.note}”</p>}
              {r.reviewNote && <p className="text-xs text-red-600 break-words">Reason given: {r.reviewNote}</p>}
              {r.reviewedAt && <p className="text-xs text-gray-400">Reviewed {fmt(r.reviewedAt)}</p>}

              {tab !== "approved" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="small" className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" disabled={busyId === r.id} onClick={() => approve(r)}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  {tab === "pending" && (
                    <Button size="small" layout="outline" className="rounded-xl text-red-600 border-red-300" onClick={() => { setRejecting(r); setReason(""); }}>
                      <Ban className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Reject {rejecting.user?.name}?</h3>
            <p className="mt-1 text-sm text-gray-500">They will be emailed this reason and cannot sign in.</p>
            <textarea
              className="mt-3 w-full rounded-2xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 p-3 text-sm focus:outline-none focus:border-green-600"
              rows={3}
              maxLength={300}
              value={reason}
              placeholder="e.g. We could not confirm you work at this facility. Please ask your facility admin to contact us."
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button layout="outline" className="rounded-2xl" onClick={() => setRejecting(null)} disabled={busyId !== null}>Back</Button>
              <Button className="rounded-2xl bg-red-600 border-red-600 hover:bg-red-700" onClick={reject} disabled={busyId !== null}>
                {busyId !== null ? "Saving…" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
