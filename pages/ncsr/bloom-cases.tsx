import React, { useEffect, useRef, useState } from "react";
import { Button, Input, Select, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, X, Building2, Phone, UserPlus, Check } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

const PER_PAGE = 20;
const STEP_TITLES = ["Community follow-up", "PHC screening", "Referral", "Follow-up"];
const STAGE: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-teal-100 text-teal-800" },
  community: { label: "Community follow-up", cls: "bg-purple-100 text-purple-800" },
  screening: { label: "PHC screening", cls: "bg-blue-100 text-blue-800" },
  referral: { label: "Referral follow-up", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Closed", cls: "bg-gray-100 text-gray-700" },
  withdrawn: { label: "Cancelled by client", cls: "bg-gray-100 text-gray-500" },
};
const STEP_DOT: Record<string, string> = {
  completed: "bg-green-600",
  "in-progress": "bg-purple-500",
  "not-needed": "bg-gray-200",
  "not-started": "bg-white border border-gray-300",
};
const fmtDate = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/**
 * Bloom cases: each booking from the Bloom app becomes a case for a community health worker (Navigator)
 * at that facility. Admins see all cases in their facilities and can reassign; a Navigator signed in
 * to the web app sees just their own cases (read-only here; they update steps in the Bloom app).
 */
export default function BloomCasesPage() {
  const [mode, setMode] = useState<"admin" | "navigator" | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const [stage, setStage] = useState("open");
  const [navigatorId, setNavigatorId] = useState("");
  const [search, setSearch] = useState("");
  const [navigators, setNavigators] = useState<any[]>([]);

  const [assigning, setAssigning] = useState<any | null>(null);
  const [pick, setPick] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(p = page) {
    const id = ++reqId.current;
    setLoading(true);
    try {
      if (mode !== "navigator") {
        try {
          const { data } = await api.get("/bloom-admin/cases", {
            params: { page: p, perPage: PER_PAGE, stage: stage || undefined, navigatorId: navigatorId || undefined, search: search.trim() || undefined },
          });
          if (id !== reqId.current) return;
          setMode("admin");
          setRows(data.cases ?? []);
          setTotal(data.total ?? 0);
          setSummary(data.summary ?? {});
          return;
        } catch (e: any) {
          if (e?.response?.status !== 403) throw e;
          setMode("navigator"); // not an admin: show this user's own cases
        }
      }
      const { data } = await api.get("/bloom-chw/cases");
      if (id !== reqId.current) return;
      let list: any[] = data.data ?? [];
      const counts: Record<string, number> = {};
      list.forEach((c) => (counts[c.stage] = (counts[c.stage] ?? 0) + 1));
      counts.open = list.filter((c) => !c.closedAt).length;
      if (stage) list = list.filter((c) => (stage === "open" ? !c.closedAt : c.stage === stage));
      if (search.trim()) list = list.filter((c) => c.code.toLowerCase().includes(search.trim().toLowerCase()));
      setSummary(counts);
      setTotal(list.length);
      setRows(list.slice((p - 1) * PER_PAGE, p * PER_PAGE));
    } catch (e) {
      if (id === reqId.current) toast.error(friendlyError(e, "Could not load Bloom cases."));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, navigatorId]);

  // Health workers for the filter and the assign dialog (admins only).
  useEffect(() => {
    if (mode !== "admin") return;
    api.get("/bloom-admin/cases/navigators").then(({ data }: any) => setNavigators(data.data ?? [])).catch(() => setNavigators([]));
  }, [mode]);

  async function saveAssign() {
    if (!assigning) return;
    setSaving(true);
    try {
      await api.post(`/bloom-admin/cases/${assigning.id}/assign`, { navigatorId: pick ? Number(pick) : null });
      toast.success(pick ? "Case assigned. It now shows in their Bloom app." : "Case unassigned.");
      setAssigning(null);
      load(page);
    } catch (e) {
      toast.error(friendlyError(e, "Could not save the assignment."));
    } finally {
      setSaving(false);
    }
  }

  const admin = mode === "admin";
  const tiles = [
    { key: "open", label: "Open cases" },
    ...(admin ? [{ key: "unassigned", label: "Unassigned" }] : []),
    { key: "new", label: "New" },
    { key: "community", label: "Community follow-up" },
    { key: "screening", label: "PHC screening" },
    { key: "referral", label: "Referral follow-up" },
    { key: "completed", label: "Closed" },
  ];
  const openCount = admin
    ? (summary.new ?? 0) + (summary.community ?? 0) + (summary.screening ?? 0) + (summary.referral ?? 0)
    : summary.open ?? 0;

  const choose = (key: string) => {
    if (key === "unassigned") {
      setNavigatorId("none");
      setStage("open");
    } else {
      setNavigatorId("");
      setStage(key);
    }
  };
  const active = (key: string) => (key === "unassigned" ? navigatorId === "none" : navigatorId !== "none" && stage === key);

  const Steps = ({ steps }: { steps: string[] }) => (
    <div className="flex items-center gap-1" title={steps.map((s, i) => `${STEP_TITLES[i]}: ${s}`).join("\n")}>
      {steps.map((s, i) => (
        <span key={i} className={`inline-block w-3 h-3 rounded-full ${STEP_DOT[s] ?? STEP_DOT["not-started"]}`} />
      ))}
    </div>
  );

  const AssignCell = ({ r }: { r: any }) =>
    r.navigator ? (
      <div className="text-sm">
        <p className="text-gray-800 dark:text-gray-100">{r.navigator.name}</p>
        <p className="text-xs text-gray-400">{r.assignedBy === "admin" ? "Assigned by admin" : "Assigned by facility"}</p>
      </div>
    ) : (
      <span className="text-sm font-semibold text-amber-700">Unassigned</span>
    );

  return (
    <Layout>
      <PageTitle>Bloom Cases</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        {admin
          ? "Each booking from the Bloom app becomes a case. It is given automatically to the health worker at that facility with the fewest open cases; reassign here when needed."
          : "Women assigned to you from the Bloom app. Update each step in the Bloom app (Community Health Worker)."}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 mb-5">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => choose(t.key)}
            className={`text-left rounded-2xl border p-4 bg-white dark:bg-gray-800 transition ${
              active(t.key) ? "border-green-600 ring-2 ring-green-100" : "border-gray-100 dark:border-gray-700 hover:border-green-300"
            }`}
          >
            <p className={`text-2xl font-bold ${t.key === "unassigned" ? "text-amber-600" : "text-gray-800 dark:text-white"}`}>
              {t.key === "open" ? openCount : summary[t.key] ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 sm:p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Select className="rounded-2xl h-11" value={stage} onChange={(e: any) => setStage(e.target.value)} aria-label="Stage">
            <option value="open">Open cases</option>
            <option value="">All cases</option>
            <option value="new">New</option>
            <option value="community">Community follow-up</option>
            <option value="screening">PHC screening</option>
            <option value="referral">Referral follow-up</option>
            <option value="completed">Closed</option>
            <option value="withdrawn">Cancelled by client</option>
          </Select>
          {admin && (
            <Select className="rounded-2xl h-11" value={navigatorId} onChange={(e: any) => setNavigatorId(e.target.value)} aria-label="Health worker">
              <option value="">All health workers</option>
              <option value="none">Unassigned</option>
              {navigators.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.facility ?? "—"})
                </option>
              ))}
            </Select>
          )}
          <div className="flex gap-2">
            <Input
              className="rounded-2xl h-11 flex-1 min-w-0"
              placeholder="Case code, e.g. BLM-00012"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              onKeyDown={(e: any) => { if (e.key === "Enter") { setPage(1); load(1); } }}
            />
            <Button onClick={() => { setPage(1); load(1); }} className="h-11 px-4 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" aria-label="Search">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {(search || navigatorId || stage !== "open") && (
          <button type="button" onClick={() => { setSearch(""); setNavigatorId(""); setStage("open"); }} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 underline">
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
          <p className="font-semibold text-gray-700 dark:text-gray-200">No cases here.</p>
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          <div className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{r.code}</p>
                    <p className="text-sm text-gray-600">{r.client?.name ?? "—"}{r.client?.age ? `, ${r.client.age}` : ""}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE[r.stage]?.cls ?? ""}`}>{STAGE[r.stage]?.label ?? r.stage}</span>
                </div>
                <p className="text-xs text-gray-600 flex items-start gap-1"><Building2 className="w-3 h-3 mt-0.5 text-gray-400" /> {r.facility?.name ?? "—"} · {r.screening}</p>
                {r.client?.phone && <a href={`tel:${r.client.phone}`} className="text-xs text-green-700 font-medium inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {r.client.phone}</a>}
                {r.ncsrClientId && <p className="text-xs font-mono text-gray-500">NCSR Client ID {r.ncsrClientId}</p>}
                <div className="flex items-center justify-between gap-2"><Steps steps={r.steps} /><span className="text-xs text-gray-400">Requested {fmtDate(r.requestedAt)}</span></div>
                <div className="flex items-center justify-between gap-2">
                  <AssignCell r={r} />
                  {admin && !r.closedAt && (
                    <Button size="small" layout="outline" className="rounded-xl" onClick={() => { setAssigning(r); setPick(r.navigator ? String(r.navigator.id) : ""); }}>
                      <UserPlus className="w-4 h-4 mr-1" /> {r.navigator ? "Reassign" : "Assign"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm whitespace-normal">
              <thead className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Case</th>
                  <th className="px-4 py-3">Woman</th>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Health worker</th>
                  {admin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 dark:text-white">{r.code}</p>
                      <p className="text-xs text-gray-400">{fmtDate(r.requestedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 dark:text-gray-100">{r.client?.name ?? "—"}{r.client?.age ? <span className="text-gray-500">, {r.client.age}</span> : null}</p>
                      {r.client?.phone && <a href={`tel:${r.client.phone}`} className="text-xs text-green-700 font-medium">{r.client.phone}</a>}
                      {r.ncsrClientId && <p className="text-xs font-mono text-gray-500 mt-0.5">NCSR {r.ncsrClientId}</p>}
                    </td>
                    <td className="px-4 py-3 max-w-[14rem]">
                      <p className="text-gray-800 dark:text-gray-100 break-words">{r.facility?.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{r.screening}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold mb-1 ${STAGE[r.stage]?.cls ?? ""}`}>{STAGE[r.stage]?.label ?? r.stage}</span>
                      <Steps steps={r.steps} />
                      {r.outcome === "concerning-change" && <p className="text-xs text-red-600 mt-1">Concerning change at PHC</p>}
                      {r.referralFacility && <p className="text-xs text-gray-500 mt-1">Referred to {r.referralFacility}</p>}
                    </td>
                    <td className="px-4 py-3"><AssignCell r={r} /></td>
                    {admin && (
                      <td className="px-4 py-3 text-right">
                        {!r.closedAt && (
                          <Button size="small" layout="outline" className="rounded-xl" onClick={() => { setAssigning(r); setPick(r.navigator ? String(r.navigator.id) : ""); }}>
                            <UserPlus className="w-4 h-4 mr-1" /> {r.navigator ? "Reassign" : "Assign"}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PER_PAGE && (
            <div className="mt-4 overflow-x-auto">
              <Pagination totalResults={total} resultsPerPage={PER_PAGE} label="Bloom cases pages" onChange={(p: number) => { setPage(p); load(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </div>
          )}
        </div>
      )}

      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Assign {assigning.code}</h3>
            <p className="mt-1 text-sm text-gray-500">{assigning.facility?.name} · {assigning.client?.name ?? ""}</p>
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {[...navigators]
                .sort((a, b) => Number(b.facilityId === assigning.facility?.id) - Number(a.facilityId === assigning.facility?.id) || a.openCases - b.openCases)
                .map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setPick(String(n.id))}
                    className={`w-full text-left rounded-2xl border p-3 flex items-center justify-between gap-3 ${pick === String(n.id) ? "border-green-600 bg-green-50 dark:bg-gray-700" : "border-gray-200 dark:border-gray-600"}`}
                  >
                    <span>
                      <span className="block font-semibold text-gray-800 dark:text-white">{n.name}</span>
                      <span className="block text-xs text-gray-500">
                        {n.facility ?? "—"}{n.facilityId !== assigning.facility?.id ? " (different facility)" : ""} · {n.openCases} open
                      </span>
                    </span>
                    {pick === String(n.id) && <Check className="w-5 h-5 text-green-700" />}
                  </button>
                ))}
              {navigators.length === 0 && <p className="text-sm text-gray-500">No approved health workers in your facilities yet. Approve sign-ups on the Bloom Health Workers page.</p>}
              {assigning.navigator && (
                <button type="button" onClick={() => setPick("")} className={`w-full text-left rounded-2xl border p-3 text-sm ${pick === "" ? "border-amber-500 bg-amber-50" : "border-gray-200 dark:border-gray-600"}`}>
                  Leave unassigned
                </button>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button layout="outline" className="rounded-2xl" onClick={() => setAssigning(null)} disabled={saving}>Back</Button>
              <Button className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" onClick={saveAssign} disabled={saving || (!pick && !assigning.navigator)}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
