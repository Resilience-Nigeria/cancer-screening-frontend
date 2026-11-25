import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package, Truck, History, CalendarClock, ListChecks, Search, Loader2, X, Plus, Minus, ClipboardCheck, Trash2, ArrowRightLeft, Bell,
  Download, Pencil, CheckCircle2, AlertTriangle, Building2, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

/**
 * Stock Management — screening kits and consumables per facility.
 * Taking a sample in the app (or on the web) deducts its kit automatically; here staff record deliveries, counts,
 * expired stock and transfers, see stock across facilities, history (CSV export), expiring batches,
 * and admins manage the list of stock items.
 */

type Opt = { value: string; label: string };
type Fac = { facilityId: number; facilityName: string; facilityState?: string | null };
type ItemLite = { id: number; code: string; name: string; unit: string; active: boolean };
type Meta = {
  canManageItems: boolean; national: boolean; myFacilityId?: number | null; facilities: Fac[]; states: string[];
  items: ItemLite[]; tests: Opt[]; movementTypes: Opt[];
};
type Cell = { quantity: number | null; lowLevel: number; status: "ok" | "low" | "out" | "none" };
type MatrixRow = { facilityId: number; facilityName: string; facilityState?: string | null; out: number; low: number; cells: Record<string, Cell> };
type MatrixItem = { id: number; code: string; name: string; unit: string; total: number };
type Movement = {
  id: number; at?: string; type: string; typeLabel: string; facilityId: number; facility?: string; state?: string; itemId: number; item?: string; unit?: string;
  quantity: number; balanceAfter: number; otherFacility?: string | null; batchNo?: string | null; expiryDate?: string | null; sampleId?: number | null;
  note?: string | null; by?: string | null; inStock?: number; daysLeft?: number | null;
};
type FullItem = { id: number; code: string; name: string; unit: string; testTypes: string[]; perTest: number; defaultLowLevel: number; active: boolean; facilities: number; total: number };
type FacStockRow = { itemId: number; code: string; name: string; unit: string; quantity: number; lowLevel: number; status: "ok" | "low" | "out"; usedLast30: number; daysLeft: number | null; updatedAt?: string | null };
type Tab = "levels" | "deliver" | "history" | "expiring" | "items";

const card = "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
const btn = "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
const field = "mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white";
const num = (v: number | null | undefined) => (v == null ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, ""));
const when = (v?: string | null) => (v ? new Date(v).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const today = () => new Date().toISOString().slice(0, 10);

const STATUS: Record<Cell["status"], string> = {
  ok: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  low: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  out: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  none: "text-gray-300 dark:text-gray-600",
};

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div className={`w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 p-5 sm:p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">{title}</h3>
        {sub ? <p className="text-sm text-gray-500 mt-0.5">{sub}</p> : null}
      </div>
      <button type="button" onClick={onClose} className="p-2 -m-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
    </div>
  );
}

function Spinner() {
  return <div className="py-14 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div>;
}

function Empty({ text }: { text: string }) {
  return <div className={`${card} border-dashed p-10 text-center text-sm text-gray-500`}>{text}</div>;
}

function Select({ value, onChange, children, className = "" }: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white ${className}`}>
      {children}
    </select>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 w-full sm:w-64">
      <Search className="w-4 h-4 text-gray-400 shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 dark:text-white" />
      {value ? <button type="button" onClick={() => onChange("")} aria-label="Clear"><X className="w-4 h-4 text-gray-400" /></button> : null}
    </div>
  );
}

function Pager({ page, last, onPage }: { page: number; last: number; onPage: (p: number) => void }) {
  if (last <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 p-3">
      <button type="button" className={`${btn} border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200`} disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-sm text-gray-500">Page {page} of {last}</span>
      <button type="button" className={`${btn} border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200`} disabled={page >= last} onClick={() => onPage(page + 1)}><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Single facility + item: receive, count, expired, transfer, alert level, history
// ═════════════════════════════════════════════════════════════════════════
type Action = "receive" | "count" | "expired" | "transfer" | "level";
const ACTIONS: { key: Action; label: string; icon: React.ElementType; hint: string }[] = [
  { key: "receive", label: "Receive", icon: Plus, hint: "A delivery arrived" },
  { key: "count", label: "Physical count", icon: ClipboardCheck, hint: "Set to what is on the shelf" },
  { key: "expired", label: "Expired / damaged", icon: Trash2, hint: "Remove from stock" },
  { key: "transfer", label: "Send to facility", icon: ArrowRightLeft, hint: "Move stock elsewhere" },
  { key: "level", label: "Alert level", icon: Bell, hint: "When to warn 'running low'" },
];

function ItemModal({ meta, fac, itemId, onClose, onChanged }: { meta: Meta; fac: Fac; itemId: number; onClose: () => void; onChanged: () => void }) {
  const [row, setRow] = useState<FacStockRow | null>(null);
  const [hist, setHist] = useState<Movement[] | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [qty, setQty] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [toFac, setToFac] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        api.get("/stock", { params: { facilityId: fac.facilityId } }),
        api.get("/stock-admin/movements", { params: { facilityId: fac.facilityId, itemId, perPage: 15 } }),
      ]);
      setRow((s.data?.items ?? []).find((r: FacStockRow) => r.itemId === itemId) ?? null);
      setHist(h.data?.movements ?? []);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }, [fac.facilityId, itemId]);
  useEffect(() => { load(); }, [load]);

  function pick(a: Action) {
    setAction(a);
    setQty(a === "level" ? String(row?.lowLevel ?? "") : a === "count" ? String(row?.quantity ?? "") : "");
    setBatch(""); setExpiry(""); setNote(""); setToFac("");
  }

  async function save() {
    if (!row || !action) return;
    const q = Number(qty);
    if (!(qty !== "" && q >= 0) || (action !== "count" && action !== "level" && q <= 0)) return toast.error("Enter a valid quantity.");
    if (action === "count" && note.trim().length < 3) return toast.error("Add a short note for the count (e.g. 'Monthly count').");
    if (action === "transfer" && !toFac) return toast.error("Choose the facility to send to.");
    setBusy(true);
    try {
      const base = { facilityId: fac.facilityId, itemId };
      const { data } =
        action === "receive" ? await api.post("/stock/receive", { ...base, quantity: q, batchNo: batch || undefined, expiryDate: expiry || undefined, note: note || undefined })
        : action === "count" ? await api.post("/stock/adjust", { ...base, countedQuantity: q, note })
        : action === "expired" ? await api.post("/stock/expired", { ...base, quantity: q, note: note || undefined })
        : action === "transfer" ? await api.post("/stock/transfer", { ...base, toFacilityId: Number(toFac), quantity: q, note: note || undefined })
        : await api.put("/stock/level", { ...base, lowLevel: Math.round(q) });
      toast.success(data?.message ?? "Saved.");
      setAction(null);
      await load();
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const item = meta.items.find((i) => i.id === itemId);
  return (
    <Modal onClose={() => !busy && onClose()} wide>
      <ModalHead title={item?.name ?? "Item"} sub={`${fac.facilityName}${fac.facilityState ? ` · ${fac.facilityState}` : ""}`} onClose={onClose} />
      {!row ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`${card} p-3`}><p className="text-xs text-gray-500">In stock</p><p className={`text-2xl font-bold ${row.status === "out" ? "text-red-600" : row.status === "low" ? "text-amber-600" : "text-gray-900 dark:text-white"}`}>{num(row.quantity)} <span className="text-sm font-medium text-gray-500">{row.unit}</span></p></div>
            <div className={`${card} p-3`}><p className="text-xs text-gray-500">Alert level</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{row.lowLevel}</p></div>
            <div className={`${card} p-3`}><p className="text-xs text-gray-500">Used (30 days)</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{num(row.usedLast30)}</p></div>
            <div className={`${card} p-3`}><p className="text-xs text-gray-500">Lasts about</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{row.daysLeft == null ? "—" : `${row.daysLeft} d`}</p></div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ACTIONS.map((a) => (
              <button key={a.key} type="button" onClick={() => pick(a.key)} className={`text-left rounded-xl border p-3 ${action === a.key ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}>
                <a.icon className="w-4 h-4 text-green-700" />
                <span className="block text-sm font-semibold text-gray-900 dark:text-white mt-1">{a.label}</span>
                <span className="block text-xs text-gray-500">{a.hint}</span>
              </button>
            ))}
          </div>

          {action ? (
            <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {action === "count" ? `Counted on the shelf (${row.unit})` : action === "level" ? "Warn when stock falls to" : `Quantity (${row.unit})`}
                </span>
                <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className={field} autoFocus />
              </label>
              {action === "transfer" ? (
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Send to</span>
                  <select value={toFac} onChange={(e) => setToFac(e.target.value)} className={field}>
                    <option value="">Choose a facility…</option>
                    {meta.facilities.filter((f) => f.facilityId !== fac.facilityId).map((f) => <option key={f.facilityId} value={f.facilityId}>{f.facilityName}{f.facilityState ? ` (${f.facilityState})` : ""}</option>)}
                  </select>
                </label>
              ) : null}
              {action === "receive" ? (
                <>
                  <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Batch / lot number</span><input value={batch} onChange={(e) => setBatch(e.target.value)} className={field} /></label>
                  <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expiry date</span><input type="date" min={today()} value={expiry} onChange={(e) => setExpiry(e.target.value)} className={field} /></label>
                </>
              ) : null}
              {action !== "level" ? (
                <label className="block sm:col-span-2"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Note{action === "count" ? " (required)" : ""}</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === "count" ? "e.g. Monthly count — 2 found damaged" : "Optional"} className={field} /></label>
              ) : null}
              {action === "count" && qty !== "" ? (
                <p className="sm:col-span-2 text-sm text-gray-600 dark:text-gray-300">Difference: <b>{num(Number(qty) - row.quantity)}</b> {row.unit} (recorded as an adjustment).</p>
              ) : null}
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setAction(null)} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>Cancel</button>
                <button type="button" onClick={save} disabled={busy} className={`${btn} bg-green-700 hover:bg-green-800 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save</button>
              </div>
            </div>
          ) : null}

          <h4 className="mt-5 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Recent movements</h4>
          {!hist ? <Spinner /> : !hist.length ? <p className="text-sm text-gray-500">No movements yet.</p> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700">
              {hist.map((m) => (
                <li key={m.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                  <span className={`w-16 text-right font-semibold tabular-nums ${m.quantity >= 0 ? "text-green-700" : "text-red-600"}`}>{m.quantity >= 0 ? "+" : ""}{num(m.quantity)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white">{m.typeLabel}{m.otherFacility ? ` · ${m.otherFacility}` : ""}{m.batchNo ? ` · batch ${m.batchNo}` : ""}</p>
                    <p className="text-xs text-gray-500 truncate">{when(m.at)}{m.by ? ` · ${m.by}` : ""}{m.note ? ` · ${m.note}` : ""}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">bal. {num(m.balanceAfter)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

/** All items at one facility. */
function FacilityModal({ meta, fac, onClose, onOpenItem }: { meta: Meta; fac: Fac; onClose: () => void; onOpenItem: (itemId: number) => void }) {
  const [rows, setRows] = useState<FacStockRow[] | null>(null);
  useEffect(() => {
    api.get("/stock", { params: { facilityId: fac.facilityId } }).then(({ data }) => setRows(data?.items ?? [])).catch((e) => { toast.error(friendlyError(e)); setRows([]); });
  }, [fac.facilityId]);
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={fac.facilityName} sub={`${fac.facilityState ?? ""} · tap an item to receive, count, remove or transfer`} onClose={onClose} />
      {!rows ? <Spinner /> : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700">
          {rows.map((r) => (
            <li key={r.itemId}>
              <button type="button" onClick={() => onOpenItem(r.itemId)} className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <span className={`w-2 h-8 rounded-full ${r.status === "out" ? "bg-red-500" : r.status === "low" ? "bg-amber-500" : "bg-green-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-gray-500">Alert at {r.lowLevel} · used {num(r.usedLast30)} in 30 days{r.daysLeft != null ? ` · lasts ~${r.daysLeft} days` : ""}</p>
                </div>
                <span className={`text-lg font-bold tabular-nums ${r.status === "out" ? "text-red-600" : r.status === "low" ? "text-amber-600" : "text-gray-900 dark:text-white"}`}>{num(r.quantity)}</span>
                <span className="text-xs text-gray-500 w-12">{r.unit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab: stock levels across facilities
// ═════════════════════════════════════════════════════════════════════════
function Levels({ meta, reloadKey, onChanged }: { meta: Meta; reloadKey: number; onChanged: () => void }) {
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<"tracked" | "problems" | "all">("tracked");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: MatrixItem[]; facilities: MatrixRow[]; summary: { tracking: number; withOut: number; withLow: number }; last_page: number; total: number } | null>(null);
  const [openFac, setOpenFac] = useState<Fac | null>(null);
  const [openCell, setOpenCell] = useState<{ fac: Fac; itemId: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/stock-admin/matrix", { params: { state: state || undefined, search: search.trim() || undefined, show, page } });
      setData(data);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }, [state, search, show, page]);
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search, reloadKey]);
  useEffect(() => setPage(1), [state, search, show]);

  return (
    <div className="space-y-4">
      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`${card} p-4`}><p className="text-xs text-gray-500">Facilities tracking stock</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.tracking}</p></div>
          <button type="button" onClick={() => setShow("problems")} className={`${card} p-4 text-left`}><p className="text-xs text-gray-500">With an item out of stock</p><p className="text-2xl font-bold text-red-600">{data.summary.withOut}</p></button>
          <button type="button" onClick={() => setShow("problems")} className={`${card} p-4 text-left`}><p className="text-xs text-gray-500">With an item running low</p><p className="text-2xl font-bold text-amber-600">{data.summary.withLow}</p></button>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search facility" />
        {meta.states.length > 1 ? (
          <Select value={state} onChange={setState}>
            <option value="">All states</option>
            {meta.states.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        ) : null}
        <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1 self-start">
          {([["tracked", "Tracking stock"], ["problems", "Low or out"], ["all", "All facilities"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setShow(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${show === k ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>{l}</button>
          ))}
        </div>
      </div>

      {!data ? <Spinner /> : !data.facilities.length ? (
        <Empty text={show === "problems" ? "No facility is low on or out of stock." : show === "tracked" ? "No facility has recorded stock yet. Use “Record delivery” to add the first stock, or choose “All facilities”." : "No facility matches."} />
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/40 text-xs text-gray-500">
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 text-left px-4 py-3 min-w-[200px]">Facility</th>
                  {data.items.map((i) => (
                    <th key={i.id} className="px-2 py-3 text-center font-semibold min-w-[84px]" title={`${i.name} — ${num(i.total)} ${i.unit} in total`}>
                      <span className="block leading-tight">{i.name.replace(/ \(.*\)$/, "").replace(/ test kit$| kit$/i, "")}</span>
                      <span className="block font-normal text-[11px] text-gray-400">{num(i.total)} {i.unit}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.facilities.map((f) => (
                  <tr key={f.facilityId}>
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-2.5">
                      <button type="button" onClick={() => setOpenFac(f)} className="text-left">
                        <span className="block font-semibold text-gray-900 dark:text-white hover:text-green-700">{f.facilityName}</span>
                        <span className="block text-xs text-gray-500">
                          {f.facilityState ?? ""}
                          {f.out ? <span className="text-red-600"> · {f.out} out</span> : null}
                          {f.low ? <span className="text-amber-600"> · {f.low} low</span> : null}
                        </span>
                      </button>
                    </td>
                    {data.items.map((i) => {
                      const c = f.cells[i.id];
                      return (
                        <td key={i.id} className="px-1.5 py-1.5 text-center">
                          <button type="button" onClick={() => setOpenCell({ fac: f, itemId: i.id })} title={c?.status === "none" ? "Not stocked yet — click to receive" : `Alert at ${c?.lowLevel}`} className={`w-full rounded-lg px-2 py-1.5 font-semibold tabular-nums hover:ring-2 hover:ring-green-600/40 ${STATUS[c?.status ?? "none"]}`}>
                            {c?.status === "none" ? "·" : num(c?.quantity)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100" /> OK</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" /> At or below alert level</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200" /> Out</span>
              <span>· not stocked</span>
            </div>
            <Pager page={page} last={data.last_page} onPage={setPage} />
          </div>
        </div>
      )}

      {openFac ? <FacilityModal meta={meta} fac={openFac} onClose={() => setOpenFac(null)} onOpenItem={(itemId) => { setOpenCell({ fac: openFac, itemId }); setOpenFac(null); }} /> : null}
      {openCell ? <ItemModal meta={meta} fac={openCell.fac} itemId={openCell.itemId} onClose={() => setOpenCell(null)} onChanged={() => { load(); onChanged(); }} /> : null}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab: record a delivery (to one or many facilities)
// ═════════════════════════════════════════════════════════════════════════
function Deliver({ meta, onDone }: { meta: Meta; onDone: () => void }) {
  const items = meta.items.filter((i) => i.active);
  const [itemId, setItemId] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<{ facilityId: string; quantity: string }[]>([{ facilityId: meta.national ? "" : String(meta.myFacilityId ?? ""), quantity: "" }]);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const item = items.find((i) => String(i.id) === itemId);
  const facOpts = meta.facilities.filter((f) => !state || f.facilityState === state);
  const valid = lines.filter((l) => l.facilityId && Number(l.quantity) > 0);
  const total = valid.reduce((s, l) => s + Number(l.quantity), 0);
  const dupes = new Set(valid.map((l) => l.facilityId)).size !== valid.length;
  const setLine = (i: number, k: "facilityId" | "quantity", v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const name = (id: string) => meta.facilities.find((f) => String(f.facilityId) === id)?.facilityName ?? "";

  function addAllInState() {
    if (!state) return;
    const have = new Set(lines.map((l) => l.facilityId));
    const extra = facOpts.filter((f) => !have.has(String(f.facilityId))).map((f) => ({ facilityId: String(f.facilityId), quantity: "" }));
    setLines((ls) => [...ls.filter((l) => l.facilityId || l.quantity), ...extra]);
  }

  async function save() {
    setBusy(true);
    try {
      const { data } = await api.post("/stock-admin/receive-bulk", {
        itemId: Number(itemId), batchNo: batch || undefined, expiryDate: expiry || undefined, note: note || undefined,
        lines: valid.map((l) => ({ facilityId: Number(l.facilityId), quantity: Number(l.quantity) })),
      });
      toast.success(data?.message ?? "Delivery recorded.");
      setConfirm(false);
      setLines([{ facilityId: meta.national ? "" : String(meta.myFacilityId ?? ""), quantity: "" }]);
      setBatch(""); setExpiry(""); setNote("");
      onDone();
    } catch (e) {
      toast.error(friendlyError(e, "Could not record the delivery."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${card} p-4 sm:p-6 space-y-5 max-w-4xl`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-green-700" /></div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record a delivery</h2>
          <p className="text-sm text-gray-500">One consignment, shared out to one or more facilities. Each facility&apos;s stock goes up and the batch is kept for expiry tracking.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Item</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={field}>
            <option value="">Choose an item…</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
        </label>
        <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Batch / lot number</span><input value={batch} onChange={(e) => setBatch(e.target.value)} className={field} /></label>
        <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expiry date</span><input type="date" min={today()} value={expiry} onChange={(e) => setExpiry(e.target.value)} className={field} /></label>
        <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Waybill 0423 from NICRAT store" className={field} /></label>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Facilities and quantities</p>
          {meta.national && meta.states.length > 1 ? (
            <div className="flex gap-2">
              <Select value={state} onChange={setState}>
                <option value="">Any state</option>
                {meta.states.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <button type="button" disabled={!state} onClick={addAllInState} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}><Building2 className="w-4 h-4" /> Add all in state</button>
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select value={l.facilityId} onChange={(e) => setLine(i, "facilityId", e.target.value)} className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                <option value="">Facility…</option>
                {(l.facilityId && !facOpts.some((f) => String(f.facilityId) === l.facilityId) ? meta.facilities.filter((f) => String(f.facilityId) === l.facilityId) : []).concat(facOpts).map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>{f.facilityName}{f.facilityState ? ` (${f.facilityState})` : ""}</option>
                ))}
              </select>
              <input type="number" min={0} value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} placeholder={item?.unit ?? "Qty"} className="w-28 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
              <button type="button" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [{ facilityId: "", quantity: "" }]))} className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Remove line"><Minus className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        {meta.national || meta.facilities.length > 1 ? (
          <button type="button" onClick={() => setLines((ls) => [...ls, { facilityId: "", quantity: "" }])} className={`${btn} mt-2 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20`}><Plus className="w-4 h-4" /> Add a facility</button>
        ) : null}
        {dupes ? <p className="text-sm text-red-600 mt-2">A facility is listed twice — combine the quantities.</p> : null}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">{valid.length ? <>Total <b>{num(total)} {item?.unit ?? ""}</b> to <b>{valid.length}</b> {valid.length === 1 ? "facility" : "facilities"}</> : "Add at least one facility and quantity."}</p>
        <button type="button" disabled={!item || !valid.length || dupes} onClick={() => setConfirm(true)} className={`${btn} px-5 py-3 bg-green-700 hover:bg-green-800 text-white`}><Truck className="w-4 h-4" /> Record delivery</button>
      </div>

      {confirm && item ? (
        <Modal onClose={() => !busy && setConfirm(false)}>
          <ModalHead title="Record this delivery?" onClose={() => setConfirm(false)} />
          <p className="text-sm text-gray-700 dark:text-gray-200"><b>{num(total)} {item.unit}</b> of <b>{item.name}</b>{batch ? `, batch ${batch}` : ""}{expiry ? `, expiring ${day(expiry)}` : ""}:</p>
          <ul className="mt-3 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
            {valid.map((l) => <li key={l.facilityId} className="px-3 py-2 flex justify-between gap-3"><span className="text-gray-800 dark:text-gray-100">{name(l.facilityId)}</span><b className="tabular-nums">+{num(Number(l.quantity))}</b></li>)}
          </ul>
          <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button type="button" onClick={() => setConfirm(false)} disabled={busy} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>Cancel</button>
            <button type="button" onClick={save} disabled={busy} className={`${btn} bg-green-700 hover:bg-green-800 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Record</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab: movement history + CSV
// ═════════════════════════════════════════════════════════════════════════
function HistoryTab({ meta, reloadKey }: { meta: Meta; reloadKey: number }) {
  const [f, setF] = useState({ facilityId: "", state: "", itemId: "", type: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ movements: Movement[]; last_page: number; total: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const params = useMemo(() => Object.fromEntries(Object.entries(f).filter(([, v]) => v)), [f]);
  const set = (k: keyof typeof f) => (v: string) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };

  useEffect(() => {
    setData(null);
    api.get("/stock-admin/movements", { params: { ...params, page } }).then(({ data }) => setData(data)).catch((e) => { toast.error(friendlyError(e)); setData({ movements: [], last_page: 1, total: 0 }); });
  }, [params, page, reloadKey]);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await api.get("/stock-admin/movements/export", { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ncsr-stock-movements-${today()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(friendlyError(e, "Could not export."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <Select value={f.facilityId} onChange={set("facilityId")} className="col-span-2">
          <option value="">All facilities</option>
          {meta.facilities.filter((x) => !f.state || x.facilityState === f.state).map((x) => <option key={x.facilityId} value={x.facilityId}>{x.facilityName}</option>)}
        </Select>
        {meta.states.length > 1 ? (
          <Select value={f.state} onChange={set("state")}>
            <option value="">All states</option>
            {meta.states.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        ) : <span className="hidden lg:block" />}
        <Select value={f.itemId} onChange={set("itemId")}>
          <option value="">All items</option>
          {meta.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
        <Select value={f.type} onChange={set("type")} className="col-span-2 lg:col-span-1">
          <option value="">All movements</option>
          {meta.movementTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <div className="col-span-2 lg:col-span-1 flex gap-2">
          <input type="date" value={f.from} onChange={(e) => set("from")(e.target.value)} className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-900 dark:text-white" title="From" />
          <input type="date" value={f.to} onChange={(e) => set("to")(e.target.value)} className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-900 dark:text-white" title="To" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">{data ? `${data.total} movement${data.total === 1 ? "" : "s"}` : ""}</p>
        <button type="button" onClick={exportCsv} disabled={exporting || !data?.total} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>{exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV</button>
      </div>
      {!data ? <Spinner /> : !data.movements.length ? <Empty text="No stock movements match." /> : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/40 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Facility</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                {data.movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{when(m.at)}</td>
                    <td className="px-4 py-2.5"><span className="block">{m.facility}</span><span className="text-xs text-gray-500">{m.state}</span></td>
                    <td className="px-4 py-2.5">{m.item}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{m.typeLabel}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${m.quantity >= 0 ? "text-green-700" : "text-red-600"}`}>{m.quantity >= 0 ? "+" : ""}{num(m.quantity)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{num(m.balanceAfter)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 min-w-[200px]">
                      {[m.otherFacility, m.batchNo ? `Batch ${m.batchNo}` : null, m.expiryDate ? `Exp. ${day(m.expiryDate)}` : null, m.sampleId ? `Sample #${m.sampleId}` : null, m.note, m.by ? `by ${m.by}` : null].filter(Boolean).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} last={data.last_page} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab: batches expiring soon
// ═════════════════════════════════════════════════════════════════════════
function Expiring({ meta, reloadKey, onOpen }: { meta: Meta; reloadKey: number; onOpen: (fac: Fac, itemId: number) => void }) {
  const [days, setDays] = useState(60);
  const [state, setState] = useState("");
  const [rows, setRows] = useState<Movement[] | null>(null);
  useEffect(() => {
    setRows(null);
    api.get("/stock-admin/expiring", { params: { days, state: state || undefined } }).then(({ data }) => setRows(data?.batches ?? [])).catch((e) => { toast.error(friendlyError(e)); setRows([]); });
  }, [days, state, reloadKey]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {[30, 60, 90, 180].map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-full text-sm border ${days === d ? "bg-green-700 border-green-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>Next {d} days</button>
        ))}
        {meta.states.length > 1 ? (
          <Select value={state} onChange={setState}>
            <option value="">All states</option>
            {meta.states.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        ) : null}
      </div>
      <p className="text-sm text-gray-500">Batches received with an expiry date in this period, at facilities that still hold the item. Use them first, move them to a busier facility, or record them as expired.</p>
      {!rows ? <Spinner /> : !rows.length ? <Empty text={`No batch expires in the next ${days} days.`} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((m) => {
            const expired = (m.daysLeft ?? 0) < 0;
            return (
              <button key={m.id} type="button" onClick={() => onOpen({ facilityId: m.facilityId, facilityName: m.facility ?? "", facilityState: m.state }, m.itemId)} className={`${card} p-4 text-left flex gap-3 hover:ring-2 hover:ring-green-600/30`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${expired ? "bg-red-100" : "bg-amber-100"}`}>{expired ? <AlertTriangle className="w-5 h-5 text-red-700" /> : <CalendarClock className="w-5 h-5 text-amber-700" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{m.item}{m.batchNo ? <span className="font-normal text-gray-500"> · batch {m.batchNo}</span> : null}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{m.facility}{m.state ? `, ${m.state}` : ""}</p>
                  <p className="text-xs mt-1">
                    <span className={expired ? "text-red-600 font-semibold" : "text-amber-700 font-semibold"}>{expired ? `Expired ${day(m.expiryDate)}` : `Expires ${day(m.expiryDate)} (${m.daysLeft} days)`}</span>
                    <span className="text-gray-500"> · received {num(m.quantity)} on {day(m.at)} · {num(m.inStock)} {m.unit} in stock now</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab: stock items catalogue
// ═════════════════════════════════════════════════════════════════════════
function Items({ meta, onChanged }: { meta: Meta; onChanged: () => void }) {
  const [rows, setRows] = useState<FullItem[] | null>(null);
  const [edit, setEdit] = useState<Partial<FullItem> | null>(null);
  const [busy, setBusy] = useState(false);
  const testLabel = (k: string) => meta.tests.find((t) => t.value === k)?.label ?? k;
  const load = useCallback(() => {
    api.get("/stock-admin/items").then(({ data }) => setRows(data?.items ?? [])).catch((e) => { toast.error(friendlyError(e)); setRows([]); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(next?: Partial<FullItem>) {
    const it = { ...edit, ...next } as Partial<FullItem>;
    if (!it.name?.trim() || !it.unit?.trim()) return toast.error("Enter the name and the unit.");
    setBusy(true);
    try {
      const body = { name: it.name.trim(), code: it.code || undefined, unit: it.unit.trim(), testTypes: it.testTypes ?? [], perTest: Number(it.perTest ?? 0), defaultLowLevel: Number(it.defaultLowLevel ?? 0), active: it.active ?? true };
      const { data } = it.id ? await api.put(`/stock-admin/items/${it.id}`, body) : await api.post("/stock-admin/items", body);
      toast.success(data?.message ?? "Saved.");
      setEdit(null);
      load();
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e, "Could not save the item."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-gray-500 max-w-2xl">
          What is tracked at every facility. An item linked to a test is deducted automatically each time that test&apos;s sample is taken (“per test”).
          {meta.canManageItems ? "" : " Only super admins and NICRAT admins can change this list."}
        </p>
        {meta.canManageItems ? (
          <button type="button" onClick={() => setEdit({ name: "", unit: "pieces", testTypes: [], perTest: 1, defaultLowLevel: 20, active: true })} className={`${btn} bg-green-700 hover:bg-green-800 text-white shrink-0`}><Plus className="w-4 h-4" /> Add item</button>
        ) : null}
      </div>
      {!rows ? <Spinner /> : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/40 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Used by tests</th><th className="px-4 py-3 text-right">Per test</th><th className="px-4 py-3 text-right">Alert at</th><th className="px-4 py-3 text-right">Held</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                {rows.map((i) => (
                  <tr key={i.id} className={i.active ? "" : "opacity-50"}>
                    <td className="px-4 py-3"><span className="block font-semibold text-gray-900 dark:text-white">{i.name}{!i.active ? <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">Inactive</span> : null}</span><span className="text-xs text-gray-500">{i.code} · {i.unit}</span></td>
                    <td className="px-4 py-3 max-w-xs"><div className="flex flex-wrap gap-1">{i.testTypes.length ? i.testTypes.map((t) => <span key={t} className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700">{testLabel(t)}</span>) : <span className="text-xs text-gray-400">Not linked (counted only)</span>}</div></td>
                    <td className="px-4 py-3 text-right tabular-nums">{i.perTest ? num(i.perTest) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{i.defaultLowLevel}</td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{num(i.total)} <span className="text-xs text-gray-500">at {i.facilities}</span></td>
                    <td className="px-4 py-3 text-right">{meta.canManageItems ? <button type="button" onClick={() => setEdit(i)} className={`${btn} border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200`}><Pencil className="w-4 h-4" /> Edit</button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {edit ? (
        <Modal onClose={() => !busy && setEdit(null)}>
          <ModalHead title={edit.id ? `Edit ${edit.name}` : "Add a stock item"} onClose={() => setEdit(null)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name</span><input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. HPV self-sampling kit" className={field} /></label>
            <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Unit</span><input value={edit.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="kits, pieces, bottles" className={field} /></label>
            <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Code</span><input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="Made from the name" className={field} /></label>
            <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Used per test</span><input type="number" min={0} step="0.5" value={edit.perTest ?? 0} onChange={(e) => setEdit({ ...edit, perTest: Number(e.target.value) })} className={field} /><span className="text-xs text-gray-500">0 = not deducted automatically</span></label>
            <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Default alert level</span><input type="number" min={0} value={edit.defaultLowLevel ?? 0} onChange={(e) => setEdit({ ...edit, defaultLowLevel: Number(e.target.value) })} className={field} /><span className="text-xs text-gray-500">Facilities can set their own</span></label>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Deduct when these tests are taken</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {meta.tests.map((t) => {
              const on = (edit.testTypes ?? []).includes(t.value);
              return (
                <button key={t.value} type="button" onClick={() => setEdit({ ...edit, testTypes: on ? (edit.testTypes ?? []).filter((x) => x !== t.value) : [...(edit.testTypes ?? []), t.value] })} className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-green-700 border-green-700 text-white" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>{t.label}</button>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            {edit.id ? (
              <button type="button" disabled={busy} onClick={() => save({ active: !edit.active })} className={`${btn} ${edit.active ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-green-700 hover:bg-green-50"}`}>{edit.active ? "Deactivate item" : "Reactivate item"}</button>
            ) : <span />}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button type="button" onClick={() => setEdit(null)} disabled={busy} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button type="button" onClick={() => save()} disabled={busy} className={`${btn} bg-green-700 hover:bg-green-800 text-white`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "levels", label: "Stock levels", icon: Package },
  { key: "deliver", label: "Record delivery", icon: Truck },
  { key: "history", label: "History", icon: History },
  { key: "expiring", label: "Expiring", icon: CalendarClock },
  { key: "items", label: "Stock items", icon: ListChecks },
];

export default function StockPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("levels");
  const [k, setK] = useState(0);
  const [open, setOpen] = useState<{ fac: Fac; itemId: number } | null>(null);
  const bump = () => setK((x) => x + 1);

  const loadMeta = useCallback(() => {
    api.get("/stock-admin/meta").then(({ data }) => setMeta(data)).catch((e) => setError(friendlyError(e, "Could not load stock.")));
  }, []);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  return (
    <Layout>
      <PageTitle>Stock Management</PageTitle>
      <div className="flex items-start justify-between gap-3 mb-4 -mt-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">Screening kits and consumables at each facility. Taking a sample deducts its kit automatically; record deliveries, counts and transfers here or in the NCSR Mobile App.</p>
        <button type="button" onClick={() => { loadMeta(); bump(); }} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 shrink-0`}><RefreshCw className="w-4 h-4" /><span className="hidden sm:inline">Refresh</span></button>
      </div>

      {error ? <Empty text={error} /> : !meta ? <Spinner /> : (
        <>
          <div className="flex gap-1 overflow-x-auto mb-5 border-b border-gray-200 dark:border-gray-700">
            {TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === t.key ? "border-green-700 text-green-800 dark:text-green-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
          <div className="pb-10">
            {tab === "levels" ? <Levels meta={meta} reloadKey={k} onChanged={bump} />
              : tab === "deliver" ? <Deliver meta={meta} onDone={() => { bump(); setTab("levels"); }} />
              : tab === "history" ? <HistoryTab meta={meta} reloadKey={k} />
              : tab === "expiring" ? <Expiring meta={meta} reloadKey={k} onOpen={(fac, itemId) => setOpen({ fac, itemId })} />
              : <Items meta={meta} onChanged={() => { loadMeta(); bump(); }} />}
          </div>
          {open ? <ItemModal meta={meta} fac={open.fac} itemId={open.itemId} onClose={() => setOpen(null)} onChanged={bump} /> : null}
        </>
      )}
    </Layout>
  );
}
