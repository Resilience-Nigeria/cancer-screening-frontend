import React, { useEffect, useMemo, useState } from "react";
import {
  Bell, BellRing, Send, Loader2, Users, Building2, UserRound, Globe, Search, CheckSquare, Square, Smartphone, ShieldAlert, X, Eye,
  Pencil, RotateCw, Trash2, CheckCircle2, Clock, History,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

type RoleOpt = { roleName: string; roleLabel: string };
type FacilityOpt = { facilityId: number; facilityName: string; facilityState?: string | null };
type UserOpt = { id: number; name: string; email?: string | null; facility?: string | null; phones: number };
type Broadcast = {
  id: number; title: string; body: string; route?: string | null; audienceText?: string | null; push: boolean;
  recipients: number; phones: number; read: number; unread?: number; sentBy?: string | null; sentAt?: string | null;
  editedAt?: string | null; editedBy?: string | null; resendCount?: number; lastResentAt?: string | null; lastResentBy?: string | null;
  withdrawnAt?: string | null;
};
type Recipient = { userId: number; name: string; email?: string | null; facility?: string | null; readAt?: string | null; deliveredAt?: string | null; hasApp: boolean };
type Mode = "all" | "roles" | "facilities" | "people";

const ROUTE_LABEL: Record<string, string> = {
  "/notifications": "Notifications list",
  "/": "Home",
  "/clients": "Clients",
  "/tests": "Samples",
  "/referrals": "Referrals",
  "/collect-sample": "Collect a sample",
  "/deletion-requests": "Deletion requests (admins)",
  "/sync": "Sync",
  "/profile": "My profile",
  "/follow-ups": "Follow-ups & recalls",
  "/stock": "Stock",
  "/chats": "Staff & chat",
  "/help": "Help & training",
};

const when = (v?: string | null) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** Small searchable checkbox list (facilities / people). */
function PickList<T>({
  items, chosen, onToggle, label, keyOf, render, placeholder,
}: {
  items: T[]; chosen: number[]; onToggle: (id: number) => void; label: (t: T) => string; keyOf: (t: T) => number;
  render: (t: T) => React.ReactNode; placeholder: string;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? items.filter((i) => label(i).toLowerCase().includes(t)) : items).slice(0, 300);
  }, [q, items, label]);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 dark:text-white" />
        <span className="text-xs text-gray-500 shrink-0">{chosen.length} chosen</span>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {shown.map((i) => {
          const id = keyOf(i);
          const on = chosen.includes(id);
          return (
            <button key={id} type="button" onClick={() => onToggle(id)} className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {on ? <CheckSquare className="w-4 h-4 mt-0.5 text-green-700 shrink-0" /> : <Square className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />}
              <span className="min-w-0 flex-1">{render(i)}</span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="p-3 text-sm text-gray-500">Nothing matches.</p>}
      </div>
    </div>
  );
}

/**
 * Staff Notifications — send a message from the dashboard to staff using the NCSR Mobile App.
 * It appears in the app's notification bell and, if ticked, as a phone notification (lock screen).
 * Super Admins and NICRAT Admins only.
 */
export default function StaffNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [roles, setRoles] = useState<RoleOpt[]>([]);
  const [facilities, setFacilities] = useState<FacilityOpt[]>([]);
  const [people, setPeople] = useState<UserOpt[]>([]);
  const [listKey, setListKey] = useState(0);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [route, setRoute] = useState("/notifications");
  const [push, setPush] = useState(true);
  const [mode, setMode] = useState<Mode>("all");
  const [chosenRoles, setChosenRoles] = useState<string[]>([]);
  const [chosenFacilities, setChosenFacilities] = useState<number[]>([]);
  const [chosenPeople, setChosenPeople] = useState<number[]>([]);
  const [preview, setPreview] = useState<{ recipients: number; phones: number; withApp: number; audienceText: string; sample: string[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const audience = useMemo(
    () => ({
      roles: mode === "roles" || (mode === "facilities" && chosenRoles.length) ? chosenRoles : [],
      facilityIds: mode === "facilities" ? chosenFacilities : [],
      userIds: mode === "people" ? chosenPeople : [],
    }),
    [mode, chosenRoles, chosenFacilities, chosenPeople]
  );

  async function loadAll() {
    try {
      const o = await api.get("/staff-notifications/options");
      setRoles(o.data?.roles ?? []);
      setFacilities(o.data?.facilities ?? []);
      setPeople(o.data?.users ?? []);
    } catch (e: any) {
      if (e?.response?.status === 403) setForbidden(true);
      else toast.error(friendlyError(e, "Could not load staff notifications."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Live count of who it would reach.
  useEffect(() => {
    if (loading || forbidden) return;
    const empty = (mode === "roles" && !chosenRoles.length) || (mode === "facilities" && !chosenFacilities.length) || (mode === "people" && !chosenPeople.length);
    if (empty) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data } = await api.post("/staff-notifications/preview", { audience });
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [audience, loading, forbidden, mode, chosenRoles.length, chosenFacilities.length, chosenPeople.length]);

  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function send() {
    setSending(true);
    try {
      const { data } = await api.post("/staff-notifications", { title: title.trim(), body: body.trim(), route, push, audience });
      toast.success(data?.message ?? "Sent.");
      setConfirm(false);
      setTitle("");
      setBody("");
      setListKey((k) => k + 1);
    } catch (e) {
      toast.error(friendlyError(e, "Could not send the notification."));
    } finally {
      setSending(false);
    }
  }

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !!preview?.recipients;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      </Layout>
    );
  }

  if (forbidden) {
    return (
      <Layout>
        <PageTitle>Staff Notifications</PageTitle>
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-10 text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-200">Only Super Admins and NICRAT Admins can send staff notifications.</p>
        </div>
      </Layout>
    );
  }

  const MODES: { key: Mode; label: string; icon: any; hint: string }[] = [
    { key: "all", label: "All staff", icon: Globe, hint: "Everyone with an NCSR account" },
    { key: "roles", label: "Roles", icon: Users, hint: "e.g. all Nurses and Navigators" },
    { key: "facilities", label: "Facilities", icon: Building2, hint: "Staff of chosen facilities (optionally by role)" },
    { key: "people", label: "People", icon: UserRound, hint: "Named staff members" },
  ];

  return (
    <Layout>
      <PageTitle>Staff Notifications</PageTitle>
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        Send a message to staff using the NCSR Mobile App. It appears in the app&apos;s notification bell and, if you tick it, on their phone&apos;s
        lock screen. Referrals and deletion requests are also notified automatically.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Compose ───────────────────────────────────────────── */}
        <section className="xl:col-span-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 shrink-0">
              <BellRing className="w-5 h-5 text-green-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New notification</h2>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</span>
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HPV kits delivered" className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-white" />
            <span className="block text-right text-xs text-gray-400 mt-1">{title.length}/120</span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message</span>
            <textarea value={body} maxLength={2000} rows={4} onChange={(e) => setBody(e.target.value)} placeholder="What do staff need to know or do?" className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-white" />
          </label>

          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Send to</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const on = mode === m.key;
                return (
                  <button key={m.key} type="button" onClick={() => setMode(m.key)} className={`text-left rounded-xl border p-3 transition ${on ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}>
                    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${on ? "text-green-800 dark:text-green-300" : "text-gray-800 dark:text-gray-100"}`}><Icon className="w-4 h-4" /> {m.label}</span>
                    <span className="block text-xs text-gray-500 mt-1">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {(mode === "roles" || mode === "facilities") && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{mode === "facilities" ? "Only these roles (optional)" : "Roles"}</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => {
                  const on = chosenRoles.includes(r.roleName);
                  return (
                    <button key={r.roleName} type="button" onClick={() => toggle(chosenRoles, setChosenRoles, r.roleName)} className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-green-700 border-green-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}>
                      {r.roleLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === "facilities" && (
            <PickList
              items={facilities}
              chosen={chosenFacilities}
              onToggle={(id) => toggle(chosenFacilities, setChosenFacilities, id)}
              keyOf={(f) => Number(f.facilityId)}
              label={(f) => `${f.facilityName} ${f.facilityState ?? ""}`}
              placeholder="Search facilities"
              render={(f) => (
                <>
                  <span className="text-gray-800 dark:text-gray-100">{f.facilityName}</span>
                  {f.facilityState && <span className="text-xs text-gray-400"> · {f.facilityState}</span>}
                </>
              )}
            />
          )}

          {mode === "people" && (
            <PickList
              items={people}
              chosen={chosenPeople}
              onToggle={(id) => toggle(chosenPeople, setChosenPeople, id)}
              keyOf={(u) => u.id}
              label={(u) => `${u.name} ${u.email ?? ""} ${u.facility ?? ""}`}
              placeholder="Search staff by name, email or facility"
              render={(u) => (
                <>
                  <span className="text-gray-800 dark:text-gray-100">{u.name}</span>
                  {u.phones > 0 && <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-green-700"><Smartphone className="w-3 h-3" /> app</span>}
                  <span className="block text-xs text-gray-500">{[u.email, u.facility].filter(Boolean).join(" · ")}</span>
                </>
              )}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">When tapped, open</span>
              <select value={route} onChange={(e) => setRoute(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-white">
                {Object.entries(ROUTE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer select-none">
              <input type="checkbox" className="mt-1" checked={push} onChange={(e) => setPush(e.target.checked)} />
              <span>
                <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">Also send as a phone notification</span>
                <span className="block text-xs text-gray-500">Shows on the lock screen. Untick to only add it to the app&apos;s bell.</span>
              </span>
            </label>
          </div>

          <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
            {previewing ? <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-green-600" /> : <Users className="w-4 h-4 mt-0.5 text-gray-400" />}
            <span>
              {preview ? (
                <>
                  <b>{preview.audienceText}</b>: {preview.recipients} {preview.recipients === 1 ? "person" : "people"}
                  {push ? <> · {preview.phones} {preview.phones === 1 ? "phone" : "phones"} ({preview.withApp} with the app)</> : null}
                  {preview.sample?.length ? <span className="block text-xs text-gray-500 mt-1">e.g. {preview.sample.join(", ")}{preview.recipients > preview.sample.length ? "…" : ""}</span> : null}
                </>
              ) : (
                "Choose who should get it."
              )}
            </span>
          </div>

          <div className="flex justify-end">
            <button type="button" disabled={!canSend} onClick={() => setConfirm(true)} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" /> Send notification
            </button>
          </div>
        </section>

        {/* ── Phone preview ─────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">
          <section className="rounded-2xl bg-gray-900 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">How it looks on the phone</p>
            <div className="rounded-2xl bg-white/95 p-3 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-700 flex items-center justify-center shrink-0"><Bell className="w-5 h-5 text-white" /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">NCSR Mobile · now</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{title || "Title"}</p>
                <p className="text-sm text-gray-700 line-clamp-3 break-words">{body || "Your message"}</p>
              </div>
            </div>
          </section>

        </div>
      </div>

      <SentNotifications refreshKey={listKey} />

      {confirm && preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={() => !sending && setConfirm(false)}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send this notification?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <b>{title}</b> goes to {preview.recipients} {preview.recipients === 1 ? "person" : "people"} ({preview.audienceText})
              {push ? ` and ${preview.phones} ${preview.phones === 1 ? "phone" : "phones"}` : ", in the app only"}. It can&apos;t be unsent.
            </p>
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={() => setConfirm(false)} disabled={sending} className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200">Cancel</button>
              <button type="button" onClick={send} disabled={sending} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sent notifications: list, details (who read it), edit, resend, withdraw.
// ─────────────────────────────────────────────────────────────────────────────
const fieldCls = "mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-white";
const btnCls = "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 p-5 sm:p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ReadBar({ read, total }: { read: number; total: number }) {
  const pct = total ? Math.round((read / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className="h-full bg-green-600 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{read}/{total} read</span>
    </div>
  );
}

function SentNotifications({ refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = useState<"active" | "withdrawn">("active");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Broadcast[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<Broadcast | null>(null);
  const [edit, setEdit] = useState<Broadcast | null>(null);
  const [resend, setResend] = useState<{ b: Broadcast; title?: string; body?: string; route?: string } | null>(null);
  const [withdraw, setWithdraw] = useState<Broadcast | null>(null);

  async function load(p = 1) {
    setLoading(true);
    try {
      const { data } = await api.get("/staff-notifications", { params: { status, search: q.trim() || undefined, page: p } });
      const list: Broadcast[] = data?.broadcasts ?? [];
      setRows((prev) => (p === 1 ? list : [...prev, ...list]));
      setPage(Number(data?.current_page ?? p));
      setLastPage(Number(data?.last_page ?? 1));
      setTotal(Number(data?.total ?? list.length));
    } catch (e) {
      toast.error(friendlyError(e, "Could not load sent notifications."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, refreshKey]);

  const refresh = () => {
    load(1);
    setView(null);
  };

  return (
    <section className="mt-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 shrink-0"><History className="w-5 h-5 text-gray-600 dark:text-gray-300" /></div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Sent notifications</h2>
            <p className="text-xs text-gray-500">{total} {status === "withdrawn" ? "withdrawn" : "sent"} · open one to see who read it, edit, resend or withdraw it</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
            {(["active", "withdrawn"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${status === s ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>
                {s === "active" ? "Sent" : "Withdrawn"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2 sm:w-72">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, message or audience" className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 dark:text-white" />
            {q ? <button type="button" onClick={() => setQ("")} aria-label="Clear"><X className="w-4 h-4 text-gray-400" /></button> : null}
          </div>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
      ) : !rows.length ? (
        <p className="p-8 text-center text-sm text-gray-500">{q ? "No notification matches your search." : status === "withdrawn" ? "Nothing withdrawn." : "Nothing sent yet."}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((b) => (
            <li key={b.id} className="p-4 sm:px-5 flex flex-col md:flex-row md:items-center gap-3">
              <button type="button" onClick={() => setView(b)} className="flex-1 min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white break-words">{b.title}</p>
                  {b.editedAt ? <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Edited</span> : null}
                  {b.resendCount ? <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Resent {b.resendCount}×</span> : null}
                  {!b.push ? <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Bell only</span> : null}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1 break-words mt-0.5">{b.body}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {b.audienceText} · {when(b.lastResentAt || b.sentAt)}{b.sentBy ? ` · ${b.sentBy}` : ""}
                </p>
              </button>
              <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                {status === "active" ? <ReadBar read={b.read} total={b.recipients} /> : <span className="text-xs text-gray-500">Withdrawn {when(b.withdrawnAt)}</span>}
                <div className="flex gap-1.5">
                  {status === "active" ? (
                    <button type="button" title="Edit" onClick={() => setEdit(b)} className={`${btnCls} border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700`}><Pencil className="w-4 h-4" /><span className="hidden sm:inline">Edit</span></button>
                  ) : null}
                  <button type="button" title="Resend" onClick={() => setResend({ b })} className={`${btnCls} border border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20`}><RotateCw className="w-4 h-4" /><span className="hidden sm:inline">Resend</span></button>
                  {status === "active" ? (
                    <button type="button" title="Withdraw" onClick={() => setWithdraw(b)} className={`${btnCls} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}><Trash2 className="w-4 h-4" /></button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {page < lastPage ? (
        <div className="p-4 flex justify-center border-t border-gray-100 dark:border-gray-700">
          <button type="button" disabled={loading} onClick={() => load(page + 1)} className={`${btnCls} border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Load more
          </button>
        </div>
      ) : null}

      {view ? (
        <DetailModal
          b={view}
          onClose={() => setView(null)}
          onEdit={() => { setEdit(view); setView(null); }}
          onResend={() => { setResend({ b: view }); setView(null); }}
          onWithdraw={() => { setWithdraw(view); setView(null); }}
        />
      ) : null}
      {edit ? <EditModal b={edit} onClose={() => setEdit(null)} onSaved={refresh} onSaveAndResend={(v) => { setEdit(null); setResend({ b: edit, ...v }); }} /> : null}
      {resend ? <ResendModal {...resend} onClose={() => setResend(null)} onDone={() => { setResend(null); refresh(); }} /> : null}
      {withdraw ? <WithdrawModal b={withdraw} onClose={() => setWithdraw(null)} onDone={() => { setWithdraw(null); refresh(); }} /> : null}
    </section>
  );
}

function DetailModal({ b, onClose, onEdit, onResend, onWithdraw }: { b: Broadcast; onClose: () => void; onEdit: () => void; onResend: () => void; onWithdraw: () => void }) {
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [list, setList] = useState<Recipient[] | null>(null);
  const [q, setQ] = useState("");
  const withdrawn = !!b.withdrawnAt;
  useEffect(() => {
    if (withdrawn) return setList([]);
    setList(null);
    api.get(`/staff-notifications/${b.id}/recipients`, { params: { filter } })
      .then(({ data }) => setList(data?.recipients ?? []))
      .catch(() => setList([]));
  }, [b.id, filter, withdrawn]);
  const shown = (list ?? []).filter((r) => !q.trim() || `${r.name} ${r.email} ${r.facility}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">{b.title}</h3>
        <button type="button" onClick={onClose} className="p-2 -m-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      <p className="mt-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{b.body}</p>
      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div><dt className="text-xs text-gray-500">Sent to</dt><dd className="text-gray-900 dark:text-white">{b.audienceText}</dd></div>
        <div><dt className="text-xs text-gray-500">Sent</dt><dd className="text-gray-900 dark:text-white">{when(b.sentAt)}{b.sentBy ? ` by ${b.sentBy}` : ""}</dd></div>
        <div><dt className="text-xs text-gray-500">Opens</dt><dd className="text-gray-900 dark:text-white">{ROUTE_LABEL[b.route ?? ""] ?? b.route ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">People</dt><dd className="text-gray-900 dark:text-white">{b.recipients}</dd></div>
        <div><dt className="text-xs text-gray-500 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Read</dt><dd className="text-gray-900 dark:text-white">{b.read} ({b.recipients ? Math.round((b.read / b.recipients) * 100) : 0}%)</dd></div>
        <div><dt className="text-xs text-gray-500">Phones</dt><dd className="text-gray-900 dark:text-white">{b.push ? b.phones : "Bell only"}</dd></div>
        {b.editedAt ? <div><dt className="text-xs text-gray-500">Last edited</dt><dd className="text-gray-900 dark:text-white">{when(b.editedAt)}{b.editedBy ? ` by ${b.editedBy}` : ""}</dd></div> : null}
        {b.resendCount ? <div><dt className="text-xs text-gray-500">Resent</dt><dd className="text-gray-900 dark:text-white">{b.resendCount}× · last {when(b.lastResentAt)}{b.lastResentBy ? ` by ${b.lastResentBy}` : ""}</dd></div> : null}
        {withdrawn ? <div><dt className="text-xs text-gray-500">Withdrawn</dt><dd className="text-red-600">{when(b.withdrawnAt)}</dd></div> : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {!withdrawn ? <button type="button" onClick={onEdit} className={`${btnCls} border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200`}><Pencil className="w-4 h-4" /> Edit</button> : null}
        <button type="button" onClick={onResend} className={`${btnCls} bg-green-700 hover:bg-green-800 text-white`}><RotateCw className="w-4 h-4" /> Resend</button>
        {!withdrawn ? <button type="button" onClick={onWithdraw} className={`${btnCls} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}><Trash2 className="w-4 h-4" /> Withdraw</button> : null}
      </div>

      {!withdrawn ? (
        <div className="mt-5 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between mb-2">
            <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
              {(["all", "read", "unread"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-sm font-semibold capitalize ${filter === f ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>
                  {f === "all" ? `All (${b.recipients})` : f === "read" ? `Read (${b.read})` : `Not read (${b.unread ?? b.recipients - b.read})`}
                </button>
              ))}
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person" className="rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-1.5 text-sm text-gray-900 dark:text-white sm:w-56" />
          </div>
          {!list ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-green-600" /></div>
          ) : !shown.length ? (
            <p className="py-4 text-sm text-gray-500 text-center">Nobody here.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700">
              {shown.map((r) => (
                <li key={r.userId} className="px-3 py-2 flex items-center gap-3 text-sm">
                  {r.readAt ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <Clock className="w-4 h-4 text-gray-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white truncate">{r.name}{r.hasApp ? <Smartphone className="inline w-3 h-3 ml-1 text-green-700" /> : null}</p>
                    <p className="text-xs text-gray-500 truncate">{[r.facility, r.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{r.readAt ? `Read ${when(r.readAt)}` : "Not read"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">It was removed from everyone&apos;s notification list. Resend it to deliver it again.</p>
      )}
    </Modal>
  );
}

function EditModal({ b, onClose, onSaved, onSaveAndResend }: { b: Broadcast; onClose: () => void; onSaved: () => void; onSaveAndResend: (v: { title: string; body: string; route: string }) => void }) {
  const [title, setTitle] = useState(b.title);
  const [body, setBody] = useState(b.body);
  const [route, setRoute] = useState(b.route || "/notifications");
  const [busy, setBusy] = useState(false);
  const changed = title.trim() !== b.title || body.trim() !== b.body || route !== (b.route || "/notifications");
  const ok = title.trim().length > 0 && body.trim().length > 0;

  async function save() {
    setBusy(true);
    try {
      const { data } = await api.put(`/staff-notifications/${b.id}`, { title: title.trim(), body: body.trim(), route });
      toast.success(data?.message ?? "Saved.");
      onClose();
      onSaved();
    } catch (e) {
      toast.error(friendlyError(e, "Could not save the changes."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => !busy && onClose()}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit notification</h3>
      <p className="text-xs text-gray-500 mt-1">Saving updates the message in everyone&apos;s notification list in the app. A phone notification that already showed on a lock screen can&apos;t be changed — use “Save &amp; resend” if staff must see the correction.</p>
      <label className="block mt-4">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</span>
        <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={fieldCls} />
      </label>
      <label className="block mt-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message</span>
        <textarea value={body} maxLength={2000} rows={5} onChange={(e) => setBody(e.target.value)} className={fieldCls} />
      </label>
      <label className="block mt-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">When tapped, open</span>
        <select value={route} onChange={(e) => setRoute(e.target.value)} className={fieldCls}>
          {Object.entries(ROUTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className={`${btnCls} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>Cancel</button>
        <button type="button" onClick={() => onSaveAndResend({ title: title.trim(), body: body.trim(), route })} disabled={busy || !ok} className={`${btnCls} border border-green-600 text-green-700 dark:text-green-400`}><RotateCw className="w-4 h-4" /> Save &amp; resend…</button>
        <button type="button" onClick={save} disabled={busy || !ok || !changed} className={`${btnCls} bg-green-700 hover:bg-green-800 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save changes</button>
      </div>
    </Modal>
  );
}

function ResendModal({ b, title, body, route, onClose, onDone }: { b: Broadcast; title?: string; body?: string; route?: string; onClose: () => void; onDone: () => void }) {
  const withdrawn = !!b.withdrawnAt;
  const unread = b.unread ?? Math.max(0, b.recipients - b.read);
  const [to, setTo] = useState<"unread" | "all">(!withdrawn && unread > 0 ? "unread" : "all");
  const [push, setPush] = useState(true);
  const [busy, setBusy] = useState(false);
  const edited = title !== undefined && (title !== b.title || body !== b.body || route !== b.route);

  async function go() {
    setBusy(true);
    try {
      const { data } = await api.post(`/staff-notifications/${b.id}/resend`, { to, push, ...(edited ? { title, body, route } : {}) });
      toast.success(data?.message ?? "Resent.");
      onDone();
    } catch (e) {
      toast.error(friendlyError(e, "Could not resend."));
    } finally {
      setBusy(false);
    }
  }

  const Opt = ({ v, label, hint, disabled }: { v: "unread" | "all"; label: string; hint: string; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => setTo(v)} className={`w-full text-left rounded-xl border p-3 disabled:opacity-50 ${to === v ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"}`}>
      <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
      <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>
    </button>
  );

  return (
    <Modal onClose={() => !busy && onClose()}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resend “{title ?? b.title}”</h3>
      {edited ? <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">With your edits — everyone&apos;s copy is updated to the new text.</p> : null}
      <div className="mt-4 space-y-2">
        <Opt v="unread" label={`Only people who haven't read it (${withdrawn ? 0 : unread})`} hint="A reminder for those who missed it." disabled={withdrawn || unread === 0} />
        <Opt v="all" label="Everyone in the audience" hint={`${b.audienceText ?? "Same audience"} — staff who joined since it was sent are included.`} />
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer select-none">
        <input type="checkbox" className="mt-1" checked={push} onChange={(e) => setPush(e.target.checked)} />
        <span>
          <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">Send as a phone notification</span>
          <span className="block text-xs text-gray-500">It also goes back to the top of their notification list as unread.</span>
        </span>
      </label>
      <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className={`${btnCls} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>Cancel</button>
        <button type="button" onClick={go} disabled={busy} className={`${btnCls} bg-green-700 hover:bg-green-800 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Resend</button>
      </div>
    </Modal>
  );
}

function WithdrawModal({ b, onClose, onDone }: { b: Broadcast; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const { data } = await api.delete(`/staff-notifications/${b.id}`);
      toast.success(data?.message ?? "Withdrawn.");
      onDone();
    } catch (e) {
      toast.error(friendlyError(e, "Could not withdraw it."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal onClose={() => !busy && onClose()}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Withdraw “{b.title}”?</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        It&apos;s removed from the notification list of all {b.recipients} {b.recipients === 1 ? "person" : "people"} in the app. A phone notification already on a lock screen can&apos;t be pulled back.
        You can still find it under “Withdrawn” and resend it.
      </p>
      <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className={`${btnCls} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>Cancel</button>
        <button type="button" onClick={go} disabled={busy} className={`${btnCls} bg-red-600 hover:bg-red-700 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Withdraw</button>
      </div>
    </Modal>
  );
}
