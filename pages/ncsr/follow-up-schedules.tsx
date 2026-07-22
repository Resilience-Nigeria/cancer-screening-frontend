import React, { useEffect, useState } from "react";
import { Loader2, CalendarClock, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  missed: "bg-red-50 text-red-700",
};

export default function FollowUpSchedulesPage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [completingId, setCompletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [statusFilter]);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const { data } = await api.get("/follow-up-schedules", {
        params: { status: statusFilter || undefined },
      });
      setSchedules(data.data || []);
    } catch {
      toast.error("Could not load follow-up schedules.");
    } finally {
      setLoading(false);
    }
  }

  async function markCompleted(scheduleId: number) {
    setCompletingId(scheduleId);
    try {
      await api.post(`/follow-up-schedules/${scheduleId}/complete`, {
        completedDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Marked as completed.");
      fetchSchedules();
    } catch {
      toast.error("Could not update this follow-up.");
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Follow-up Schedules</PageTitle>
        <p className="text-sm text-gray-500 mt-1">
          Care coordinator view — survivorship follow-ups due, overdue, and completed across your facilities.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { value: "", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "missed", label: "Missed" },
          { value: "completed", label: "Completed" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === opt.value ? "bg-green-700 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : schedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <CalendarClock className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No follow-ups match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.scheduleId} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 >
                  {s.treatment_plan?.client?.fullName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.treatment_plan?.client?.clientId} · {s.treatment_plan?.facility?.facilityName} · Due {fmtDate(s.dueDate)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{s.activities}</p>
                <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_TONE[s.status] || "bg-gray-50 text-gray-600"}`}>
                  {s.status === "missed" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {s.status}
                </span>
              </div>
              {s.status !== "completed" && (
                <button
                  onClick={() => markCompleted(s.scheduleId)}
                  disabled={completingId === s.scheduleId}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {completingId === s.scheduleId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Mark Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
