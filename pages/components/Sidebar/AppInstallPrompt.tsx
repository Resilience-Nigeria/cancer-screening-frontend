"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Smartphone, X, ExternalLink, WifiOff, Bell, Fingerprint } from "lucide-react";
import api from "../../../lib/api";
import { getUser } from "../../../lib/auth";

/**
 * "Get the NCSR Mobile App" — shown to a signed-in user who opens the web app on a phone or tablet,
 * when an admin has turned it on (Mobile App → App versions → Install prompt on the web).
 *  - Android: download the newest APK (or open the app if it's already installed);
 *  - iPhone / iPad: only when an App Store / TestFlight link has been set.
 * "Not now" hides it for the number of days the admin chose; "I already have it" for 90 days.
 * Rendered once (the sidebar can be mounted twice) and into <body>, so it shows even when the sidebar is hidden.
 */
type Promo = {
  show: boolean;
  message: string;
  snoozeDays: number;
  android: { url: string; version: string; size?: number | null; package: string; scheme: string } | null;
  ios: { url: string } | null;
};

let claimed = false;

function platform(): "android" | "ios" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return null;
}

const snoozeKey = (uid: string | number) => `ncsr:app-prompt:${uid}`;
function snoozed(uid: string | number): boolean {
  try {
    const until = Number(window.localStorage.getItem(snoozeKey(uid)) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}
function snooze(uid: string | number, days: number) {
  try {
    window.localStorage.setItem(snoozeKey(uid), String(Date.now() + days * 86400000));
  } catch {
    // storage blocked — it will just ask again next time
  }
}

export default function AppInstallPrompt() {
  const [mine, setMine] = useState(false);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [os, setOs] = useState<"android" | "ios" | null>(null);
  const [steps, setSteps] = useState(false);
  const user = typeof window !== "undefined" ? getUser() : null;
  const uid = user?.id ?? "me";

  useEffect(() => {
    if (claimed) return;
    claimed = true;
    setMine(true);
    return () => {
      claimed = false;
    };
  }, []);

  useEffect(() => {
    if (!mine) return;
    const p = platform();
    if (!p || snoozed(uid)) return;
    setOs(p);
    api
      .get("/mobile/app-promo")
      .then((res: { data: Promo }) => setPromo(res.data))
      .catch(() => undefined); // older server or not allowed — no prompt
  }, [mine, uid]);

  if (!mine || !promo?.show || !os) return null;
  const target = os === "android" ? promo.android : promo.ios;
  if (!target) return null;

  const close = (days: number) => {
    snooze(uid, days);
    setPromo(null);
  };
  const mb = os === "android" && promo.android?.size ? ` · ${(promo.android.size / 1048576).toFixed(0)} MB` : "";
  const openIntent =
    os === "android" && promo.android
      ? `intent://open#Intent;scheme=${promo.android.scheme};package=${promo.android.package};S.browser_fallback_url=${encodeURIComponent(promo.android.url)};end`
      : null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={() => close(promo.snoozeDays || 7)}>
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          {/* Replace public/assets/img/ncsr-app-icon.png with the official icon if needed (same file name). */}
          <img src="/assets/img/ncsr-app-icon.png" alt="NCSR Mobile" className="w-16 h-16 rounded-2xl shadow-md" />
          <button type="button" onClick={() => close(promo.snoozeDays || 7)} className="p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Get the NCSR Mobile App</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{promo.message}</p>

        <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <li className="flex items-center gap-3"><WifiOff className="w-4 h-4 text-green-700 shrink-0" /> Works with no network — syncs when you&apos;re back online</li>
          <li className="flex items-center gap-3"><Bell className="w-4 h-4 text-green-700 shrink-0" /> Notifications for referrals, results and messages</li>
          <li className="flex items-center gap-3"><Fingerprint className="w-4 h-4 text-green-700 shrink-0" /> Sign in with your fingerprint — same NCSR account</li>
        </ul>

        {os === "android" && promo.android ? (
          <>
            <a href={promo.android.url} onClick={() => setSteps(true)} className="mt-5 flex items-center justify-center gap-2 w-full rounded-xl bg-green-700 hover:bg-green-800 px-4 py-3 text-white font-semibold">
              <Download className="w-5 h-5" /> Download for Android
            </a>
            <p className="mt-1.5 text-center text-xs text-gray-500">Version {promo.android.version}{mb}</p>
            {steps ? (
              <ol className="mt-3 rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-sm text-gray-700 dark:text-gray-200 list-decimal list-inside space-y-1">
                <li>When the download finishes, tap the file (or open it from your notifications).</li>
                <li>If asked, allow <b>“Install unknown apps”</b> for your browser, then tap <b>Install</b>.</li>
                <li>Open NCSR Mobile and sign in with your usual email and password.</li>
              </ol>
            ) : null}
            {openIntent ? (
              <a href={openIntent} onClick={() => close(90)} className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <Smartphone className="w-4 h-4" /> I already have it — open the app
              </a>
            ) : null}
          </>
        ) : promo.ios ? (
          <a href={promo.ios.url} target="_blank" rel="noreferrer" onClick={() => close(30)} className="mt-5 flex items-center justify-center gap-2 w-full rounded-xl bg-gray-900 hover:bg-black px-4 py-3 text-white font-semibold">
            <ExternalLink className="w-5 h-5" /> Get it for iPhone / iPad
          </a>
        ) : null}

        <div className="mt-3 flex justify-between text-sm">
          <button type="button" onClick={() => close(promo.snoozeDays || 7)} className="px-2 py-2 font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Not now</button>
          <button type="button" onClick={() => close(90)} className="px-2 py-2 font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Don&apos;t ask again</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
