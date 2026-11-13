import React, { useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Loader2, CheckCircle2, Ban, Building2, Phone, Search, UserCheck, ArrowRightLeft } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

type Tab = "pending" | "approved" | "rejected";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Waiting for a decision" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];
const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const caseCode = (id?: number | null) => (id ? `BLM-${String(id).padStart(5, "0")}` : null);

/**
 * Health workers asking to attend to a client at their facility. Approving opens a Bloom case for
 * the client (or moves her open case) and assigns it to the health worker; they are notified in the app.
 */
export default function BloomAccessRequestsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deciding, setDeciding] = useState<{ row: any; action: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  async function load(t = tab, s = term) {
    setLoading(true);
    try {
      const { data } = await api.get("/bloom-admin/access-requests", { params: { status: t, search: s || undefined } });
      setRows(data.data ?? []);
      setCounts(data.counts ?? counts);
    } catch (e) {
      toast.error(friendlyError(e, "Could not load access requests."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab, term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, term]);

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  async function decide() {
    if (!deciding) return;
    const { row, action } = deciding;
    if (action === "reject" && note.trim().length < 3) return toast.error("Give the health worker a short reason.");
    setBusyId(row.id);
    try {
      const { data } = await api.post(`/bloom-admin/access-requests/${row.id}/${action}`, { note: note.trim() || undefined });
      toast.success(action === "approve" ? `Approved. ${data?.data?.code ?? "The case"} is now assigned to ${row.healthWorker?.name ?? "the health worker"}.` : "Request rejected. The health worker has been told.");
      setDeciding(null);
      setNote("");
      load();
    } catch (e) {
      toast.error(friendlyError(e, action === "approve" ? "Could not approve." : "Could not reject."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout>
      <PageTitle>Bloom Access Requests</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Community health workers can search clients registered at (or referred to) their facility and ask to attend to them. Check that the reason makes sense
        before approving: approval gives them the client&apos;s contact details and screening record.
      </p>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                tab === t.key ? "bg-green-700 border-green-700 text-white" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {t.label} ({counts[t.key] ?? 0})
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Client, Client ID or health worker"
            className="w-full rounded-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-600"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            {term ? "Nothing matches your search." : tab === "pending" ? "No requests waiting." : tab === "approved" ? "No approved requests yet." : "No rejected requests."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white break-words">{r.client?.name ?? "Client record not found"}</p>
                  <p className="text-xs text-gray-500 break-all">
                    {r.client?.clientId}
                    {r.client?.age ? ` · ${r.client.age} years` : ""}
                    {r.client?.lga ? ` · ${r.client.lga}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">{fmt(r.createdAt)}</span>
              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3 space-y-1">
                <p className="text-sm text-gray-800 dark:text-gray-100 flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-green-700 shrink-0" />
                  <span className="font-semibold">{r.healthWorker?.name ?? "Unknown"}</span>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1">
                  <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" /> {r.facility?.name ?? "—"}
                </p>
                {r.healthWorker?.phone && (
                  <a href={`tel:${r.healthWorker.phone}`} className="text-xs text-green-700 font-medium inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {r.healthWorker.phone}
                  </a>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-200 break-words pt-1">“{r.reason}”</p>
              </div>

              {r.status === "pending" && r.currentCase && (
                <p className="text-xs text-amber-700 flex items-start gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  She has an open case ({r.currentCase.code}){r.currentCase.navigator ? ` with ${r.currentCase.navigator}` : ""}. Approving moves it to this health worker.
                </p>
              )}
              {r.decisionNote && <p className={`text-xs break-words ${r.status === "rejected" ? "text-red-600" : "text-gray-600"}`}>Note: {r.decisionNote}</p>}
              {r.decidedAt && (
                <p className="text-xs text-gray-400">
                  {r.status === "approved" ? "Approved" : "Rejected"} {fmt(r.decidedAt)}
                  {r.status === "approved" && caseCode(r.caseId) ? ` · ${caseCode(r.caseId)}` : ""}
                </p>
              )}

              {r.status === "pending" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="small" className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" disabled={busyId === r.id || !r.client?.name} onClick={() => { setDeciding({ row: r, action: "approve" }); setNote(""); }}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="small" layout="outline" className="rounded-xl text-red-600 border-red-300" disabled={busyId === r.id} onClick={() => { setDeciding({ row: r, action: "reject" }); setNote(""); }}>
                    <Ban className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deciding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {deciding.action === "approve" ? "Approve" : "Reject"} {deciding.row.healthWorker?.name ?? "this request"}?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {deciding.action === "approve"
                ? `${deciding.row.client?.name ?? "The client"} will be assigned to them as a Bloom case and they will be notified in the app.`
                : "They will see this reason in the app."}
            </p>
            <textarea
              className="mt-3 w-full rounded-2xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 p-3 text-sm focus:outline-none focus:border-green-600"
              rows={3}
              maxLength={300}
              value={note}
              placeholder={deciding.action === "approve" ? "Optional note for the health worker" : "e.g. She is already followed up by the hospital team."}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button layout="outline" className="rounded-2xl" onClick={() => setDeciding(null)} disabled={busyId !== null}>Back</Button>
              <Button
                className={`rounded-2xl ${deciding.action === "approve" ? "bg-green-700 border-green-700 hover:bg-green-800" : "bg-red-600 border-red-600 hover:bg-red-700"}`}
                onClick={decide}
                disabled={busyId !== null}
              >
                {busyId !== null ? "Saving…" : deciding.action === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
