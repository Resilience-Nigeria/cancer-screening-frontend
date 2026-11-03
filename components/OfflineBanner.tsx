import React, { useEffect, useState } from "react";
import { isOfflineReady, prepareForOffline, useOnlineStatus } from "../../lib/pwa";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Global PWA UI, rendered once in _app.tsx:
 *  - an amber bar while the device is offline
 *  - a small card offering "Install app" and "Make available offline"
 */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ready, setReady] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setReady(isOfflineReady());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  async function makeOffline() {
    setMessage("");
    setProgress({ done: 0, total: 1 });
    const { failed } = await prepareForOffline((done, total) => setProgress({ done, total }));
    setProgress(null);
    if (failed === 0) {
      setReady(true);
      setMessage("Ready. The app will now open without internet.");
    } else {
      setMessage(`${failed} files could not be saved. Check your connection and try again.`);
    }
  }

  const showCard = online && !dismissed && (!ready || (installEvent && !standalone));

  return (
    <>
      {!online && (
        <div
          role="status"
          className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-sm font-semibold text-center px-4 py-2"
          style={{ zIndex: 70 }}
        >
          You're offline. Pages you've opened still work. Saving to the server needs a connection.
        </div>
      )}

      {showCard && (
        <div
          className="fixed right-4 bottom-4 w-72 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-4 space-y-3"
          style={{ zIndex: 40 }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-800 dark:text-white">Use NCSR without internet</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {installEvent && !standalone && (
            <button
              type="button"
              onClick={install}
              className="w-full rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2"
            >
              Install app
            </button>
          )}

          {!ready && (
            <button
              type="button"
              disabled={!!progress}
              onClick={makeOffline}
              className="w-full rounded-xl border border-green-700 text-green-700 hover:bg-green-50 text-sm font-semibold py-2 disabled:opacity-60"
            >
              {progress ? `Saving… ${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` : "Make available offline"}
            </button>
          )}

          {message && <p className="text-xs text-gray-600 dark:text-gray-300">{message}</p>}
        </div>
      )}
    </>
  );
}
