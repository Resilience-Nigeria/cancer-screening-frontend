import React, { useEffect, useRef, useState } from "react";
import { Button, Input, Select, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, X, Building2, Phone, Mail, CalendarCheck, CheckCircle2, Ban, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

const PER_PAGE = 20;

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};
const statusText: Record<string, string> = {
  pending: "Waiting for confirmation",
  confirmed: "Confirmed",
  completed: "Attended",
  declined: "Declined",
  cancelled: "Cancelled by client",
};
const TYPE_LABEL: Record<string, string> = {
  general: "Screening",
  mammogram: "Mammogram",
  cbe: "Clinical breast exam",
  ultrasound: "Ultrasound",
  biopsy: "Biopsy",
  mri: "MRI",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = (t?: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
};
const slot = (d?: string | null, t?: string | null) => `${fmtDate(d)}${t ? ` · ${fmtTime(t)}` : ""}`;
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Tile = { key: string; label: string; value: number; tone: string; status: string };
type Dialog = { mode: "confirm" | "decline"; row: any } | null;

export default function BloomBookingsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({ all: 0, pending: 0, confirmed: 0, completed: 0, declined: 0, cancelled: 0 });
  const [facilities, setFacilities] = useState<{ id: number; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [facilityId, setFacilityId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [dialog, setDialog] = useState<Dialog>(null);
  const [fDate, setFDate] = useState("");
  const [fTime, setFTime] = useState("");
  const [fNote, setFNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load(p = page) {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const { data } = await api.get("/bloom-admin/appointments", {
        params: {
          page: p,
          perPage: PER_PAGE,
          status: status || undefined,
          search: search.trim() || undefined,
          facilityId: facilityId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      if (id !== reqId.current) return; // a newer request has replaced this one
      setRows(data.appointments ?? []);
      setTotal(data.total ?? 0);
      setSummary(data.summary ?? summary);
      setFacilities(data.facilities ?? []);
    } catch (e) {
      if (id === reqId.current) toast.error(friendlyError(e, "Could not load Bloom bookings."));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, facilityId, dateFrom, dateTo]);

  const filtersActive = !!(search || facilityId || dateFrom || dateTo || status !== "pending");
  const clearFilters = () => {
    setSearch(""); setFacilityId(""); setDateFrom(""); setDateTo(""); setStatus("pending");
  };

  const tiles: Tile[] = [
    { key: "pending", label: "Waiting for confirmation", value: summary.pending ?? 0, tone: "text-amber-600", status: "pending" },
    { key: "confirmed", label: "Confirmed", value: summary.confirmed ?? 0, tone: "text-green-700", status: "confirmed" },
    { key: "completed", label: "Attended", value: summary.completed ?? 0, tone: "text-blue-700", status: "completed" },
    { key: "declined", label: "Declined", value: summary.declined ?? 0, tone: "text-red-600", status: "declined" },
    { key: "cancelled", label: "Cancelled by client", value: summary.cancelled ?? 0, tone: "text-gray-600", status: "cancelled" },
    { key: "all", label: "All bookings", value: summary.all ?? 0, tone: "text-gray-800 dark:text-white", status: "" },
  ];

  function openDialog(mode: "confirm" | "decline", row: any) {
    setDialog({ mode, row });
    setFDate(row.confirmedDate ?? row.preferredDate ?? "");
    setFTime(row.confirmedTime ?? row.preferredTime ?? "");
    setFNote(mode === "decline" ? "" : row.staffNote ?? "");
  }
  const closeDialog = () => !saving && setDialog(null);

  async function submitDialog() {
    if (!dialog) return;
    const { mode, row } = dialog;
    if (mode === "confirm" && !fDate) return toast.error("Choose the date for this booking.");
    if (mode === "decline" && fNote.trim().length < 3) return toast.error("Tell the client why, so they can book again.");
    setSaving(true);
    try {
      if (mode === "confirm") {
        await api.post(`/bloom-admin/appointments/${row.id}/confirm`, { date: fDate, time: fTime || undefined, note: fNote.trim() || undefined });
        toast.success(`Confirmed for ${row.client?.name ?? "the client"}. They will see it in the app.`);
      } else {
        await api.post(`/bloom-admin/appointments/${row.id}/decline`, { note: fNote.trim() });
        toast.success("Declined. The client will see your message in the app.");
      }
      setDialog(null);
      load(page);
    } catch (e) {
      toast.error(friendlyError(e, "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function markAttended(row: any) {
    setBusyId(row.id);
    try {
      await api.post(`/bloom-admin/appointments/${row.id}/complete`);
      toast.success("Marked as attended.");
      load(page);
    } catch (e) {
      toast.error(friendlyError(e, "Could not update this booking."));
    } finally {
      setBusyId(null);
    }
  }

  const fieldClass = "rounded-2xl h-11";
  const today = todayIso();

  const Badge = ({ r }: { r: any }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[r.status] ?? "bg-gray-100 text-gray-700"}`}>
      {statusText[r.status] ?? r.status}
    </span>
  );

  const Client = ({ r }: { r: any }) => (
    <div className="min-w-0">
      <p className="font-semibold text-gray-800 dark:text-white break-words">{r.client?.name ?? "Unknown"}{r.client?.age ? <span className="font-normal text-gray-500">, {r.client.age}</span> : null}</p>
      {r.client?.phone && (
        <a href={`tel:+${r.client.phone}`} className="text-xs text-green-700 font-medium inline-flex items-center gap-1">
          <Phone className="w-3 h-3" /> {`0${String(r.client.phone).replace(/^234/, "")}`}
        </a>
      )}
      {r.client?.email && (
        <p className="text-xs text-gray-500 inline-flex items-center gap-1 break-all"><Mail className="w-3 h-3 shrink-0" /> {r.client.email}</p>
      )}
    </div>
  );

  const Slots = ({ r }: { r: any }) => (
    <div className="text-sm space-y-0.5">
      <p className="text-gray-800 dark:text-gray-100">
        <span className="text-xs text-gray-500">Asked for: </span>{slot(r.preferredDate, r.preferredTime)}
      </p>
      {r.confirmedDate && (
        <p className="text-green-800 dark:text-green-400 font-medium">
          <span className="text-xs text-gray-500 font-normal">Confirmed: </span>{slot(r.confirmedDate, r.confirmedTime)}
        </p>
      )}
      {r.rescheduled > 0 && <p className="text-xs text-amber-700">Client changed the time {r.rescheduled}×</p>}
      {r.staffNote && <p className="text-xs text-gray-500 break-words">Note to client: {r.staffNote}</p>}
    </div>
  );

  const Actions = ({ r, full = false }: { r: any; full?: boolean }) => {
    const live = r.status === "pending" || r.status === "confirmed";
    if (!live) return <span className="text-xs text-gray-400">—</span>;
    const due = r.status === "confirmed" && (r.confirmedDate ?? r.preferredDate) <= today;
    return (
      <div className={`flex gap-2 ${full ? "flex-wrap" : "justify-end flex-wrap"}`}>
        {r.status === "pending" && (
          <Button size="small" className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" onClick={() => openDialog("confirm", r)}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm
          </Button>
        )}
        {r.status === "confirmed" && (
          <>
            <Button size="small" className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" disabled={busyId === r.id || !due} onClick={() => markAttended(r)} title={due ? "Client came in" : "Available on the day of the visit"}>
              <UserCheck className="w-4 h-4 mr-1" /> Attended
            </Button>
            <Button size="small" layout="outline" className="rounded-xl" onClick={() => openDialog("confirm", r)}>
              <CalendarCheck className="w-4 h-4 mr-1" /> Change slot
            </Button>
          </>
        )}
        <Button size="small" layout="outline" className="rounded-xl text-red-600 border-red-300" onClick={() => openDialog("decline", r)}>
          <Ban className="w-4 h-4 mr-1" /> Decline
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      <PageTitle>Bloom Bookings</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Appointment requests clients made in the Bloom app. Confirm a slot (or suggest another), or decline with a reason. The client is
        notified in the app, and their reminders follow the confirmed time.
      </p>

      {/* Summary tiles double as quick filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.status)}
            className={`text-left rounded-2xl border p-4 bg-white dark:bg-gray-800 transition ${
              status === t.status ? "border-green-600 ring-2 ring-green-100" : "border-gray-100 dark:border-gray-700 hover:border-green-300"
            }`}
          >
            <p className={`text-2xl font-bold ${t.tone}`}>{t.value}</p>
            <p className="text-xs text-gray-500 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 sm:p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            <option value="pending">Waiting for confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Attended</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled by client</option>
          </Select>
          <Select className={fieldClass} value={facilityId} onChange={(e) => setFacilityId(e.target.value)} aria-label="Facility" disabled={facilities.length < 2 && !facilityId}>
            <option value="">{facilities.length < 2 && facilities[0] ? facilities[0].name : "All facilities"}</option>
            {facilities.length > 1 && facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Input type="date" className={fieldClass} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} aria-label="Requested date from" />
          <Input type="date" className={fieldClass} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} aria-label="Requested date to" />
        </div>
        <div className="flex gap-2">
          <Input
            className={`${fieldClass} flex-1 min-w-0`}
            placeholder="Search client name, phone or email"
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
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            {filtersActive ? "No bookings match these filters." : "No bookings are waiting. New requests from the Bloom app will appear here."}
          </p>
          {filtersActive && <Button layout="outline" className="mt-4 rounded-2xl" onClick={clearFilters}>Reset filters</Button>}
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          {/* Phones and tablets: cards */}
          <div className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Client r={r} />
                  <Badge r={r} />
                </div>
                <p className="text-xs text-gray-600 flex items-start gap-1">
                  <Building2 className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" /> {r.facility?.name ?? "—"} · {TYPE_LABEL[r.type] ?? r.type}
                </p>
                <Slots r={r} />
                {r.note && <p className="text-xs text-gray-600 break-words">Client note: {r.note}</p>}
                <Actions r={r} full />
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm whitespace-normal">
              <thead className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Facility / service</th>
                  <th className="px-4 py-3">Requested &amp; confirmed slot</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3"><Client r={r} /></td>
                    <td className="px-4 py-3 max-w-[14rem]">
                      <p className="text-gray-800 dark:text-gray-100 break-words">{r.facility?.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{TYPE_LABEL[r.type] ?? r.type}</p>
                      {r.note && <p className="text-xs text-gray-500 mt-1 break-words">Client note: {r.note}</p>}
                    </td>
                    <td className="px-4 py-3 max-w-[18rem]"><Slots r={r} /></td>
                    <td className="px-4 py-3"><Badge r={r} /></td>
                    <td className="px-4 py-3"><Actions r={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PER_PAGE && (
            <div className="mt-4 overflow-x-auto">
              <Pagination
                totalResults={total}
                resultsPerPage={PER_PAGE}
                label="Bloom bookings pages"
                onChange={(p: number) => { setPage(p); load(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            </div>
          )}
        </div>
      )}

      {/* Confirm / decline dialog */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="bloom-dialog-title">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <h3 id="bloom-dialog-title" className="text-lg font-semibold text-gray-800 dark:text-white">
              {dialog.mode === "confirm" ? (dialog.row.status === "confirmed" ? "Change the confirmed slot" : "Confirm this booking") : "Decline this booking"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {dialog.row.client?.name} · {dialog.row.facility?.name} · asked for {slot(dialog.row.preferredDate, dialog.row.preferredTime)}
            </p>

            {dialog.mode === "confirm" && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Date
                  <Input type="date" className={`${fieldClass} mt-1`} value={fDate} min={today} onChange={(e) => setFDate(e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Time
                  <Input type="time" className={`${fieldClass} mt-1`} value={fTime} onChange={(e) => setFTime(e.target.value)} />
                </label>
              </div>
            )}

            <label className="block mt-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
              {dialog.mode === "confirm" ? "Message to the client (optional)" : "Reason (the client will see this)"}
              <textarea
                className="mt-1 w-full rounded-2xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 p-3 text-sm focus:outline-none focus:border-green-600"
                rows={3}
                maxLength={500}
                value={fNote}
                placeholder={dialog.mode === "confirm" ? "e.g. Please bring your ID and arrive 15 minutes early." : "e.g. We have no mammogram slots that day. Please pick another day or centre."}
                onChange={(e) => setFNote(e.target.value)}
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button layout="outline" className="rounded-2xl" onClick={closeDialog} disabled={saving}>Back</Button>
              <Button
                className={`rounded-2xl ${dialog.mode === "confirm" ? "bg-green-700 border-green-700 hover:bg-green-800" : "bg-red-600 border-red-600 hover:bg-red-700"}`}
                onClick={submitDialog}
                disabled={saving}
              >
                {saving ? "Saving…" : dialog.mode === "confirm" ? "Confirm booking" : "Decline booking"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
