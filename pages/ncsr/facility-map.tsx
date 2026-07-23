import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, AlertTriangle, Stethoscope, HeartHandshake, Building2 } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

// react-leaflet touches the DOM directly and has no SSR support.
// Imported from outside pages/ deliberately — anything under pages/
// (including pages/components/) is auto-discovered by Next.js as its
// own routable page, and with output: 'export' every discovered page
// must be statically prerenderable. Leaflet blows up in that Node
// environment even with ssr:false here, because Next was trying to
// build it as a *separate* standalone page, not through this import.
const FacilityMapView = dynamic(() => import("../../components/FacilityMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  ),
});

type Facility = {
  facilityId: number;
  facilityName: string;
  facilityCode: string;
  facilityLevel: string | null;
  facilityState: string;
  facilityLga: string;
  latitude: number;
  longitude: number;
  isScreeningCenter: boolean;
  isTreatmentCenter: boolean;
  stagesSupported: string[] | null;
  status: string;
};

export default function FacilityMapPage() {
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [missingCount, setMissingCount] = useState(0);
  const [mode, setMode] = useState<"capability" | "tier">("capability");

  useEffect(() => {
    fetchMapData();
  }, []);

  async function fetchMapData() {
    setLoading(true);
    try {
      const { data } = await api.get("/facilities/map");
      setFacilities(data.facilities || []);
      setTotalCount(data.totalCount ?? 0);
      setMissingCount(data.missingCoordinatesCount ?? 0);
    } catch {
      toast.error("Could not load the facility map.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const screeningOnly = facilities.filter((f) => f.isScreeningCenter && !f.isTreatmentCenter).length;
    const treatmentOnly = facilities.filter((f) => f.isTreatmentCenter && !f.isScreeningCenter).length;
    const both = facilities.filter((f) => f.isScreeningCenter && f.isTreatmentCenter).length;
    const hubs = facilities.filter((f) => (f.facilityLevel || "").toLowerCase() === "hub").length;
    const subhubs = facilities.filter((f) => (f.facilityLevel || "").toLowerCase() === "subhub").length;
    const feeders = facilities.filter((f) => (f.facilityLevel || "").toLowerCase() === "feeder").length;
    return { screeningOnly, treatmentOnly, both, hubs, subhubs, feeders };
  }, [facilities]);

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <PageTitle>National Facility Map</PageTitle>
          <p className="text-sm text-gray-500 mt-1">
            Geographic distribution of screening and treatment facilities across the network.
          </p>
        </div>
        <div className="inline-flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => setMode("capability")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === "capability" ? "bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Screening & Treatment
          </button>
          <button
            onClick={() => setMode("tier")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === "tier" ? "bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Feeders, SubHubs & Hubs
          </button>
        </div>
      </div>

      {missingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {missingCount} of {totalCount} facilities don't have coordinates set yet, so they don't appear on the map.
            Add latitude/longitude in the Facilities admin page to include them.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {mode === "capability" ? (
          <>
            <StatChip icon={Stethoscope} color="text-green-700 bg-green-50" label="Screening Only" value={stats.screeningOnly} />
            <StatChip icon={HeartHandshake} color="text-red-700 bg-red-50" label="Treatment Only" value={stats.treatmentOnly} />
            <StatChip icon={MapPin} color="text-purple-700 bg-purple-50" label="Screening + Treatment" value={stats.both} />
          </>
        ) : (
          <>
            <StatChip icon={Building2} color="text-blue-700 bg-blue-50" label="Feeders" value={stats.feeders} />
            <StatChip icon={Building2} color="text-amber-700 bg-amber-50" label="SubHubs" value={stats.subhubs} />
            <StatChip icon={Building2} color="text-purple-700 bg-purple-50" label="Hubs" value={stats.hubs} />
          </>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="h-[70vh] rounded-2xl overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : (
            <FacilityMapView facilities={facilities} mode={mode} />
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 px-2">
          {mode === "capability" ? (
            <>
              <LegendDot color="#16a34a" label="Screening only" />
              <LegendDot color="#dc2626" label="Treatment only" />
              <LegendDot color="#7c3aed" label="Screening + Treatment" />
            </>
          ) : (
            <>
              <LegendDot color="#2563eb" label="Feeder" />
              <LegendDot color="#f59e0b" label="SubHub" />
              <LegendDot color="#7c3aed" label="Hub" />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatChip({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
    </div>
  );
}
