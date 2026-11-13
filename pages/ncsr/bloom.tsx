import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, CalendarCheck, ClipboardList, UserCheck, ArrowRight, AlertTriangle, Flower2, FlaskConical, KeyRound, Newspaper } from "lucide-react";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Counts = Record<string, number>;
type Section = { counts: Counts | null; denied: boolean };

const empty: Section = { counts: null, denied: false };

/** Loads one summary; a 403 means this user can't use that page (e.g. a Navigator on admin pages). */
async function loadSummary(url: string, params: Record<string, any>): Promise<Section> {
  try {
    const { data } = await api.get(url, { params });
    return { counts: data?.summary ?? {}, denied: false };
  } catch (e: any) {
    return { counts: null, denied: e?.response?.status === 403 };
  }
}

/**
 * Bloom dashboard: one place for everything that comes from the Bloom mobile app —
 * bookings to confirm, cases for community health workers, and health worker sign-ups to verify.
 */
export default function BloomDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Section>(empty);
  const [cases, setCases] = useState<Section>(empty);
  const [workers, setWorkers] = useState<Section>(empty);
  const [tests, setTests] = useState<Section>(empty);
  const [access, setAccess] = useState<Section>(empty);
  const [posts, setPosts] = useState<Section>(empty);
  const [myCases, setMyCases] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [b, c, w, t, a, po] = await Promise.all([
        loadSummary("/bloom-admin/appointments", { perPage: 1, status: "pending" }),
        loadSummary("/bloom-admin/cases", { perPage: 1 }),
        loadSummary("/bloom-admin/navigators", { status: "pending" }),
        loadSummary("/bloom-admin/tests", { perPage: 1 }),
        loadSummary("/bloom-admin/access-requests", { status: "pending" }),
        loadSummary("/bloom-admin/posts", { status: "all" }),
      ]);
      if (!alive) return;
      setBookings(b);
      setCases(c);
      setWorkers(w);
      setTests(t);
      setAccess(a);
      setPosts(po);
      // A health worker (Navigator) can't see the admin summaries; show their own open cases instead.
      if (c.denied) {
        try {
          const { data } = await api.get("/bloom-chw/cases");
          if (alive) setMyCases((data?.data ?? []).filter((x: any) => !x.closedAt).length);
        } catch {
          if (alive) setMyCases(null);
        }
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const n = (s: Section, k: string) => s.counts?.[k] ?? 0;
  const openCases = n(cases, "new") + n(cases, "community") + n(cases, "screening") + n(cases, "referral");

  const cards = [
    {
      key: "bookings",
      show: !bookings.denied,
      href: "/ncsr/bloom-bookings",
      icon: CalendarCheck,
      title: "Bookings",
      text: "Appointment requests women made in the app. Confirm a slot, suggest another time or decline.",
      attention: n(bookings, "pending"),
      attentionLabel: "waiting for confirmation",
      stats: [
        { label: "Waiting", value: n(bookings, "pending") },
        { label: "Confirmed", value: n(bookings, "confirmed") },
        { label: "Attended", value: n(bookings, "completed") },
        { label: "All", value: n(bookings, "all") },
      ],
    },
    {
      key: "cases",
      show: !cases.denied,
      href: "/ncsr/bloom-cases",
      icon: ClipboardList,
      title: "Cases",
      text: "Each booking becomes a case for a community health worker at that facility. Assign or reassign here.",
      attention: n(cases, "unassigned"),
      attentionLabel: "unassigned",
      stats: [
        { label: "Open", value: openCases },
        { label: "Unassigned", value: n(cases, "unassigned") },
        { label: "Referral follow-up", value: n(cases, "referral") },
        { label: "Closed", value: n(cases, "completed") },
      ],
    },
    {
      key: "workers",
      show: !workers.denied,
      href: "/ncsr/bloom-navigators",
      icon: UserCheck,
      title: "Health Workers",
      text: "Community health workers who signed up in the app. Check their staff ID and facility, then approve.",
      attention: n(workers, "pending"),
      attentionLabel: "waiting for verification",
      stats: [
        { label: "Waiting", value: n(workers, "pending") },
        { label: "Approved", value: n(workers, "approved") },
        { label: "Rejected", value: n(workers, "rejected") },
      ],
    },
    {
      key: "access",
      show: !access.denied,
      href: "/ncsr/bloom-access-requests",
      icon: KeyRound,
      title: "Access Requests",
      text: "Health workers asking to attend to a client registered at their facility. Approving assigns her to them as a case.",
      attention: n(access, "pending"),
      attentionLabel: "waiting for a decision",
      stats: [
        { label: "Waiting", value: n(access, "pending") },
        { label: "Approved", value: n(access, "approved") },
        { label: "Rejected", value: n(access, "rejected") },
      ],
    },
    {
      key: "posts",
      show: !posts.denied,
      href: "/ncsr/bloom-posts",
      icon: Newspaper,
      title: "News & Articles",
      text: "Write articles and announcements for the app and send them to women's and health workers' phones.",
      attention: n(posts, "draft"),
      attentionLabel: "drafts not published",
      stats: [
        { label: "Published", value: n(posts, "published") },
        { label: "Drafts", value: n(posts, "draft") },
        { label: "Phones reachable", value: n(posts, "phones") },
      ],
    },
    {
      key: "tests",
      show: !tests.denied,
      href: "/ncsr/bloom-tests",
      icon: FlaskConical,
      title: "Screening Tests",
      text: "Breast screening samples and results recorded by health workers in the app (also saved in the NCSR registry).",
      attention: n(tests, "suspicious"),
      attentionLabel: "suspicious",
      stats: [
        { label: "Awaiting result", value: n(tests, "collected") },
        { label: "Non-suspicious", value: n(tests, "normal") },
        { label: "Suspicious", value: n(tests, "suspicious") },
        { label: "All", value: n(tests, "total") },
      ],
    },
    {
      key: "mine",
      show: cases.denied,
      href: "/ncsr/bloom-cases",
      icon: ClipboardList,
      title: "My Bloom cases",
      text: "Women assigned to you from the Bloom app. Update their steps and record screening in the Bloom app.",
      attention: 0,
      attentionLabel: "",
      stats: [{ label: "Open cases", value: myCases ?? 0 }],
    },
  ].filter((c) => c.show);

  const nothing = !loading && cards.length === 0;

  return (
    <Layout>
      <PageTitle>Bloom</PageTitle>
      <div className="-mt-4 mb-6 flex items-start gap-3 rounded-2xl bg-green-50 dark:bg-gray-800 border border-green-100 dark:border-gray-700 p-4">
        <Flower2 className="w-6 h-6 text-green-700 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Everything that comes from the Bloom breast health app: women booking screening, the cases community health workers follow up,
          and the health workers waiting to be verified. Screening results recorded in the app also appear on Samples &amp; Test Results.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : nothing ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-200">You don't have access to the Bloom pages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.key}
                href={c.href}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let the browser open a new tab
                  e.preventDefault();
                  router.push(c.href);
                }}
                className="group block rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:border-green-400 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-green-100 dark:bg-gray-700 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-green-700" />
                    </span>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{c.title}</h3>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-green-700 transition" />
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{c.text}</p>

                {c.attention > 0 && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> {c.attention} {c.attentionLabel}
                  </p>
                )}

                <div className={`mt-4 grid gap-2 ${c.stats.length > 3 ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-2" : c.stats.length === 3 ? "grid-cols-3" : "grid-cols-1"}`}>
                  {c.stats.map((s) => (
                    <div key={s.label} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 px-3 py-2">
                      <p className="text-xl font-bold text-gray-800 dark:text-white">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                  Open {c.title.toLowerCase()} <ArrowRight className="w-4 h-4" />
                </span>
              </a>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
