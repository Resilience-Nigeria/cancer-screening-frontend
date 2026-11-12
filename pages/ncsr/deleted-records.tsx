import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Loader2, RotateCcw, Check, X, Trash2, Inbox } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { findTest, cancerName } from "../../lib/screeningTests";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

type Tab = "pending" | "deleted" | "history";

export default function DeletedRecordsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [deleted, setDeleted] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "deleted") {
        const { data } = await api.get("/screening-samples/deleted");
        setDeleted(data?.samples ?? []);
      } else {
        const { data } = await api.get("/screening-samples/deletion-requests", { params: { status: tab === "pending" ? "pending" : "all" } });
        const list: any[] = data?.requests ?? [];
        setRequests(tab === "history" ? list.filter((r) => r.status !== "pending") : list);
      }
      setForbidden(false);
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
      else toast.error(friendlyError(err, "Could not load the records."));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(r: any, approve: boolean) {
    let note: string | undefined;
    if (!approve) {
      const n = window.prompt("Reason for rejecting (optional):");
      if (n === null) return;
      note = n || undefined;
    } else if (!window.confirm("Approve and delete this record? It stays in Deleted Records and can be restored.")) {
      return;
    }
    setBusyId(`r${r.requestId}`);
    try {
      await api.post(`/screening-samples/deletion-requests/${r.requestId}/decide`, { approve, note });
      toast.success(approve ? "Approved. Record deleted." : "Request rejected.");
      load();
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not save the decision."));
    } finally {
      setBusyId("");
    }
  }

  async function restore(s: any) {
    if (!window.confirm("Restore this record? It will reappear in the client's results.")) return;
    setBusyId(`s${s.sampleId}`);
    try {
      await api.post(`/screening-samples/${s.sampleId}/restore`);
      toast.success("Record restored.");
      load();
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not restore the record."));
    } finally {
      setBusyId("");
    }
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
        tab === t ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
      }`}
    >
      {label}
    </button>
  );

  const testName = (k?: string) => findTest(k || "")?.label ?? k ?? "Test";
  const empty = (msg: string) => (
    <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
      <Inbox className="w-9 h-9 mx-auto text-gray-400" />
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{msg}</p>
    </div>
  );

  return (
    <Layout>
      <PageTitle>Deletion Requests & Deleted Records</PageTitle>
      <p className="text-sm text-gray-500 -mt-2 mb-4">
        Samples and results are never permanently removed. Approve or reject requests from desk officers, and restore anything deleted by mistake.
      </p>

      {forbidden ? (
        empty("Only admins can open this page.")
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {tabBtn("pending", "Awaiting approval")}
            {tabBtn("deleted", "Deleted records")}
            {tabBtn("history", "Decision history")}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && tab !== "deleted" && (
            <div className="space-y-3">
              {requests.length === 0 && empty(tab === "pending" ? "No deletion requests are waiting." : "No decisions yet.")}
              {requests.map((r) => (
                <div key={r.requestId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        {testName(r.testType)} <span className="text-gray-400 font-normal">· {r.clientName || r.clientId}</span>
                      </p>
                      <p className="text-xs text-gray-500 break-all">
                        {r.clientId}
                        {r.sampleRef ? ` · ${r.sampleRef}` : ""} · {r.sampleStatus === "result_released" ? `Result: ${r.result ?? "—"}` : "Awaiting result"}
                      </p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">Reason:</span> {r.reason}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested by {r.requestedBy} · {fmt(r.requestedAt)}
                      </p>
                      {r.status !== "pending" && (
                        <p className="text-xs text-gray-500 mt-1">
                          {r.status === "approved" ? "Approved" : "Rejected"} by {r.decidedBy} · {fmt(r.decidedAt)}
                          {r.decisionNote ? ` · ${r.decisionNote}` : ""}
                        </p>
                      )}
                    </div>
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button layout="outline" size="small" className="rounded-xl" disabled={busyId === `r${r.requestId}`} onClick={() => decide(r, false)}>
                          <span className="inline-flex items-center gap-1"><X className="w-3 h-3" /> Reject</span>
                        </Button>
                        <Button size="small" className="rounded-xl bg-red-600 border-red-600 hover:bg-red-700" disabled={busyId === `r${r.requestId}`} onClick={() => decide(r, true)}>
                          <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Approve &amp; delete</span>
                        </Button>
                      </div>
                    ) : (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.status === "approved" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                        {r.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "deleted" && (
            <div className="space-y-3">
              {deleted.length === 0 && empty("No deleted records.")}
              {deleted.map((s) => (
                <div key={s.sampleId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        <Trash2 className="inline w-3.5 h-3.5 text-red-500 mr-1" />
                        {testName(s.testType)} <span className="text-gray-400 font-normal">· {s.clientName || s.clientId}</span>
                      </p>
                      <p className="text-xs text-gray-500 break-all">
                        {s.clientId} · {cancerName(s.cancerType)}
                        {s.facility ? ` · ${s.facility}` : ""} · {s.status === "result_released" ? `Result: ${s.result ?? "—"}` : "Awaiting result"}
                      </p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">Reason:</span> {s.deleteReason || "—"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Deleted by {s.deletedBy ?? "unknown"} · {fmt(s.deletedAt)}
                      </p>
                    </div>
                    <Button layout="outline" size="small" className="rounded-xl" disabled={busyId === `s${s.sampleId}`} onClick={() => restore(s)}>
                      <span className="inline-flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Restore</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
