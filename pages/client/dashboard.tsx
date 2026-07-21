"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Loader2, LogOut, User, HeartPulse, Stethoscope, ClipboardCheck,
  Building2, Phone, AlertTriangle, CheckCircle2, CalendarClock,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";
import clientPortalApi from "../../lib/clientPortalApi";

function fmtDate(v: any) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(v);
  }
}

function capitalize(v: any) {
  if (!v) return "—";
  const s = String(v);
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-700">{icon}</div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === undefined || value === null || value === "" || value === "—";
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${empty ? "text-gray-300" : "text-gray-800"}`}>
        {empty ? "—" : value}
      </p>
    </div>
  );
}

const RESULT_TONE: Record<string, string> = {
  negative: "bg-green-50 text-green-700",
  non_suspicious: "bg-green-50 text-green-700",
  positive: "bg-red-50 text-red-700",
  suspicious: "bg-orange-50 text-orange-700",
};

const OUTCOME_TONE: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  normal: { bg: "bg-green-50", text: "text-green-700", icon: <CheckCircle2 className="w-4 h-4" />, label: "Normal" },
  low_suspicion: { bg: "bg-amber-50", text: "text-amber-700", icon: <CalendarClock className="w-4 h-4" />, label: "Low Suspicion" },
  suspicious: { bg: "bg-orange-50", text: "text-orange-700", icon: <AlertTriangle className="w-4 h-4" />, label: "Suspicious" },
  urgent_referral: { bg: "bg-red-50", text: "text-red-700", icon: <AlertTriangle className="w-4 h-4" />, label: "Urgent Referral" },
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [outcome, setOutcome] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("clientPortalToken");
    if (!token) {
      router.push("/client/login");
      return;
    }
    (async () => {
      try {
        const [meRes, riskRes, visitsRes, outcomeRes] = await Promise.all([
          clientPortalApi.get("/client-portal/me"),
          clientPortalApi.get("/client-portal/risk-profile"),
          clientPortalApi.get("/client-portal/visits"),
          clientPortalApi.get("/client-portal/outcome"),
        ]);
        setMe(meRes.data.client);
        setRiskProfile(riskRes.data.riskProfile);
        setVisits(visitsRes.data.visits || []);
        setOutcome(outcomeRes.data.outcome);
      } catch {
        toast.error("Could not load your record. Please log in again.");
        router.push("/client/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latestVisit = visits[0] || null;

  // Derived "what needs attention" — computed client-side from the same
  // data already fetched, no separate backend endpoint needed.
  const alert = useMemo(() => {
    if (!latestVisit) return null;
    if (["suspicious", "urgent_referral"].includes(latestVisit.overallOutcome)) {
      return {
        tone: latestVisit.overallOutcome === "urgent_referral" ? "urgent" : "warning",
        message:
          latestVisit.overallOutcome === "urgent_referral"
            ? "Your recent screening needs prompt follow-up. Please contact your facility as soon as possible."
            : "Your recent screening flagged something that needs a closer look. Please follow up with your facility.",
      };
    }
    if (latestVisit.repeatScreeningDate) {
      const days = daysUntil(latestVisit.repeatScreeningDate);
      if (days <= 30) {
        return {
          tone: "info",
          message:
            days < 0
              ? `Your next screening was due on ${fmtDate(latestVisit.repeatScreeningDate)}. Please book a visit soon.`
              : `Your next screening is due on ${fmtDate(latestVisit.repeatScreeningDate)} (in ${days} day${days === 1 ? "" : "s"}).`,
        };
      }
    }
    return null;
  }, [latestVisit]);

  function handleLogout() {
    clientPortalApi.post("/client-portal/logout").finally(() => {
      localStorage.removeItem("clientPortalToken");
      localStorage.removeItem("clientPortalName");
      router.push("/client/login");
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!me) return null;

  const firstName = me.fullName?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-gray-50 pb-16 print:bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-700 text-white px-4 pt-6 pb-10 print:hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-green-100">Welcome back,</p>
            <h1 className="text-xl font-bold">{firstName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full transition-colors"
              title="Print my record"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 px-3 py-2 rounded-full transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6">
        {/* Alert banner */}
        {alert && (
          <div
            className={`rounded-2xl p-4 mb-5 shadow-sm border flex items-start gap-3 ${
              alert.tone === "urgent"
                ? "bg-red-50 border-red-100"
                : alert.tone === "warning"
                ? "bg-orange-50 border-orange-100"
                : "bg-blue-50 border-blue-100"
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                alert.tone === "urgent" ? "text-red-600" : alert.tone === "warning" ? "text-orange-600" : "text-blue-600"
              }`}
            />
            <p
              className={`text-sm font-medium ${
                alert.tone === "urgent" ? "text-red-800" : alert.tone === "warning" ? "text-orange-800" : "text-blue-800"
              }`}
            >
              {alert.message}
            </p>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{visits.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Visit{visits.length === 1 ? "" : "s"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-sm font-bold text-gray-900 mt-1">{latestVisit ? fmtDate(latestVisit.visitDate) : "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Last Screening</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-sm font-bold text-gray-900 mt-1">
              {latestVisit?.repeatScreeningDate ? fmtDate(latestVisit.repeatScreeningDate) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Next Due</p>
          </div>
        </div>

        <Card title="My Details" icon={<User className="w-5 h-5" />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client ID" value={me.clientId} />
            <Field label="Sex" value={capitalize(me.gender)} />
            <Field label="Age" value={me.age ? `${me.age} yrs` : "—"} />
            <Field label="Phone" value={me.phoneNumber} />
            <Field label="Registered" value={fmtDate(me.registrationDate)} />
            <Field label="State" value={me.stateOfResidence} />
          </div>
          {me.facility && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> My Facility
              </p>
              <p className="text-sm font-medium text-gray-800">{me.facility.facilityName}</p>
              {me.facility.facilityAddress && (
                <p className="text-xs text-gray-500 mt-0.5">{me.facility.facilityAddress}</p>
              )}
              {me.facility.phoneNumber && (
                <a
                  href={`tel:${me.facility.phoneNumber}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  <Phone className="w-3.5 h-3.5" /> {me.facility.phoneNumber}
                </a>
              )}
            </div>
          )}
        </Card>

        {riskProfile && (
          <Card title="Risk Profile Summary" icon={<HeartPulse className="w-5 h-5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Family History of Cancer" value={capitalize(riskProfile.familyHistory)} />
              <Field label="Smoking Status" value={capitalize(riskProfile.smokingStatus)} />
              <Field label="BMI" value={riskProfile.bmi} />
              <Field label="Last Updated" value={fmtDate(riskProfile.recordedAt)} />
            </div>
          </Card>
        )}

        <div className="mb-2 flex items-center gap-2 mt-2">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-700">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">My Screening History</h3>
        </div>

        {visits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center mb-5">
            <Stethoscope className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">No screening visits yet</p>
            <p className="text-xs text-gray-400 mt-1">Once you're screened at a facility, it will show up here.</p>
          </div>
        ) : (
          <div className="relative">
            {visits.map((visit, i) => {
              const tone = visit.overallOutcome ? OUTCOME_TONE[visit.overallOutcome] : null;
              return (
                <div key={visit.visitId} className="relative pl-6 pb-5 last:pb-0">
                  {i !== visits.length - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-px bg-gray-200" />
                  )}
                  <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-green-600 border-4 border-green-100" />

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-800">{fmtDate(visit.visitDate)}</p>
                      {tone && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tone.bg} ${tone.text}`}>
                          {tone.icon} {tone.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{capitalize(visit.visitType)} visit</p>

                    {Object.entries(visit.screenings || {}).map(([type, s]: [string, any]) => (
                      <div key={type} className="flex items-center justify-between py-1.5 border-t border-gray-50 text-sm">
                        <span className="text-gray-600 capitalize">{type}</span>
                        <span
                          className={`font-medium capitalize px-2 py-0.5 rounded-md text-xs ${
                            RESULT_TONE[s.screeningResult] || "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {s.screeningResult ? capitalize(s.screeningResult) : "Pending"}
                        </span>
                      </div>
                    ))}

                    {visit.repeatScreeningDate && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
                        <CalendarClock className="w-3.5 h-3.5" />
                        Next screening due: <span className="font-semibold text-gray-700">{fmtDate(visit.repeatScreeningDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {outcome && (
          <Card title="My Case Outcome" icon={<ClipboardCheck className="w-5 h-5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Screening Result" value={capitalize(outcome.screeningResult)} />
              <Field label="Cancer Confirmed" value={capitalize(outcome.cancerConfirmed)} />
              <Field label="Linked to Treatment" value={capitalize(outcome.linkageToTreatment)} />
              <Field label="Treatment Facility" value={outcome.treatmentFacility} />
              <Field label="Treatment Completed" value={capitalize(outcome.treatmentCompleted)} />
              <Field label="Next Follow-up" value={fmtDate(outcome.nextFollowUpDate)} />
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-gray-400 mt-6 print:hidden">
          Questions about your results? Contact your facility directly.
          <br />
          Platform powered by Resilience Nigeria
        </p>
      </div>
    </div>
  );
}
