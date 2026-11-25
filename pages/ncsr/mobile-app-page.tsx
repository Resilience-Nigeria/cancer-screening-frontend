import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Smartphone, LifeBuoy, Bug, Package, Search, Loader2, LogOut, Trash2, X, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

/**
 * NCSR Mobile App admin:
 *  - Phones: every phone signed in to the app, with "Sign out this phone" / "Wipe its data" for lost or stolen phones;
 *  - Problem reports: sent from the app's "Report a problem" (with the phone's sync log);
 *  - Crash reports: app errors grouped by error;
 *  - Stock: facilities low on / out of screening kits.
 */
type Tab = "phones" | "tickets" | "errors" | "stock";
type Device = {
  id: number; deviceId: string; userName?: string | null; userEmail?: string | null; facility?: string | null; platform?: string | null;
  model?: string | null; appVersion?: string | null; updateId?: string | null; pendingRecords: number; lastSeenAt?: string | null; lastIp?: string | null;
  status: "active" | "sign_out_pending" | "wipe_pending" | "wiped"; signedOutAt?: string | null; wipedAt?: string | null;
};
type Ticket = {
  id: number; category: string; message: string; status: string; adminNote?: string | null; created_at?: string; resolvedAt?: string | null;
  userName?: string | null; userEmail?: string | null; userPhone?: string | null; facility?: string | null; device?: any; syncLog?: any[] | null;
};
type ErrGroup = {
  fingerprint: string; message: string; stack?: string | null; screen?: string | null; fatal: boolean; count: number; users: number; devices: number;
  versions: string[]; lastSeen?: string | null; firstSeen?: string | null;
};
type StockRow = { facilityId: number; facilityName: string; facilityState?: string | null; out: string[]; low: string[] };

const when = (v?: string | null) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const ago = (v?: string | null) => {
  if (!v) return "never";
  const m = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
};
const CAT: Record<string, string> = {
  sync: "Syncing", login: "Signing in", form: "Form / screen", results: "Samples & results", stock: "Stock", chat: "Chat / notifications", bug: "Crash / freeze", other: "Other",
};
const STATUS: Record<Device["status"], [string, string]> = {
  active: ["Active", "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"],
  sign_out_pending: ["Sign-out pending", "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"],
  wipe_pending: ["Wipe pending", "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"],
  wiped: ["Wiped", "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"],
};

const card = "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-50";

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 w-full sm:max-w-sm">
      <Search className="w-4 h-4 text-gray-400 shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 dark:text-white" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className={`${card} border-dashed p-10 text-center text-sm text-gray-500`}>{text}</div>;
}

// ── Phones ────────────────────────────────────────────────────────────────
function Phones() {
  const [rows, setRows] = useState<Device[] | null>(null);
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ d: Device; action: "sign-out" | "wipe" } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/mobile-admin/devices");
      setRows(data?.devices ?? []);
    } catch (e) {
      toast.error(friendlyError(e));
      setRows([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((d) => !t || `${d.userName} ${d.userEmail} ${d.model} ${d.facility}`.toLowerCase().includes(t));
  }, [rows, q]);

  async function act(d: Device, action: "sign-out" | "wipe" | "cancel") {
    setBusy(true);
    try {
      const { data } = await api.post(`/mobile-admin/devices/${d.id}/${action}`);
      toast.success(data?.message ?? "Done");
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!rows) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <SearchBox value={q} onChange={setQ} placeholder="Search staff, facility or phone model" />
        <p className="text-xs text-gray-500">{rows.length} phone(s). A phone checks in every 15 minutes while the app is open.</p>
      </div>
      {!shown.length ? <Empty text="No phones yet. Phones appear here after staff sign in to the NCSR Mobile App." /> : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/40 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Staff</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3">Unsynced</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {shown.map((d) => (
                  <tr key={d.id} className="text-gray-800 dark:text-gray-200">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{d.userName || "—"}</div>
                      <div className="text-xs text-gray-500">{d.userEmail}{d.facility ? ` · ${d.facility}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{d.model || d.platform || "Unknown"}</div>
                      <div className="text-xs text-gray-500">v{d.appVersion ?? "?"}{d.updateId ? ` · update ${d.updateId.slice(0, 8)}` : ""}</div>
                    </td>
                    <td className="px-4 py-3" title={when(d.lastSeenAt)}>{ago(d.lastSeenAt)}</td>
                    <td className="px-4 py-3">{d.pendingRecords > 0 ? <span className="font-semibold text-amber-700">{d.pendingRecords}</span> : "0"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[d.status][1]}`}>{STATUS[d.status][0]}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {d.status === "active" ? (
                          <>
                            <button className={`${btn} border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700`} onClick={() => setConfirm({ d, action: "sign-out" })}><LogOut className="w-4 h-4" />Sign out</button>
                            <button className={`${btn} bg-red-600 hover:bg-red-700 text-white`} onClick={() => setConfirm({ d, action: "wipe" })}><Trash2 className="w-4 h-4" />Wipe</button>
                          </>
                        ) : d.status !== "wiped" ? (
                          <button className={`${btn} border border-gray-300 dark:border-gray-600`} disabled={busy} onClick={() => act(d, "cancel")}><X className="w-4 h-4" />Cancel request</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${confirm.action === "wipe" ? "bg-red-100" : "bg-amber-100"}`}>
                {confirm.action === "wipe" ? <Trash2 className="w-5 h-5 text-red-700" /> : <LogOut className="w-5 h-5 text-amber-700" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{confirm.action === "wipe" ? "Wipe this phone's NCSR data?" : "Sign out this phone?"}</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {confirm.d.userName}'s {confirm.d.model || "phone"} — last seen {ago(confirm.d.lastSeenAt)}.
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {confirm.action === "wipe"
                ? "Everything the NCSR app keeps on the phone is erased the next time it connects — including records not yet synced"
                : "The person is signed out the next time the phone connects. Records not yet synced stay on the phone and are sent after they sign in again."}
              {confirm.action === "wipe" && confirm.d.pendingRecords > 0 ? <b className="text-red-700"> ({confirm.d.pendingRecords} unsynced record(s) will be lost)</b> : null}
              {confirm.action === "wipe" ? ". If the phone was lost or stolen, also reset the user's password." : null}
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button className={`${btn} border border-gray-300 dark:border-gray-600`} onClick={() => setConfirm(null)}>Cancel</button>
              <button className={`${btn} text-white ${confirm.action === "wipe" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`} disabled={busy} onClick={() => act(confirm.d, confirm.action)}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{confirm.action === "wipe" ? "Wipe data" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Problem reports ───────────────────────────────────────────────────────
function Tickets() {
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const { data } = await api.get("/mobile-admin/tickets", { params: { status } });
      setRows(data?.tickets ?? []);
    } catch (e) {
      toast.error(friendlyError(e));
      setRows([]);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function resolve(t: Ticket) {
    setBusy(true);
    try {
      await api.post(`/mobile-admin/tickets/${t.id}/resolve`, { note });
      toast.success("Marked resolved — the staff member was notified.");
      setNote("");
      setOpen(null);
      load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["open", "resolved", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-sm border capitalize ${status === s ? "bg-green-700 border-green-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>{s}</button>
        ))}
      </div>
      {!rows ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div> : !rows.length ? <Empty text="No problem reports here." /> : rows.map((t) => {
        const expanded = open === t.id;
        const log = Array.isArray(t.syncLog) ? t.syncLog : [];
        return (
          <div key={t.id} className={`${card} p-4`}>
            <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(expanded ? null : t.id)}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.status === "open" ? "bg-amber-100" : "bg-green-100"}`}>
                {t.status === "open" ? <LifeBuoy className="w-5 h-5 text-amber-700" /> : <CheckCircle2 className="w-5 h-5 text-green-700" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{CAT[t.category] ?? t.category}</span>
                  <span className="text-xs text-gray-500">#{t.id} · {when(t.created_at)}</span>
                </div>
                <p className={`text-sm text-gray-700 dark:text-gray-300 mt-1 ${expanded ? "" : "line-clamp-2"}`}>{t.message}</p>
                <p className="text-xs text-gray-500 mt-1">{t.userName}{t.facility ? ` · ${t.facility}` : ""}{t.userPhone ? ` · ${t.userPhone}` : ""}</p>
              </div>
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expanded ? (
              <div className="mt-4 space-y-3 sm:pl-12">
                {t.device ? (
                  <div className="text-xs text-gray-600 dark:text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <span>Phone: {t.device.model ?? "—"} ({t.device.os ?? t.device.platform})</span>
                    <span>App: v{t.device.appVersion ?? "?"}{t.device.channel ? ` · ${t.device.channel}` : ""}</span>
                    <span>Waiting: {t.device.pending ?? 0} · failed: {t.device.failed ?? 0}</span>
                    <span>Last sync: {when(t.device.lastSyncedAt)}</span>
                  </div>
                ) : null}
                {log.length ? (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 max-h-64 overflow-auto">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Sync log ({log.length})</p>
                    {log.map((l: any, i: number) => (
                      <div key={i} className="text-xs font-mono text-gray-700 dark:text-gray-300 py-0.5">
                        <span className={l.status === "failed" ? "text-red-600" : "text-gray-500"}>[{l.status}]</span> {l.label} — {String(l.method).toUpperCase()} {l.path}
                        {l.attempts ? ` · ${l.attempts} tries` : ""}{l.error ? <span className="text-red-600"> · {l.error}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {t.status === "open" ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reply to the staff member (optional)" className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white" />
                    <button className={`${btn} bg-green-700 hover:bg-green-800 text-white justify-center`} disabled={busy} onClick={() => resolve(t)}><CheckCircle2 className="w-4 h-4" />Mark resolved</button>
                  </div>
                ) : t.adminNote ? <p className="text-sm text-green-800 dark:text-green-300">Reply: {t.adminNote}</p> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Crash reports ─────────────────────────────────────────────────────────
function Errors() {
  const [days, setDays] = useState(14);
  const [rows, setRows] = useState<ErrGroup[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    setRows(null);
    api.get("/mobile-admin/errors", { params: { days } }).then(({ data }) => setRows(data?.errors ?? [])).catch((e) => { toast.error(friendlyError(e)); setRows([]); });
  }, [days]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[1, 7, 14, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-full text-sm border ${days === d ? "bg-green-700 border-green-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>{d === 1 ? "24 h" : `${d} days`}</button>
        ))}
      </div>
      {!rows ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div> : !rows.length ? <Empty text="No app errors in this period. 🎉" /> : rows.map((e) => (
        <div key={e.fingerprint} className={`${card} p-4`}>
          <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(open === e.fingerprint ? null : e.fingerprint)}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${e.fatal ? "bg-red-100" : "bg-amber-100"}`}>
              {e.fatal ? <Bug className="w-5 h-5 text-red-700" /> : <AlertTriangle className="w-5 h-5 text-amber-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white break-words">{e.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {e.count}× · {e.users} staff · {e.devices} phone(s){e.screen ? ` · screen ${e.screen}` : ""} · v{e.versions.join(", ") || "?"} · last {ago(e.lastSeen)}
                {e.fatal ? <span className="text-red-600 font-semibold"> · crashed a screen</span> : null}
              </p>
            </div>
          </button>
          {open === e.fingerprint && e.stack ? <pre className="mt-3 text-xs bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 overflow-auto max-h-72 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{e.stack}</pre> : null}
        </div>
      ))}
    </div>
  );
}

// ── Stock ─────────────────────────────────────────────────────────────────
function Stock() {
  const [rows, setRows] = useState<StockRow[] | null>(null);
  const [q, setQ] = useState("");
  const [onlyProblems, setOnlyProblems] = useState(true);
  useEffect(() => {
    api.get("/stock/overview").then(({ data }) => setRows(data?.facilities ?? [])).catch((e) => { toast.error(friendlyError(e)); setRows([]); });
  }, []);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (!onlyProblems || r.out.length || r.low.length) && (!t || `${r.facilityName} ${r.facilityState}`.toLowerCase().includes(t)));
  }, [rows, q, onlyProblems]);
  const outCount = (rows ?? []).filter((r) => r.out.length).length;
  const lowCount = (rows ?? []).filter((r) => !r.out.length && r.low.length).length;
  if (!rows) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${card} p-4`}><p className="text-xs text-gray-500">Facilities tracking stock</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{rows.length}</p></div>
        <div className={`${card} p-4`}><p className="text-xs text-gray-500">With a kit out of stock</p><p className="text-2xl font-bold text-red-600">{outCount}</p></div>
        <div className={`${card} p-4`}><p className="text-xs text-gray-500">Running low</p><p className="text-2xl font-bold text-amber-600">{lowCount}</p></div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <SearchBox value={q} onChange={setQ} placeholder="Search facility or state" />
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} /> Only facilities low or out
        </label>
      </div>
      {!shown.length ? <Empty text={onlyProblems ? "No facility is low on stock." : "No facility has recorded stock yet."} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {shown.map((r) => (
            <div key={r.facilityId} className={`${card} p-4`}>
              <p className="font-semibold text-gray-900 dark:text-white">{r.facilityName}</p>
              <p className="text-xs text-gray-500">{r.facilityState ?? ""}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.out.map((n) => <span key={n} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Out: {n}</span>)}
                {r.low.map((n) => <span key={n} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Low: {n}</span>)}
                {!r.out.length && !r.low.length ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">All OK</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "phones", label: "Phones", icon: Smartphone },
  { key: "tickets", label: "Problem reports", icon: LifeBuoy },
  { key: "errors", label: "Crash reports", icon: Bug },
  { key: "stock", label: "Stock", icon: Package },
];

export default function MobileAppPage() {
  const [tab, setTab] = useState<Tab>("phones");
  const [k, setK] = useState(0);
  return (
    <Layout>
      <PageTitle>NCSR Mobile App</PageTitle>
      <div className="flex items-center justify-between gap-2 mb-4 -mt-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">Phones, problem reports, crashes and kit stock from the navigators' and nurses' app.</p>
        <button className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 shrink-0`} onClick={() => setK(k + 1)}><RefreshCw className="w-4 h-4" /><span className="hidden sm:inline">Refresh</span></button>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-4 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === t.key ? "border-green-700 text-green-800 dark:text-green-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>
      <div key={`${tab}-${k}`} className="pb-10">
        {tab === "phones" ? <Phones /> : tab === "tickets" ? <Tickets /> : tab === "errors" ? <Errors /> : <Stock />}
      </div>
    </Layout>
  );
}
