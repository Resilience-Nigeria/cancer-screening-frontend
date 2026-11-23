import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Mail, Users, UserRound, AtSign, Plus, Trash2, Pencil, Pause, Play, Eye, Send, Loader2, X, Search,
  CalendarClock, ShieldAlert, Building2, CheckSquare, Square, Ban,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

// ─── Types ────────────────────────────────────────────────────────────────────
type Recipient = {
  id: number;
  type: "role" | "user" | "email";
  roleName: string | null;
  roleLabel: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  email: string | null;
  name: string | null;
  scope: "own" | "all" | "facilities";
  facilityIds: number[];
  facilityNames: string[];
  isExcluded: boolean;
  active: boolean;
};

type Report = {
  reportKey: "weekly_summary" | "overdue_results";
  title: string;
  enabled: boolean;
  frequency: "daily" | "weekdays" | "weekly";
  dayOfWeek: number | null;
  sendTime: string;
  options: { days?: number; applyToPopup?: boolean };
  nextRunAt: string | null;
  lastRunAt: string | null;
  recipients: Recipient[];
};

type Role = { roleName: string; label: string; description?: string | null };
type Facility = { facilityId: number; facilityName: string; facilityState?: string | null };
type StaffUser = { id: number; name: string; email: string; role: string | null; facility: string | null; status?: string | null };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ABOUT: Record<string, string> = {
  weekly_summary:
    "A one-page summary for management: clients registered and screened, suspicious findings, referrals, lab results and turnaround, facility activity, and what needs attention. Compared with the week before.",
  overdue_results:
    "Lists samples and tests still waiting for a result after the number of days below. Only sent to people who have something overdue in their facilities.",
};

const OWN_TEXT: Record<string, string> = {
  weekly_summary: "The facilities their role can see (all facilities for national roles)",
  overdue_results: "Their own facility (hospital admins: their facilities; Super / NICRAT admins: all)",
};

const field = "w-full h-11 px-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent";
const btn = "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold transition disabled:opacity-50";
const btnPrimary = `${btn} bg-green-700 hover:bg-green-800 text-white`;
const btnOutline = `${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700`;

// ─── Small modal ─────────────────────────────────────────────────────────────
function Modal({ open, title, onClose, children, wide = false, footer }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"} max-h-[94vh] flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl whitespace-normal`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 -m-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && <div className="p-4 sm:px-5 border-t border-gray-100 dark:border-gray-700 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ─── Facility picker ─────────────────────────────────────────────────────────
function FacilityPicker({ facilities, value, onChange }: { facilities: Facility[]; value: number[]; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? facilities.filter((f) => `${f.facilityName} ${f.facilityState ?? ""}`.toLowerCase().includes(n)) : facilities;
  }, [q, facilities]);
  const set = new Set(value.map(Number));
  const toggle = (id: number) => onChange(set.has(id) ? value.filter((v) => Number(v) !== id) : [...value, id]);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search facilities" className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 dark:text-white" />
        <span className="text-xs text-gray-500 shrink-0">{value.length} chosen</span>
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        {shown.map((f) => {
          const on = set.has(Number(f.facilityId));
          return (
            <button key={f.facilityId} type="button" onClick={() => toggle(Number(f.facilityId))} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              {on ? <CheckSquare className="w-4 h-4 text-green-700 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
              <span className="text-gray-800 dark:text-gray-100">{f.facilityName}</span>
              {f.facilityState && <span className="text-xs text-gray-400">· {f.facilityState}</span>}
            </button>
          );
        })}
        {shown.length === 0 && <p className="p-3 text-sm text-gray-500">No facility matches.</p>}
      </div>
    </div>
  );
}

// ─── Recipient editor ────────────────────────────────────────────────────────
type Draft = {
  id?: number;
  type: "role" | "user" | "email";
  roleName: string;
  user: StaffUser | null;
  email: string;
  name: string;
  scope: "own" | "all" | "facilities";
  facilityIds: number[];
  isExcluded: boolean;
};

const emptyDraft = (): Draft => ({ type: "role", roleName: "", user: null, email: "", name: "", scope: "own", facilityIds: [], isExcluded: false });

function RecipientEditor({ open, report, draft, roles, facilities, onClose, onSaved }: {
  open: boolean; report: Report | null; draft: Draft; roles: Role[]; facilities: Facility[]; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<StaffUser[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => { if (open) { setD(draft); setQ(""); setFound([]); } }, [open, draft]);

  useEffect(() => {
    if (!open || d.type !== "user" || d.id) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get("/report-settings/users", { params: { search: q.trim() || undefined } });
        setFound(data.users ?? []);
      } catch { setFound([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q, d.type, open, d.id]);

  if (!report) return null;
  const editing = !!d.id;
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  async function save() {
    if (!report) return;
    if (!editing) {
      if (d.type === "role" && !d.roleName) return toast.error("Choose a role.");
      if (d.type === "user" && !d.user) return toast.error("Choose a staff member.");
      if (d.type === "email" && !/^\S+@\S+\.\S+$/.test(d.email.trim())) return toast.error("Enter a valid email address.");
    }
    if (!d.isExcluded && d.scope === "facilities" && d.facilityIds.length === 0) return toast.error("Pick at least one facility.");
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/report-settings/recipients/${d.id}`, {
          scope: d.scope, facilityIds: d.facilityIds, isExcluded: d.isExcluded, ...(d.type === "email" ? { name: d.name || null } : {}),
        });
      } else {
        await api.post(`/report-settings/${report.reportKey}/recipients`, {
          type: d.type,
          roleName: d.type === "role" ? d.roleName : undefined,
          userId: d.type === "user" ? d.user?.id : undefined,
          email: d.type === "email" ? d.email.trim() : undefined,
          name: d.type === "email" ? d.name.trim() || undefined : undefined,
          scope: d.isExcluded ? "own" : d.scope,
          facilityIds: d.scope === "facilities" ? d.facilityIds : undefined,
          isExcluded: d.type === "user" ? d.isExcluded : undefined,
        });
      }
      toast.success(editing ? "Saved." : "Added.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(friendlyError(e, "Could not save."));
    } finally {
      setSaving(false);
    }
  }

  const TYPES = [
    { key: "role", label: "A whole role", icon: Users },
    { key: "user", label: "One staff member", icon: UserRound },
    { key: "email", label: "Email address", icon: AtSign },
  ] as const;

  const scopes = [
    ...(d.type !== "email" ? [{ key: "own", label: "Their own facilities", hint: OWN_TEXT[report.reportKey] }] : []),
    { key: "all", label: "All facilities", hint: "Figures for the whole programme" },
    { key: "facilities", label: "Chosen facilities", hint: "Only the facilities you pick below" },
  ] as const;

  return (
    <Modal
      open={open}
      title={`${editing ? "Edit" : "Add"} recipient · ${report.title}`}
      onClose={onClose}
      footer={<>
        <button type="button" className={btnOutline} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? "Save" : d.isExcluded ? "Exclude" : "Add"}
        </button>
      </>}
    >
      <div className="space-y-5">
        {!editing && (
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Who</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const on = d.type === t.key;
                return (
                  <button key={t.key} type="button" onClick={() => set({ type: t.key, scope: t.key === "email" ? "all" : "own", isExcluded: false })}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium text-left ${on ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    <Icon className="w-4 h-4 shrink-0" /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {d.type === "role" && (
          editing ? <p className="text-sm"><b>Role:</b> {roles.find((r) => r.roleName === d.roleName)?.label ?? d.roleName}</p> : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select className={field} value={d.roleName} onChange={(e) => set({ roleName: e.target.value })}>
                <option value="">Choose a role</option>
                {roles.map((r) => <option key={r.roleName} value={r.roleName}>{r.label}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Everyone active with this role gets it, including people given the role later.</p>
            </div>
          )
        )}

        {d.type === "user" && (
          d.user || editing ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-800 dark:text-white">{d.user?.name}</p>
                <p className="text-xs text-gray-500 break-all">{d.user?.email}{d.user?.role ? ` · ${d.user.role}` : ""}{d.user?.facility ? ` · ${d.user.facility}` : ""}</p>
              </div>
              {!editing && <button type="button" className="text-xs font-semibold text-green-700 underline shrink-0" onClick={() => set({ user: null })}>Change</button>}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Staff member</label>
              <div className="relative">
                <input className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" />
                {searching && <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-3.5" />}
              </div>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {found.map((u) => (
                  <button key={u.id} type="button" onClick={() => set({ user: u })} className="w-full text-left p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-500 break-all">{u.email}{u.role ? ` · ${u.role}` : ""}{u.facility ? ` · ${u.facility}` : ""}</p>
                  </button>
                ))}
                {!searching && found.length === 0 && <p className="p-3 text-sm text-gray-500">No staff found.</p>}
              </div>
            </div>
          )
        )}

        {d.type === "email" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input className={field} type="email" value={d.email} disabled={editing} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Name (optional)</label>
              <input className={field} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Director General" />
            </div>
          </div>
        )}

        {d.type === "user" && (
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1" checked={d.isExcluded} onChange={(e) => set({ isExcluded: e.target.checked })} />
            <span>
              <b>Never send to this person</b>
              <span className="block text-xs text-gray-500">Use this to leave someone out when their role is on the list.</span>
            </span>
          </label>
        )}

        {!d.isExcluded && (
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Which facilities' figures</p>
            <div className="space-y-2">
              {scopes.map((s) => (
                <label key={s.key} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer ${d.scope === s.key ? "border-green-600 bg-green-50/60 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                  <input type="radio" className="mt-1" checked={d.scope === s.key} onChange={() => set({ scope: s.key })} />
                  <span className="text-sm">
                    <b className="text-gray-800 dark:text-white">{s.label}</b>
                    <span className="block text-xs text-gray-500">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {d.scope === "facilities" && (
              <div className="mt-3">
                <FacilityPicker facilities={facilities} value={d.facilityIds} onChange={(ids) => set({ facilityIds: ids })} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ReportSettingsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [forms, setForms] = useState<Record<string, Report>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [editor, setEditor] = useState<{ report: Report; draft: Draft } | null>(null);
  const [audience, setAudience] = useState<{ report: Report; loading: boolean; people: any[] } | null>(null);
  const [preview, setPreview] = useState<{ report: Report; loading: boolean; html: string | null; subject?: string | null; message?: string } | null>(null);

  async function load() {
    try {
      const { data } = await api.get("/report-settings");
      setReports(data.reports ?? []);
      setRoles(data.roles ?? []);
      setFacilities(data.facilities ?? []);
      setForms(Object.fromEntries((data.reports ?? []).map((r: Report) => [r.reportKey, { ...r, options: { ...(r.options ?? {}) } }])));
    } catch (e: any) {
      if (e?.response?.status === 403) setForbidden(true);
      else toast.error(friendlyError(e, "Could not load report settings."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const setForm = (key: string, p: Partial<Report>) => setForms((f) => ({ ...f, [key]: { ...f[key], ...p } }));
  const setOpt = (key: string, p: Partial<Report["options"]>) => setForms((f) => ({ ...f, [key]: { ...f[key], options: { ...f[key].options, ...p } } }));

  async function saveSchedule(key: string) {
    const f = forms[key];
    setSaving(key);
    try {
      await api.put(`/report-settings/${key}`, {
        enabled: f.enabled,
        frequency: f.frequency,
        dayOfWeek: f.frequency === "weekly" ? f.dayOfWeek ?? 5 : null,
        sendTime: f.sendTime,
        options: key === "overdue_results" ? { days: Number(f.options.days || 7), applyToPopup: !!f.options.applyToPopup } : {},
      });
      toast.success("Schedule saved.");
      await load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not save the schedule."));
    } finally {
      setSaving(null);
    }
  }

  async function patchRecipient(r: Recipient, body: any, msg: string) {
    setBusy(`r${r.id}`);
    try {
      await api.patch(`/report-settings/recipients/${r.id}`, body);
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not update."));
    } finally {
      setBusy(null);
    }
  }

  async function removeRecipient(r: Recipient) {
    if (!window.confirm(`Remove ${who(r)} from this report?`)) return;
    setBusy(`r${r.id}`);
    try {
      await api.delete(`/report-settings/recipients/${r.id}`);
      toast.success("Removed.");
      await load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not remove."));
    } finally {
      setBusy(null);
    }
  }

  async function openAudience(report: Report) {
    setAudience({ report, loading: true, people: [] });
    try {
      const { data } = await api.get(`/report-settings/${report.reportKey}/audience`);
      setAudience({ report, loading: false, people: data.people ?? [] });
    } catch (e) {
      toast.error(friendlyError(e, "Could not load the list."));
      setAudience(null);
    }
  }

  async function openPreview(report: Report) {
    setPreview({ report, loading: true, html: null });
    try {
      const { data } = await api.get(`/report-settings/${report.reportKey}/preview`);
      setPreview({ report, loading: false, html: data.html, subject: data.subject, message: data.message });
    } catch (e) {
      toast.error(friendlyError(e, "Could not build the preview."));
      setPreview(null);
    }
  }

  async function sendTest(report: Report) {
    setBusy(`t${report.reportKey}`);
    try {
      const { data } = await api.post(`/report-settings/${report.reportKey}/send-test`);
      toast.success(data.message ?? "Test sent.");
    } catch (e) {
      toast.error(friendlyError(e, "Could not send the test."));
    } finally {
      setBusy(null);
    }
  }

  const who = (r: Recipient) =>
    r.type === "role" ? `Everyone with the role ${r.roleLabel}` : r.type === "user" ? (r.userName ?? `User #${r.userId}`) : (r.name ? `${r.name} (${r.email})` : r.email ?? "");

  const scopeText = (report: Report, r: Recipient) => {
    if (r.isExcluded) return "Never receives this report";
    if (r.scope === "all") return "All facilities";
    if (r.scope === "own") return OWN_TEXT[report.reportKey];
    const n = r.facilityNames ?? [];
    return n.length > 3 ? `${n.slice(0, 3).join(", ")} +${n.length - 3} more` : n.join(", ") || "No facility chosen";
  };

  const editDraft = (r: Recipient): Draft => ({
    id: r.id, type: r.type, roleName: r.roleName ?? "",
    user: r.userId ? { id: r.userId, name: r.userName ?? "", email: r.userEmail ?? "", role: null, facility: null } : null,
    email: r.email ?? "", name: r.name ?? "", scope: r.scope, facilityIds: (r.facilityIds ?? []).map(Number), isExcluded: r.isExcluded,
  });

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
        <PageTitle>Report Settings</PageTitle>
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-10 text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-200">Only Super Admins and NICRAT Admins can manage report settings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTitle>Report Settings</PageTitle>
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        Choose when each scheduled email goes out and who receives it. Times are Nigeria time (WAT). Changes apply from the next send.
      </p>

      <div className="space-y-6">
        {reports.map((report) => {
          const f = forms[report.reportKey] ?? report;
          const key = report.reportKey;
          const people = report.recipients.filter((r) => !r.isExcluded);
          const excluded = report.recipients.filter((r) => r.isExcluded);
          return (
            <section key={key} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 shrink-0">
                    <Mail className="w-5 h-5 text-green-700" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{report.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{ABOUT[key]}</p>
                    <p className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Next: {report.enabled ? report.nextRunAt ?? "—" : "off"}</span>
                      <span>Last sent: {report.lastRunAt ?? "never"}</span>
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.enabled ? "On" : "Off"}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={f.enabled}
                    onClick={() => setForm(key, { enabled: !f.enabled })}
                    className={`relative w-11 h-6 rounded-full transition ${f.enabled ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${f.enabled ? "translate-x-5" : ""}`} />
                  </button>
                </label>
              </div>

              {/* Schedule */}
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Schedule</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {key === "overdue_results" ? (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">How often</label>
                      <select className={field} value={f.frequency} onChange={(e) => setForm(key, { frequency: e.target.value as any, dayOfWeek: e.target.value === "weekly" ? f.dayOfWeek ?? 1 : null })}>
                        <option value="daily">Every day</option>
                        <option value="weekdays">Weekdays (Mon–Fri)</option>
                        <option value="weekly">Once a week</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">How often</label>
                      <div className={`${field} flex items-center bg-gray-50 dark:bg-gray-900/40`}>Once a week</div>
                    </div>
                  )}
                  {f.frequency === "weekly" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Day</label>
                      <select className={field} value={f.dayOfWeek ?? 5} onChange={(e) => setForm(key, { dayOfWeek: Number(e.target.value) })}>
                        {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time (WAT)</label>
                    <input type="time" className={field} value={f.sendTime} onChange={(e) => setForm(key, { sendTime: e.target.value })} />
                  </div>
                  {key === "overdue_results" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Overdue after (days)</label>
                      <input type="number" min={1} max={90} className={field} value={f.options.days ?? 7} onChange={(e) => setOpt(key, { days: Number(e.target.value) })} />
                    </div>
                  )}
                </div>
                {key === "overdue_results" && (
                  <label className="mt-3 flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={!!f.options.applyToPopup} onChange={(e) => setOpt(key, { applyToPopup: e.target.checked })} />
                    <span>
                      <b className="text-gray-800 dark:text-gray-100">Use this list for the in-app pop-up too</b>
                      <span className="block text-xs text-gray-500">
                        When on, only the people below see the overdue pop-up after signing in, with the same facilities. When off, every staff member sees overdue results for their own facility.
                      </span>
                    </span>
                  </label>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className={btnPrimary} onClick={() => saveSchedule(key)} disabled={saving === key}>
                    {saving === key && <Loader2 className="w-4 h-4 animate-spin" />} Save schedule
                  </button>
                  <button type="button" className={btnOutline} onClick={() => openPreview(report)}><Eye className="w-4 h-4" /> Preview</button>
                  <button type="button" className={btnOutline} onClick={() => sendTest(report)} disabled={busy === `t${key}`}>
                    {busy === `t${key}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send me a test
                  </button>
                </div>
              </div>

              {/* Recipients */}
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Who receives it</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnOutline} onClick={() => openAudience(report)}><Users className="w-4 h-4" /> See everyone who gets it</button>
                    <button type="button" className={btnPrimary} onClick={() => setEditor({ report, draft: emptyDraft() })}><Plus className="w-4 h-4" /> Add recipient</button>
                  </div>
                </div>

                {people.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                    Nobody is on this list, so this email won't be sent. Add a role, a staff member or an email address.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {[...people, ...excluded].map((r) => {
                      const Icon = r.isExcluded ? Ban : r.type === "role" ? Users : r.type === "user" ? UserRound : AtSign;
                      const isBusy = busy === `r${r.id}`;
                      return (
                        <li key={r.id} className={`rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${r.isExcluded ? "border-red-100 bg-red-50/40 dark:bg-red-900/10" : "border-gray-100 dark:border-gray-700"} ${!r.active ? "opacity-60" : ""}`}>
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${r.isExcluded ? "bg-red-100 text-red-600" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white break-words">
                                {who(r)}
                                {!r.active && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Paused</span>}
                              </p>
                              {r.type === "user" && r.userEmail && <p className="text-xs text-gray-500 break-all">{r.userEmail}</p>}
                              <p className="text-xs text-gray-500 mt-0.5 inline-flex items-start gap-1">
                                <Building2 className="w-3.5 h-3.5 mt-px shrink-0" /> <span>{scopeText(report, r)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 sm:justify-end">
                            <button type="button" className={`${btnOutline} h-9 px-3`} disabled={isBusy} onClick={() => setEditor({ report, draft: editDraft(r) })} title="Edit">
                              <Pencil className="w-4 h-4" /><span className="sm:hidden">Edit</span>
                            </button>
                            <button type="button" className={`${btnOutline} h-9 px-3`} disabled={isBusy}
                              onClick={() => patchRecipient(r, { active: !r.active }, r.active ? "Paused." : "Resumed.")} title={r.active ? "Pause" : "Resume"}>
                              {r.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}<span className="sm:hidden">{r.active ? "Pause" : "Resume"}</span>
                            </button>
                            <button type="button" className={`${btnOutline} h-9 px-3 text-red-600`} disabled={isBusy} onClick={() => removeRecipient(r)} title="Remove">
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}<span className="sm:hidden">Remove</span>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <RecipientEditor
        open={!!editor}
        report={editor?.report ?? null}
        draft={editor?.draft ?? emptyDraft()}
        roles={roles}
        facilities={facilities}
        onClose={() => setEditor(null)}
        onSaved={load}
      />

      <Modal open={!!audience} title={`Everyone who gets it · ${audience?.report.title ?? ""}`} onClose={() => setAudience(null)}>
        {audience?.loading ? (
          <div className="py-10 text-center"><Loader2 className="w-7 h-7 animate-spin text-green-600 mx-auto" /></div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">
              {audience?.people.length ?? 0} {audience?.people.length === 1 ? "person" : "people"}. Each one gets a single email for all of their facilities.
              {audience?.report.reportKey === "overdue_results" && " People with nothing overdue are skipped on the day."}
            </p>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {audience?.people.map((p: any) => (
                <li key={p.email} className="py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500 break-all">{p.email}{p.role ? ` · ${p.role}` : ""}</p>
                    </div>
                    {typeof p.overdueNow === "number" && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.overdueNow ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.overdueNow ? `${p.overdueNow} overdue now` : "nothing overdue"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{p.scopeText} · <span className="text-gray-400">{(p.via ?? []).join(", ")}</span></p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      <Modal open={!!preview} wide title={`Preview · ${preview?.report.title ?? ""}`} onClose={() => setPreview(null)}>
        {preview?.loading ? (
          <div className="py-10 text-center"><Loader2 className="w-7 h-7 animate-spin text-green-600 mx-auto" /></div>
        ) : preview?.html ? (
          <>
            <p className="text-xs text-gray-500 mb-2">Subject: <b className="text-gray-700 dark:text-gray-200">{preview.subject}</b> · shown for all facilities, with today's figures.</p>
            <iframe title="Email preview" srcDoc={preview.html} className="w-full h-[70vh] rounded-xl border border-gray-200 dark:border-gray-700 bg-white" />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">{preview?.message ?? "Nothing to show."}</p>
        )}
      </Modal>
    </Layout>
  );
}
