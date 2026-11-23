import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Search, Loader2, ChevronLeft, ChevronRight, UserRound } from "lucide-react";

import api from "../lib/api";

/**
 * Lists the clients behind one Case Outcomes card (GET /outcomes?status=...).
 * The status rules are the same as /outcomes/statistics, so the list matches the card's number.
 */
type Props = {
  open: boolean;
  status: string;
  title: string;
  description?: string;
  facilityId?: string;
  onClose: () => void;
};

const PER_PAGE = 15;

const human = (v?: string | null) => (v ? String(v).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—");
const fmt = (d?: string | null) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function OutcomeClientsModal({ open, status, title, description, facilityId, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reqId = useRef(0);

  async function load(p: number, q = search) {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/outcomes", {
        params: { status, page: p, limit: PER_PAGE, search: q.trim() || undefined, facilityId: facilityId || undefined },
      });
      if (id !== reqId.current) return;
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
      setLastPage(data.last_page ?? 1);
      setPage(data.current_page ?? p);
    } catch {
      if (id === reqId.current) setError("Could not load the clients. Please try again.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setRows([]);
    load(1, "");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status, facilityId]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl whitespace-normal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title} <span className="text-gray-400 font-normal">({total.toLocaleString()})</span>
            </h3>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:px-5 border-b border-gray-100 dark:border-gray-700">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load(1);
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or Client ID"
              className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
            />
            <button type="submit" className="h-10 px-4 rounded-xl bg-green-700 hover:bg-green-800 text-white" aria-label="Search">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading && rows.length === 0 ? (
            <div className="py-10 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-green-600 mx-auto" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No clients found.</p>
          ) : (
            <ul className={`space-y-2 ${loading ? "opacity-60" : ""}`}>
              {rows.map((r) => {
                const name = r.client?.fullName ?? r.client?.full_name ?? r.clientId;
                const details = [
                  r.cancerType && human(r.cancerType),
                  r.cancerStage && `Stage ${String(r.cancerStage).replace(/^stage_/i, "")}`,
                  r.diagnosisDate && `Diagnosed ${fmt(r.diagnosisDate)}`,
                ].filter(Boolean);
                const status2 = [
                  r.treatmentStatus && `Treatment: ${human(r.treatmentStatus)}`,
                  r.clinicalOutcome && `Outcome: ${human(r.clinicalOutcome)}`,
                  r.nextFollowUpDate && `Next follow-up ${fmt(r.nextFollowUpDate)}`,
                ].filter(Boolean);
                return (
                  <li key={r.outcomeId ?? r.clientId} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-white break-words">{name}</p>
                        <p className="text-xs text-green-700 font-medium break-all">{r.clientId}</p>
                      </div>
                      <Link
                        href={`/ncsr/client-details?clientId=${encodeURIComponent(r.clientId)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <UserRound className="w-3 h-3" /> Open record
                      </Link>
                    </div>
                    {details.length > 0 && <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{details.join(" · ")}</p>}
                    {status2.length > 0 && <p className="text-xs text-gray-500 mt-1">{status2.join(" · ")}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lastPage > 1 && (
          <div className="flex items-center justify-between gap-3 p-3 sm:px-5 border-t border-gray-100 dark:border-gray-700 text-sm">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-gray-500">Page {page} of {lastPage}</span>
            <button
              type="button"
              disabled={page >= lastPage || loading}
              onClick={() => load(page + 1)}
              className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
