import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Input, Select, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, ScrollText, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

type Log = {
  logId: number;
  action: string;
  actionLabel: string;
  subjectType?: string | null;
  subjectId?: string | null;
  clientId?: string | null;
  description: string;
  details?: Record<string, any> | null;
  userName?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

// Tailwind classes kept in this file so they are always generated.
const ACTION_TONE: Record<string, string> = {
  client_id_changed: "bg-blue-100 text-blue-800",
  sample_deleted: "bg-red-100 text-red-700",
  sample_deletion_requested: "bg-amber-100 text-amber-800",
  sample_deletion_approved: "bg-red-100 text-red-700",
  sample_deletion_rejected: "bg-gray-100 text-gray-700",
  sample_restored: "bg-green-100 text-green-800",
};

const DETAIL_LABELS: Record<string, string> = {
  oldClientId: "Old Client ID",
  newClientId: "New Client ID",
  clientName: "Client",
  oldResidence: "Old residence",
  newResidence: "New residence",
  reason: "Reason",
  note: "Admin note",
  sample: "Sample / test",
  status: "Status at the time",
  result: "Result",
  requestId: "Request no.",
};

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const human = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v).replace(/_/g, " "));

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [actions, setActions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const perPage = 25;

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/activity-logs", {
        params: { page, perPage, action: action || undefined, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      });
      setLogs(data?.logs ?? []);
      setTotal(data?.total ?? 0);
      if (data?.actions) setActions(data.actions);
      setForbidden(false);
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
      else toast.error(friendlyError(err, "Could not load the activity log."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action, search, dateFrom, dateTo]);

  const applySearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setAction("");
    setSearchInput("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const Details = ({ log }: { log: Log }) => {
    const entries = Object.entries(log.details || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
    return (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-gray-500">{DETAIL_LABELS[k] ?? human(k)}</dt>
            <dd className="text-gray-800 dark:text-gray-100 break-words">{human(v)}</dd>
          </div>
        ))}
        {log.ipAddress && (
          <div>
            <dt className="text-xs text-gray-500">IP address</dt>
            <dd className="text-gray-800 dark:text-gray-100 font-mono text-xs">{log.ipAddress}</dd>
          </div>
        )}
      </dl>
    );
  };

  const ClientLink = ({ id }: { id?: string | null }) =>
    id ? (
      <Link href={`/ncsr/client-details?clientId=${id}`} className="font-mono text-xs text-green-700 hover:underline break-all">
        {id}
      </Link>
    ) : (
      <span className="text-gray-400">—</span>
    );

  return (
    <Layout>
      <PageTitle>Activity Log</PageTitle>
      <p className="text-sm text-gray-500 -mt-2 mb-4">
        Who changed what, and when: Client ID changes, deletions, deletion requests and restores.
      </p>

      {forbidden ? (
        <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
          <ScrollText className="w-9 h-9 mx-auto text-gray-400" />
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Only admins can view the activity log.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-3">
            <form onSubmit={applySearch} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  className="pl-10 h-11 rounded-2xl"
                  placeholder="Search Client ID, person or description"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <Button type="submit" className="h-11 px-5 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800">
                Search
              </Button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Select className="h-11 rounded-2xl" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
                <option value="">All activity</option>
                {actions.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </Select>
              <label className="text-xs text-gray-500">
                From
                <Input type="date" className="h-11 rounded-2xl" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
              </label>
              <label className="text-xs text-gray-500">
                To
                <Input type="date" className="h-11 rounded-2xl" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </label>
              <div className="flex items-end">
                <Button layout="outline" className="w-full h-11 rounded-2xl" onClick={clearFilters}>Clear filters</Button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
              <Inbox className="w-9 h-9 mx-auto text-gray-400" />
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">No activity found.</p>
            </div>
          )}

          {/* Mobile cards */}
          {!loading && logs.length > 0 && (
            <div className="space-y-3 lg:hidden">
              {logs.map((l) => (
                <div key={l.logId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${ACTION_TONE[l.action] ?? "bg-gray-100 text-gray-700"}`}>{l.actionLabel}</span>
                    <span className="text-xs text-gray-500">{fmtDateTime(l.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">{l.description}</p>
                  <p className="mt-1 text-xs text-gray-500">By {l.userName || "unknown user"}</p>
                  <div className="mt-1"><ClientLink id={l.clientId} /></div>
                  <button type="button" className="mt-2 text-xs font-semibold text-green-700 inline-flex items-center gap-1" onClick={() => setOpen(open === l.logId ? null : l.logId)}>
                    {open === l.logId ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Details
                  </button>
                  {open === l.logId && <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-900 p-3"><Details log={l} /></div>}
                </div>
              ))}
            </div>
          )}

          {/* Desktop table */}
          {!loading && logs.length > 0 && (
            <div className="hidden lg:block rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-5 py-3">Date &amp; time</th>
                    <th className="px-5 py-3">Activity</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">By</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {logs.map((l) => (
                    <React.Fragment key={l.logId}>
                      <tr className="align-top">
                        <td className="px-5 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmtDateTime(l.createdAt)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${ACTION_TONE[l.action] ?? "bg-gray-100 text-gray-700"}`}>{l.actionLabel}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-800 dark:text-gray-100">{l.description}</td>
                        <td className="px-5 py-3"><ClientLink id={l.clientId} /></td>
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{l.userName || "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" className="text-xs font-semibold text-green-700 inline-flex items-center gap-1" onClick={() => setOpen(open === l.logId ? null : l.logId)}>
                            {open === l.logId ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Details
                          </button>
                        </td>
                      </tr>
                      {open === l.logId && (
                        <tr>
                          <td colSpan={6} className="px-5 pb-4">
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4"><Details log={l} /></div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && total > perPage && (
            <div className="mt-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
              <Pagination totalResults={total} resultsPerPage={perPage} onChange={setPage} label="Activity log navigation" />
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
