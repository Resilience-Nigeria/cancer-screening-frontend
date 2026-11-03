import { useEffect, useState } from "react";

const READY_KEY = "ncsr-offline-ready";

/** Registers /sw.js. Skipped in development so hot reload isn't served from a stale cache. */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;

  const register = () =>
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed", err);
    });

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export function isOfflineReady(): boolean {
  try {
    return localStorage.getItem(READY_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Downloads every page and script chunk in the app so it opens with no connection.
 * Reads the list of pages from Next's own build manifest, so new pages are picked up automatically.
 * The service worker caches whatever these requests fetch.
 */
export async function prepareForOffline(
  onProgress?: (done: number, total: number) => void
): Promise<{ ok: number; failed: number }> {
  const w = window as any;
  const manifest: Record<string, any> = w.__BUILD_MANIFEST || {};
  const buildId: string | undefined = w.__NEXT_DATA__?.buildId;

  const skipPages = new Set(["/_app", "/_error", "/_document", "/404", "/500"]);
  const pages: string[] = (Array.isArray(manifest.sortedPages) ? manifest.sortedPages : Object.keys(manifest))
    .filter((p: string) => typeof p === "string" && p.startsWith("/") && !p.includes("[") && !skipPages.has(p));

  const assets = new Set<string>();
  Object.entries(manifest).forEach(([key, value]) => {
    if (key === "sortedPages" || key.startsWith("__")) return;
    if (Array.isArray(value)) value.forEach((f) => typeof f === "string" && assets.add(`/_next/${f}`));
  });
  if (buildId) {
    assets.add(`/_next/static/${buildId}/_buildManifest.js`);
    assets.add(`/_next/static/${buildId}/_ssgManifest.js`);
  }

  const jobs: Array<() => Promise<Response>> = [
    ...pages.map((p) => () => fetch(p, { headers: { Accept: "text/html" }, credentials: "same-origin" })),
    ...Array.from(assets).map((a) => () => fetch(a)),
  ];

  let done = 0;
  let ok = 0;
  let failed = 0;
  const total = jobs.length;
  onProgress?.(0, total);

  const queue = [...jobs];
  const worker = async () => {
    while (queue.length) {
      const job = queue.shift()!;
      try {
        const res = await job();
        if (res.ok) ok++;
        else failed++;
      } catch {
        failed++;
      }
      done++;
      onProgress?.(done, total);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  if (failed === 0) {
    try {
      localStorage.setItem(READY_KEY, "1");
    } catch {}
  }
  return { ok, failed };
}

/** Call on logout so a shared device keeps no cached reference data from the last user. */
export async function clearOfflineData(): Promise<void> {
  try {
    localStorage.removeItem(READY_KEY);
  } catch {}
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.active?.postMessage({ type: "CLEAR_DATA" });
}
