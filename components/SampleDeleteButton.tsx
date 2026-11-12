import React, { useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

import api from "../lib/api";
import { friendlyError } from "../lib/apiError";

let adminCache: boolean | null = null;

type Props = {
  sampleId: number;
  label: string; // e.g. "HPV DNA · SMP-0012"
  /** True once a result has been recorded. Then only an admin can delete; others send a request. */
  hasResult?: boolean;
  /** "link" (default) = small red text; "button" = outlined red button, e.g. in a table's Actions column. */
  appearance?: "link" | "button";
  onDone?: () => void;
};

/**
 * Admins delete (soft delete) after a warning and a reason. Everyone else sends a deletion request
 * that an admin has to approve. Either way nothing is permanently removed.
 */
export default function SampleDeleteButton({ sampleId, label, hasResult = false, appearance = "link", onDone }: Props) {
  const [isAdmin, setIsAdmin] = useState<boolean>(adminCache ?? false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Before a result exists anyone can delete straight away; after, only admins can.

  const direct = isAdmin || !hasResult;

  useEffect(() => {
    if (adminCache !== null) return;
    api
      .get("/screening-samples/deletion-access")
      .then(({ data }) => {
        adminCache = !!data?.isAdmin;
        setIsAdmin(adminCache);
      })
      .catch(() => {});
  }, []);

  const close = () => {
    setOpen(false);
    setReason("");
    setConfirmed(false);
  };

  async function submit() {
    if (reason.trim().length < 5) {
      toast.error("Give a short reason (at least 5 characters).");
      return;
    }
    if (direct && !confirmed) {
      toast.error("Tick the box to confirm the deletion.");
      return;
    }
    setBusy(true);
    try {
      if (direct) {
        await api.delete(`/screening-samples/${sampleId}`, { data: { reason: reason.trim(), confirm: true } });
        toast.success("Deleted. An admin can restore it from Deleted Records if needed.");
      } else {
        await api.post(`/screening-samples/${sampleId}/deletion-request`, { reason: reason.trim() });
        toast.success("Deletion request sent to an admin for approval.");
      }
      close();
      onDone?.();
    } catch (err: any) {
      toast.error(friendlyError(err, "Could not complete the request."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          appearance === "button"
            ? "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-600 bg-white dark:bg-gray-900 hover:bg-red-50"
            : "inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
        }
        title={direct ? "Delete" : "Request deletion"}
      >
        <Trash2 className="w-3 h-3" /> {direct ? "Delete" : "Request deletion"}
      </button>

      {/* Rendered on <body>, so a table cell's no-wrap / sticky styles can't squash the dialog. */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 whitespace-normal text-left" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 p-6 shadow-2xl break-words">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {direct ? "Delete this record?" : "Request deletion"}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-normal break-words">
                  {label}.{" "}
                  {direct
                    ? hasResult ? "It will be hidden from the app and kept in Deleted Records, where an admin can restore it." : "No result has been recorded for it yet. It will be hidden from the app and kept in Deleted Records, where an admin can restore it."
                    : "A result has already been recorded for it, so an admin has to approve this before it is removed."}
                </p>
              </div>
            </div>

            <label className="block mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Reason
              <textarea
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 p-3 text-sm"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Entered against the wrong client"
              />
            </label>

            {direct && (
              <label className="mt-3 flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I understand this removes the record from the client&apos;s results.
              </label>
            )}

            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button layout="outline" className="rounded-2xl" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button className="rounded-2xl bg-red-600 border-red-600 hover:bg-red-700" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : direct ? "Delete" : "Send request"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}