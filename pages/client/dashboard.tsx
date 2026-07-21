"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, LogOut, User, HeartPulse, Stethoscope, ClipboardCheck, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import clientPortalApi from "../../lib/clientPortalApi";

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-green-700">{icon}</div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${empty ? "text-gray-300" : "text-gray-800"}`}>
        {empty ? "—" : value}
      </p>
    </div>
  );
}

function fmtDate(v: any) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return String(v);
  }
}

function capitalize(v: any) {
  if (!v) return "—";
  const s = String(v);
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

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

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-green-700 text-white px-4 py-5 mb-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-green-100">My NCSR Record</p>
            <h1 className="text-lg font-bold">{me.fullName}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
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
          <Stethoscope className="w-5 h-5 text-green-700" />
          <h3 className="text-base font-semibold text-gray-800">My Screening History</h3>
        </div>
        {visits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 mb-5">
            No screening visits recorded yet.
          </div>
        ) : (
          visits.map((visit) => (
            <div key={visit.visitId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <p className="text-sm font-semibold text-gray-800">{fmtDate(visit.visitDate)}</p>
              <p className="text-xs text-gray-500 mb-3">{capitalize(visit.visitType)} visit</p>
              {Object.entries(visit.screenings || {}).map(([type, s]: [string, any]) => (
                <div key={type} className="flex items-center justify-between py-1.5 border-t border-gray-50 text-sm">
                  <span className="text-gray-600 capitalize">{type}</span>
                  <span className="font-medium text-gray-800 capitalize">{s.screeningResult || "Pending"}</span>
                </div>
              ))}
              {visit.overallOutcome && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Outcome: <span className="font-semibold text-gray-800 capitalize">{capitalize(visit.overallOutcome)}</span></p>
                  {visit.repeatScreeningDate && (
                    <p className="text-xs text-gray-500 mt-1">Next screening due: {fmtDate(visit.repeatScreeningDate)}</p>
                  )}
                </div>
              )}
            </div>
          ))
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

        <p className="text-center text-xs text-gray-400 mt-6">
          Questions about your results? Contact your facility directly.
          <br />
          Platform powered by Resilience Nigeria
        </p>
      </div>
    </div>
  );
}
