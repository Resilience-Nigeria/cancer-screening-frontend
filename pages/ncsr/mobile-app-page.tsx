import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Smartphone, LifeBuoy, Bug, Package, Search, Loader2, LogOut, Trash2, X, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Rocket, Upload, Link2, Copy, Eye, EyeOff, ShieldAlert, Megaphone, Save,
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
type Tab = "versions" | "phones" | "tickets" | "errors" | "stock";
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

// ── App versions (new APKs) ───────────────────────────────────────────────
type Release = {
  id: number; version: string; versionCode: number; notes?: string | null; source: "upload" | "link"; apkUrl?: string | null; downloadUrl?: string | null;
  apkSize?: number | null; mandatory: boolean; published: boolean; publishedAt?: string | null; createdAt?: string | null; downloads: number; phones: number;
};
const mbs = (n?: number | null) => (n ? `${(n / 1048576).toFixed(1)} MB` : "");

function Versions() {
  const [data, setData] = useState<{ releases: Release[]; phonesByVersion: Record<string, number>; phonesBehind: number; latestLink: string; maxUploadMb: number } | null>(null);
  const [form, setForm] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [del, setDel] = useState<Release | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/mobile-admin/releases");
      setData(data);
    } catch (e) {
      toast.error(friendlyError(e));
      setData({ releases: [], phonesByVersion: {}, phonesBehind: 0, latestLink: "", maxUploadMb: 0 });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(r: Release, body: Partial<Pick<Release, "published" | "mandatory">>) {
    setBusyId(r.id);
    try {
      const { data } = await api.patch(`/mobile-admin/releases/${r.id}`, body);
      toast.success(data?.message ?? "Saved.");
      load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r: Release) {
    setBusyId(r.id);
    try {
      const { data } = await api.delete(`/mobile-admin/releases/${r.id}`);
      toast.success(data?.message ?? "Deleted.");
      setDel(null);
      load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  }

  const copy = (text: string, what = "Link") => {
    navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied.`), () => toast.error("Could not copy."));
  };

  if (!data) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div>;
  const live = data.releases.find((r) => r.published);
  const nextCode = (data.releases[0]?.versionCode ?? 0) + 1;
  const versions = Object.entries(data.phonesByVersion).sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className={`${card} p-4`}>
          <p className="text-xs text-gray-500">Live version</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{live ? live.version : "—"}</p>
          <p className="text-xs text-gray-500">{live ? `Build ${live.versionCode} · ${live.downloads} downloads` : "Nothing published yet"}</p>
        </div>
        <div className={`${card} p-4`}>
          <p className="text-xs text-gray-500">Phones on an older version (last 30 days)</p>
          <p className={`text-2xl font-bold ${data.phonesBehind ? "text-amber-600" : "text-gray-900 dark:text-white"}`}>{data.phonesBehind}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {versions.map(([v, c]) => <span key={v} className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{v || "?"}: {c}</span>)}
          </div>
        </div>
        <div className={`${card} p-4`}>
          <p className="text-xs text-gray-500">Link that always downloads the newest APK</p>
          <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all mt-1">{data.latestLink}</p>
          <button type="button" onClick={() => copy(data.latestLink)} className={`${btn} mt-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}><Copy className="w-4 h-4" /> Copy — share on WhatsApp / email</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
          Phones check this list when the app opens. When a newer version is published, staff see “New version available” and can download and install it from inside the app.
          Mark a version <b>mandatory</b> to make older phones update before they continue.
        </p>
        <button type="button" onClick={() => setForm(true)} className={`${btn} bg-green-700 hover:bg-green-800 text-white shrink-0`}><Upload className="w-4 h-4" /> Publish a new version</button>
      </div>

      {!data.releases.length ? <Empty text="No versions yet. Build the APK with EAS, then publish it here." /> : (
        <div className={`${card} overflow-hidden`}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.releases.map((r) => (
              <li key={r.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-gray-900 dark:text-white">{r.version}</span>
                    <span className="text-xs text-gray-500">build {r.versionCode}</span>
                    {r.published ? (live?.id === r.id ? <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-100 text-green-800">Live</span> : <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-50 text-green-700">Published</span>)
                      : <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Draft</span>}
                    {r.mandatory ? <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">Mandatory</span> : null}
                  </div>
                  {r.notes ? <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap line-clamp-3">{r.notes}</p> : null}
                  <p className="text-xs text-gray-500 mt-1">
                    {r.source === "upload" ? `Uploaded APK ${mbs(r.apkSize)}` : "Outside link"} · {r.downloads} downloads · {r.phones} phone(s) running it · {when(r.publishedAt || r.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.downloadUrl ? <button type="button" onClick={() => copy(r.downloadUrl!, "Download link")} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}><Link2 className="w-4 h-4" /> Link</button> : null}
                  <button type="button" disabled={busyId === r.id} onClick={() => patch(r, { published: !r.published })} className={`${btn} border ${r.published ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200" : "border-green-600 text-green-700"}`}>
                    {r.published ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Eye className="w-4 h-4" /> Publish</>}
                  </button>
                  <button type="button" disabled={busyId === r.id} onClick={() => patch(r, { mandatory: !r.mandatory })} className={`${btn} border ${r.mandatory ? "border-red-300 text-red-700" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>
                    <ShieldAlert className="w-4 h-4" /> {r.mandatory ? "Make optional" : "Make mandatory"}
                  </button>
                  <button type="button" title="Delete" onClick={() => setDel(r)} className={`${btn} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InstallPromptSettings />

      {form ? <ReleaseForm nextCode={nextCode} maxUploadMb={data.maxUploadMb} onClose={() => setForm(false)} onDone={() => { setForm(false); load(); }} /> : null}

      {del ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setDel(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete version {del.version}?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Phones stop being offered it{del.source === "upload" ? " and the uploaded APK is removed from the server" : ""}. Phones that already installed it are not affected.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button className={`${btn} border border-gray-300 dark:border-gray-600`} onClick={() => setDel(null)}>Cancel</button>
              <button className={`${btn} bg-red-600 hover:bg-red-700 text-white`} disabled={busyId === del.id} onClick={() => remove(del)}>{busyId === del.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── "Get the app" prompt on the web (phones / tablets) ───────────────────
type PromptCfg = { enabled: boolean; roles: string[] | null; message: string; iosUrl: string | null; snoozeDays: number };
const ROLE_LABEL: Record<string, string> = {
  NICRAT_SUPER_ADMIN: "Super admins", NICRAT_ADMIN: "NICRAT admins", HOSPITAL_ADMIN: "Hospital admins",
  NAVIGATOR: "Navigators", NURSE: "Nurses", DOCTOR: "Doctors", PARTNER: "Partners",
};

function InstallPromptSettings() {
  const [cfg, setCfg] = useState<PromptCfg | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/mobile-admin/app-promo")
      .then(({ data }) => {
        setCfg(data.settings);
        setRoles(data.roles ?? []);
        setSaved(JSON.stringify(data.settings));
      })
      .catch(() => setCfg(null));
  }, []);

  if (!cfg) return null;
  const dirty = JSON.stringify(cfg) !== saved;
  const everyone = !cfg.roles || cfg.roles.length === 0;
  const toggleRole = (r: string) => {
    const cur = cfg.roles ?? [];
    const next = cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r];
    setCfg({ ...cfg, roles: next.length ? next : null });
  };

  async function save(next: PromptCfg = cfg!) {
    setBusy(true);
    try {
      const { data } = await api.put("/mobile-admin/app-promo", { ...next, iosUrl: next.iosUrl || null, roles: next.roles?.length ? next.roles : null });
      setCfg(data.settings);
      setSaved(JSON.stringify(data.settings));
      toast.success(data?.message ?? "Saved.");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${card} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5 text-green-700" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900 dark:text-white">“Get the app” prompt on the web</h3>
            <button
              type="button"
              role="switch"
              aria-checked={cfg.enabled}
              disabled={busy}
              onClick={() => save({ ...cfg, enabled: !cfg.enabled })}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${cfg.enabled ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${cfg.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            When someone signs in to the NCSR web app on a phone or tablet, invite them to install the NCSR Mobile App (Android: newest APK above; iPhone/iPad: only once an App Store or TestFlight link is set below).
          </p>
        </div>
      </div>

      <div className={`mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 ${cfg.enabled ? "" : "opacity-60"}`}>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Who sees it</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCfg({ ...cfg, roles: null })} className={`px-3 py-1.5 rounded-full text-sm border ${everyone ? "bg-green-700 border-green-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>All staff</button>
            {roles.map((r) => {
              const on = !everyone && (cfg.roles ?? []).includes(r);
              return <button key={r} type="button" onClick={() => toggleRole(r)} className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-green-700 border-green-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>{ROLE_LABEL[r] ?? r}</button>;
            })}
          </div>
          <label className="block mt-4">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">“Not now” hides it for</span>
            <select value={cfg.snoozeDays} onChange={(e) => setCfg({ ...cfg, snoozeDays: Number(e.target.value) })} className="mt-1 block rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white">
              {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d === 1 ? "" : "s"}</option>)}
            </select>
          </label>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message</span>
            <textarea rows={3} maxLength={300} value={cfg.message} onChange={(e) => setCfg({ ...cfg, message: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-white" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">iPhone / iPad link (App Store or TestFlight)</span>
            <input value={cfg.iosUrl ?? ""} onChange={(e) => setCfg({ ...cfg, iosUrl: e.target.value })} placeholder="Leave empty until the iPhone version is available" className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
          </label>
        </div>
      </div>
      {dirty ? (
        <div className="mt-4 flex justify-end">
          <button type="button" disabled={busy} onClick={() => save()} className={`${btn} bg-green-700 hover:bg-green-800 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes</button>
        </div>
      ) : null}
    </div>
  );
}

function ReleaseForm({ nextCode, maxUploadMb, onClose, onDone }: { nextCode: number; maxUploadMb: number; onClose: () => void; onDone: () => void }) {
  const [version, setVersion] = useState("");
  const [code, setCode] = useState(String(nextCode));
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [publish, setPublish] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const tooBig = !!(file && maxUploadMb && file.size > maxUploadMb * 1048576);
  const ok = /^\d+(\.\d+){0,3}$/.test(version.trim()) && Number(code) > 0 && (source === "upload" ? !!file && !tooBig : /^https?:\/\//.test(link.trim()));
  const input = "mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white";

  async function save() {
    const fd = new FormData();
    fd.append("version", version.trim());
    fd.append("versionCode", String(Number(code)));
    if (notes.trim()) fd.append("notes", notes.trim());
    fd.append("mandatory", mandatory ? "1" : "0");
    fd.append("publish", publish ? "1" : "0");
    if (source === "upload" && file) fd.append("apk", file);
    else fd.append("apkUrl", link.trim());
    setProgress(0);
    try {
      const { data } = await api.post("/mobile-admin/releases", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e: any) => e.total && setProgress(e.loaded / e.total),
      });
      toast.success(data?.message ?? "Saved.");
      onDone();
    } catch (e) {
      toast.error(friendlyError(e, "Could not save the version."));
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => !busy && onClose()}>
      <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Publish a new version</h3>
            <p className="text-xs text-gray-500 mt-0.5">Use the version and build number from app.json (<code>version</code> and <code>android.versionCode</code>) of the APK you built.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="p-2 -m-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Version</span><input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 1.1.0" className={input} /></label>
          <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Build number</span><input type="number" min={1} value={code} onChange={(e) => setCode(e.target.value)} className={input} /></label>
          <label className="block col-span-2"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">What&apos;s new (shown on the phone)</span>
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"• Stock tracking for kits\n• Chat with staff at other facilities"} className={input} />
          </label>
        </div>

        <div className="mt-4 inline-flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
          {([["upload", "Upload the APK"], ["link", "Paste a link"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setSource(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${source === k ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>{l}</button>
          ))}
        </div>
        {source === "upload" ? (
          <div className="mt-3">
            <input type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-xl file:border-0 file:bg-green-50 file:px-4 file:py-2 file:font-semibold file:text-green-800" />
            <p className={`text-xs mt-1 ${tooBig ? "text-red-600" : "text-gray-500"}`}>
              {file ? `${file.name} · ${mbs(file.size)}. ` : ""}
              {maxUploadMb ? `The server accepts up to ${maxUploadMb} MB.` : ""}
              {tooBig ? " Raise upload_max_filesize / post_max_size (and nginx client_max_body_size), or paste a link instead." : " Recommended: phones download straight from your server."}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/file/d/…/view" className={input} />
            <p className="text-xs text-gray-500 mt-1">Google Drive: share the file as “Anyone with the link”. The link is converted to a direct download. Very large files (over ~100 MB) may not download in the app from Drive.</p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            <span><span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">Publish now</span><span className="block text-xs text-gray-500">Phones are offered it the next time the app opens. Untick to save it as a draft.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
            <span><span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">Mandatory</span><span className="block text-xs text-gray-500">Older phones must install it before they can carry on (only while online — staff working offline are never blocked).</span></span>
          </label>
        </div>

        {busy ? (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-green-600" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} /></div>
            <p className="text-xs text-gray-500 mt-1">{(progress ?? 0) < 1 ? `Uploading… ${Math.round((progress ?? 0) * 100)}%` : "Saving…"}</p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>Cancel</button>
          <button type="button" onClick={save} disabled={!ok || busy} className={`${btn} bg-green-700 hover:bg-green-800 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} {publish ? "Publish" : "Save draft"}</button>
        </div>
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "versions", label: "App versions", icon: Rocket },
  { key: "phones", label: "Phones", icon: Smartphone },
  { key: "tickets", label: "Problem reports", icon: LifeBuoy },
  { key: "errors", label: "Crash reports", icon: Bug },
  { key: "stock", label: "Stock", icon: Package },
];

export default function MobileAppPage() {
  const [tab, setTab] = useState<Tab>("versions");
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
        {tab === "versions" ? <Versions /> : tab === "phones" ? <Phones /> : tab === "tickets" ? <Tickets /> : tab === "errors" ? <Errors /> : <Stock />}
      </div>
    </Layout>
  );
}
