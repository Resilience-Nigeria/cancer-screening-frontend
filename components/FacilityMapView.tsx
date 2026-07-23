import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";

// Nigeria's approximate geographic center — sensible default view.
const NIGERIA_CENTER: [number, number] = [9.082, 8.6753];

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

const TIER_COLORS: Record<string, string> = {
  hub: "#7c3aed",     // purple
  subhub: "#f59e0b",  // amber
  feeder: "#2563eb",  // blue
};

const CAPABILITY_COLORS = {
  both: "#7c3aed",       // purple — screening + treatment
  treatment: "#dc2626",  // red — treatment only
  screening: "#16a34a",  // green — screening only
  neither: "#9ca3af",    // gray
};

function capabilityColor(f: Facility): string {
  if (f.isScreeningCenter && f.isTreatmentCenter) return CAPABILITY_COLORS.both;
  if (f.isTreatmentCenter) return CAPABILITY_COLORS.treatment;
  if (f.isScreeningCenter) return CAPABILITY_COLORS.screening;
  return CAPABILITY_COLORS.neither;
}

function tierColor(f: Facility): string {
  return TIER_COLORS[(f.facilityLevel || "").toLowerCase()] || CAPABILITY_COLORS.neither;
}

export default function FacilityMapView({
  facilities,
  mode,
}: {
  facilities: Facility[];
  mode: "capability" | "tier";
}) {
  return (
    <MapContainer
      center={NIGERIA_CENTER}
      zoom={6}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {facilities.map((f) => {
        const color = mode === "tier" ? tierColor(f) : capabilityColor(f);
        return (
          <CircleMarker
            key={f.facilityId}
            center={[f.latitude, f.longitude]}
            radius={7}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1.5 }}
          >
            <Popup>
              <div style={{ fontFamily: "inherit", minWidth: "180px" }}>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{f.facilityName}</p>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 6 }}>
                  {f.facilityCode} · {f.facilityLga}, {f.facilityState}
                </p>
                <p style={{ fontSize: "0.75rem", textTransform: "capitalize" }}>
                  Tier: <strong>{f.facilityLevel || "—"}</strong>
                </p>
                <p style={{ fontSize: "0.75rem" }}>
                  {f.isScreeningCenter && "Screening "}
                  {f.isScreeningCenter && f.isTreatmentCenter && "· "}
                  {f.isTreatmentCenter && "Treatment"}
                  {!f.isScreeningCenter && !f.isTreatmentCenter && "No capability set"}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
