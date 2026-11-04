import { useEffect } from "react";
import { useRouter } from "next/router";

// Remembers the page the user was on before each navigation, so a page can offer
// "Back to <where you came from>" no matter how the user got there.

const KEY = "ncsr:previous-route";

const pathOf = (url: string) => url.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

export function getPreviousRoute(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Call once in pages/_app.tsx:  useRouteTracking();  */
export function useRouteTracking() {
  const router = useRouter();
  useEffect(() => {
    const onStart = (nextUrl: string) => {
      const current = router.asPath;
      // Ignore query-only changes (filters, tabs) so they don't overwrite the real origin.
      if (pathOf(current) === pathOf(nextUrl)) return;
      try {
        sessionStorage.setItem(KEY, current);
      } catch {
        /* private mode: the back button falls back to browser history */
      }
    };
    router.events.on("routeChangeStart", onStart);
    return () => router.events.off("routeChangeStart", onStart);
  }, [router]);
}

const LABELS: [string, string][] = [
  ["/ncsr/client-details", "client record"],
  ["/ncsr/client-record", "client record"],
  ["/ncsr/clients", "Clients"],
  ["/ncsr/referred-clients", "Referred Clients"],
  ["/ncsr/referred", "Referred Clients"],
  ["/ncsr/screened-clients", "Screened Clients"],
  ["/ncsr/test-results", "All Test Results"],
  ["/ncsr/screening-tests-page", "Samples & Test Results"],
  ["/ncsr/all-visits", "Visits"],
  ["/ncsr/screenings", "Screenings"],
  ["/ncsr/outcomes", "Outcomes"],
  ["/ncsr/self-assessments", "Self-Assessment Records"],
  ["/ncsr/diagnostic-evaluation", "Diagnostic Evaluation"],
  ["/ncsr/treatment-plan", "Treatment & Care"],
  ["/ncsr/follow-up-schedules", "Follow-up Schedules"],
  ["/ncsr/dashboard", "Dashboard"],
];

export function routeLabel(url: string): string {
  const p = pathOf(url);
  return LABELS.find(([prefix]) => p === prefix || p.startsWith(`${prefix}/`))?.[1] ?? "previous page";
}
