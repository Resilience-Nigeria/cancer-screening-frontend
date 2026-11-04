import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, X, ArrowRight, Phone, Mail, Inbox, Send, Layers, FlaskConical, ClipboardCheck, FileText, UserRound } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";
import { nextToolFor } from "../../lib/referralStage";

const PER_PAGE = 20;
const SAMPLES_PATH = "/ncsr/screening-tests-page";

const STAGE_LABEL: Record<string, string> = {
  screening_to_confirmation: "Stage 2 → Stage 3",
  confirmation_to_treatment: "Stage 3 → Stage 4",
};

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const human = (v?: string | null) => (v ? v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—");
const stageName = (t?: string | null) => (t && STAGE_LABEL[t]) || human(t);

const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const daysSince = (d?: string | null) => {
  if (!d) return null;
  const n = Math.floor((Date.now() - new Date(`${String(d).slice(0, 10)}T00:00:00`).getTime()) / 86400000);
  return n >= 0 ? n : null;
};

const TABS = [
  { key: "", label: "All", icon: Layers },
  { key: "received", label: "Incoming", icon: Inbox },
  { key: "sent", label: "Sent", icon: Send },
];

export default function ReferredClientsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, active: 0, pending: 0, accepted: 0, completed: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [type, setType] = useState("");
  const [direction, setDirection] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ready, setReady] = useState(false);
  const reqId = useRef(0);

  // Deep links: ?direction=received (old Linked Clients link) · ?status=pending · ?type=screening_to_confirmation
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (typeof q.direction === "string") setDirection(q.direction);
    if (typeof q.status === "string") setStatus(q.status === "all" ? "" : q.status);
    if (typeof q.type === "string") setType(q.type);
    setReady(true);
  }, [router.isReady]);

  async function load(p = page) {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const { data } = await api.get("/referred-clients", {
        params: {
          page: p,
          perPage: PER_PAGE,
          search: search.trim() || undefined,
          status: status || undefined,
          type: type || undefined,
          direction: direction || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      if (id !== reqId.current) return;
      setRows(data.referrals ?? []);
      setTotal(data.total ?? 0);
      setTypes(data.types ?? []);
      setSummary(data.summary ?? summary);
    } catch (e) {
      if (id === reqId.current) toast.error(friendlyError(e, "Could not load referred clients."));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, status, type, direction, dateFrom, dateTo]);

  const filtersActive = !!(search || type || direction || dateFrom || dateTo || status !== "active");
  const clearFilters = () => { setSearch(""); setStatus("active"); setType(""); setDirection(""); setDateFrom(""); setDateTo(""); };

  const tiles = [
    { key: "active", label: "Active", value: summary.active, tone: "text-gray-800 dark:text-white", on: status === "active", apply: () => setStatus("active") },
    { key: "pending", label: "Pending", value: summary.pending, tone: "text-amber-600", on: status === "pending", apply: () => setStatus("pending") },
    { key: "accepted", label: "Accepted", value: summary.accepted, tone: "text-blue-600", on: status === "accepted", apply: () => setStatus("accepted") },
    { key: "completed", label: "Completed", value: summary.completed, tone: "text-green-700", on: status === "completed", apply: () => setStatus("completed") },
    { key: "all", label: "All referrals", value: summary.total, tone: "text-gray-500", on: status === "", apply: () => setStatus("") },
  ];

  // ── Navigation into the next stage and the lab pages ─────────────────────────
  const q = (id: string) => encodeURIComponent(id);
  const openRecord = (id: string) => router.push(`/ncsr/client-details?clientId=${q(id)}`);

  /** The tool for the stage the client was referred INTO (Stage 3 diagnosis, or Stage 4 treatment). */
  function stageTool(r: any): { href: string; label: string } | null {
    const t = nextToolFor(r.referralType);
    if (t) return { href: t.href, label: t.label };
    if (r.referralType === "confirmation_to_treatment") return { href: "/ncsr/treatment-plan", label: "Open treatment & care" };
    return null;
  }

  async function setReferralStatus(r: any, next: "accepted" | "completed" | "declined", quiet = false) {
    if (!quiet) {
      const verb = { accepted: "accept", completed: "mark as completed", declined: "decline" }[next];
      if (!window.confirm(`Do you want to ${verb} the referral for ${r.client?.fullName ?? r.clientId}?`)) return false;
    }
    setUpdating(r.referralId);
    try {
      await api.patch(`/referred-clients/${r.referralId}/status`, { status: next });
      if (!quiet) {
        toast.success("Referral updated.");
        await load(page);
      }
      return true;
    } catch (e) {
      toast.error(friendlyError(e, "Could not update the referral."));
      return false;
    } finally {
      setUpdating(null);
    }
  }

  /** Opens the next-stage page for this client. A pending referral is accepted first (the work has started). */
  async function startStage(r: any) {
    const tool = stageTool(r);
    if (!tool) {
      toast.error("There's no tool for this stage yet.");
      return;
    }
    if (r.status === "pending" && r.canUpdate) await setReferralStatus(r, "accepted", true);
    router.push(`${tool.href}?clientId=${q(r.clientId)}&referralId=${r.referralId}`);
  }

  const fieldClass = "rounded-2xl h-11";

  const Waiting = ({ r }: { r: any }) => {
    const d = r.status === "pending" ? daysSince(r.referralDate) : null;
    if (d === null) return null;
    return <span className={`text-xs ${d > 14 ? "text-red-600 font-semibold" : "text-gray-500"}`}>{d === 0 ? "today" : `${d} day${d === 1 ? "" : "s"} waiting`}</span>;
  };

  const FromTo = ({ r }: { r: any }) => (
    <span className="inline-flex flex-wrap items-center gap-1 text-sm">
      <span>{r.fromFacility?.facilityName ?? r.from_facility?.facilityName ?? "—"}</span>
      <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
      <span className="font-semibold">{r.toFacility?.facilityName ?? r.to_facility?.facilityName ?? "—"}</span>
    </span>
  );

  const Contact = ({ r }: { r: any }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
      {r.client?.phoneNumber && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.client.phoneNumber}</span>}
      {r.client?.email && <span className="inline-flex items-center gap-1 break-all"><Mail className="w-3 h-3" />{r.client.email}</span>}
    </div>
  );

  const Navigator = ({ r }: { r: any }) => {
    const n = r.toFacility ?? r.to_facility;
    const parts = [n?.navigatorName, n?.navigatorPhone, n?.navigatorEmail].filter(Boolean);
    return parts.length ? <p className="text-xs text-gray-500">Navigator: {parts.join(" · ")}</p> : null;
  };

  /** Primary action + quick links into samples, results and the record. */
  const Actions = ({ r }: { r: any }) => {
    const busy = updating === r.referralId;
    const tool = stageTool(r);
    const open = r.status === "pending" || r.status === "accepted";
    return (
      <div className="flex flex-wrap gap-2">
        {r.canUpdate && open && tool && (
          <Button size="small" className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" disabled={busy} onClick={() => startStage(r)}>
            <span className="inline-flex items-center gap-1">{r.status === "pending" ? `Accept & ${tool.label}` : tool.label} <ArrowRight className="w-3 h-3" /></span>
          </Button>
        )}
        {r.canUpdate && r.status === "accepted" && (
          <Button size="small" layout="outline" className="rounded-xl" disabled={busy} onClick={() => setReferralStatus(r, "completed")}>Mark completed</Button>
        )}
        {r.canUpdate && r.status === "pending" && (
          <Button size="small" layout="outline" className="rounded-xl" disabled={busy} onClick={() => setReferralStatus(r, "declined")}>Decline</Button>
        )}
        <Button size="small" layout="outline" className="rounded-xl" onClick={() => router.push(`${SAMPLES_PATH}?search=${q(r.clientId)}`)} title="Collect a sample or record a test">
          <span className="inline-flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Tests</span>
        </Button>
        <Button size="small" layout="outline" className="rounded-xl" onClick={() => router.push(`${SAMPLES_PATH}?tab=results&search=${q(r.clientId)}`)} title="Enter results for samples already taken">
          <span className="inline-flex items-center gap-1"><ClipboardCheck className="w-3 h-3" /> Enter results</span>
        </Button>
        <Button size="small" layout="outline" className="rounded-xl" onClick={() => router.push(`/ncsr/test-results?clientId=${q(r.clientId)}`)} title="All results for this client">
          <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Results</span>
        </Button>
        <Button size="small" layout="outline" className="rounded-xl" onClick={() => openRecord(r.clientId)}>
          <span className="inline-flex items-center gap-1"><UserRound className="w-3 h-3" /> Record</span>
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      <PageTitle>Referred Clients</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Clients referred to or from your facility. Start the next stage, record tests and results, and track each referral from here.
      </p>

      {/* Incoming / Sent */}
      <div className="mb-4 inline-flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = direction === t.key;
          return (
            <button
              key={t.key || "all"}
              type="button"
              onClick={() => setDirection(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-sm font-semibold transition ${on ? "bg-white dark:bg-gray-700 text-green-700 shadow-sm" : "text-gray-500"}`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.apply}
            className={`text-left rounded-2xl border p-4 bg-white dark:bg-gray-800 transition ${t.on ? "border-green-600 ring-2 ring-green-100" : "border-gray-100 dark:border-gray-700 hover:border-green-300"}`}
          >
            <p className={`text-2xl font-bold ${t.tone}`}>{t.value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 sm:p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select className={fieldClass} value={type} onChange={(e) => setType(e.target.value)} aria-label="Stage">
            <option value="">All stages</option>
            {types.map((t) => <option key={t} value={t}>{stageName(t)}</option>)}
          </Select>
          <Select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="active">Active (pending + accepted)</option>
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </Select>
          <Input type="date" className={fieldClass} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} aria-label="Referred from" />
          <Input type="date" className={fieldClass} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} aria-label="Referred to" />
        </div>
        <div className="flex gap-2">
          <Input
            className={`${fieldClass} flex-1 min-w-0`}
            placeholder="Search name, phone or Client ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1); } }}
          />
          <Button onClick={() => { setPage(1); load(1); }} className="h-11 px-4 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" aria-label="Search">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 underline">
            <X className="w-3 h-3" /> Reset filters
          </button>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <Inbox className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-200">{filtersActive ? "No referrals match these filters." : "No active referrals right now."}</p>
          <p className="text-xs text-gray-400 mt-1">Clients referred to your facility will show up here.</p>
          {filtersActive && <Button layout="outline" className="mt-4 rounded-2xl" onClick={clearFilters}>Reset filters</Button>}
        </div>
      ) : (
        <div className={`space-y-3 ${loading ? "opacity-60" : ""} transition`}>
          {rows.map((r) => (
            <div key={r.referralId} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <button type="button" className="text-left" onClick={() => openRecord(r.clientId)}>
                    <p className="font-semibold text-gray-800 dark:text-white break-words">{r.client?.fullName ?? r.clientId}</p>
                    <p className="text-xs text-green-700 font-medium break-all">{r.clientId}</p>
                  </button>
                  <Contact r={r} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle[r.status] ?? "bg-gray-100 text-gray-700"}`}>{human(r.status)}</span>
                  <span className="text-xs text-gray-500">{stageName(r.referralType)}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <FromTo r={r} />
                <p className="text-xs text-gray-500">Referred {fmt(r.referralDate)} <Waiting r={r} /></p>
                <Navigator r={r} />
                {r.notes && <p className="text-xs text-gray-600 line-clamp-3">{r.notes}</p>}
              </div>

              <div className="mt-4">
                <Actions r={r} />
              </div>
            </div>
          ))}

          {total > PER_PAGE && (
            <div className="mt-4 overflow-x-auto">
              <Pagination
                totalResults={total}
                resultsPerPage={PER_PAGE}
                label="Referred clients pages"
                onChange={(p: number) => { setPage(p); load(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
