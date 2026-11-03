import React, { useEffect, useState } from "react";
import { CloudOff, RefreshCw, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { discardItem, flushOutbox, retryFailed, startSyncEngine, useSyncStatus } from "../../lib/offlineSync";

/**
 * Render once (in _app.tsx or Layout). Starts the sync engine and shows a small pill:
 *   offline · N waiting  /  syncing…  /  N need attention  /  hidden when everything is synced.
 * Click it to see queued records, the real Client IDs assigned so far, and retry/discard failed items.
 */
export default function SyncStatus() {
  const s = useSyncStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    startSyncEngine();
  }, []);

  const mappings = Object.entries(s.idMap);
  const nothing = s.pending === 0 && s.failed === 0;
  if (nothing && s.online && mappings.length === 0) return null;

  const tone = s.failed > 0 ? "bg-red-600" : !s.online ? "bg-amber-600" : s.syncing ? "bg-blue-600" : "bg-green-700";
  const text =
    s.failed > 0
      ? `${s.failed} need attention`
      : !s.online
      ? `Offline${s.pending ? ` · ${s.pending} waiting to sync` : ""}`
      : s.syncing
      ? "Syncing…"
      : s.pending > 0
      ? `${s.pending} waiting to sync`
      : "All synced";
  const Icon = s.failed > 0 ? AlertTriangle : !s.online ? CloudOff : s.syncing ? RefreshCw : CheckCircle2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed left-3 bottom-3 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg ${tone}`}
      >
        <Icon className={`w-4 h-4 ${s.syncing ? "animate-spin" : ""}`} />
        {text}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-white">Offline data & sync</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Records captured without a connection are kept on this device and sent automatically when the network
              returns. Don't log out or clear browser data while items are waiting.
            </p>

            {s.items.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing waiting.</p>
            ) : (
              <ul className="space-y-2">
                {s.items.map((i) => (
                  <li
                    key={i.id}
                    className={`rounded-xl border p-3 text-sm ${
                      i.status === "failed" ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">{i.label}</p>
                        <p className="text-xs text-gray-500">{new Date(i.createdAt).toLocaleString()}</p>
                        {i.error && <p className="text-xs text-red-700 mt-1">{i.error}</p>}
                      </div>
                      {i.status === "failed" && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-700 underline"
                          onClick={() => {
                            if (window.confirm("Discard this record? It will not be sent to the server.")) discardItem(i.id);
                          }}
                        >
                          Discard
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {mappings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Real Client IDs assigned</p>
                <ul className="space-y-1">
                  {mappings
                    .filter(([temp]) => temp.startsWith("OFFLINE-"))
                    .map(([temp, real]) => (
                      <li key={temp} className="text-xs text-gray-700">
                        <span className="text-gray-400">{temp}</span> → <span className="font-bold select-all">{real}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {s.failed > 0 && (
                <button
                  type="button"
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold"
                  onClick={() => retryFailed()}
                >
                  Retry failed
                </button>
              )}
              <button
                type="button"
                disabled={!s.online || s.syncing}
                className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => flushOutbox()}
              >
                Sync now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
