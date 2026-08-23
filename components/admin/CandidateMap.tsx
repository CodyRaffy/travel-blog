"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from "react-leaflet";
import L, { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { centerOfUsa } from "@/data/ImportantMarkers";
import { markerIcon } from "@/utils/MarkerIcon";
import { StopCandidateResponse } from "@/models/StopCandidate";
import { StopInfoResponse } from "@/models/StopInfo";

interface CandidateMapProps {
  candidates: StopCandidateResponse[];
  stops: StopInfoResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function FitBounds({ candidates, stops }: { candidates: StopCandidateResponse[]; stops: StopInfoResponse[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    // Fit once, when data first arrives; re-fitting on every change would fight the user.
    if (fitted.current) return;
    const pts = [...candidates.map((c) => c.latLongTuple), ...stops.map((s) => s.latLongTuple)];
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
      fitted.current = true;
    }
  }, [map, candidates, stops]);
  return null;
}

function FlyTo({ target }: { target: LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 9), { duration: 0.6 });
  }, [map, target]);
  return null;
}

export default function CandidateMap({ candidates, stops, selectedId, onSelect }: CandidateMapProps) {
  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  return (
    <div style={{ height: "420px", width: "100%", marginBottom: "16px", border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" }}>
      <MapContainer center={centerOfUsa} zoom={4} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds candidates={candidates} stops={stops} />
        <FlyTo target={selected?.latLongTuple ?? null} />
        {stops.map((s) => (
          <Marker key={s.id} position={s.latLongTuple} icon={markerIcon} opacity={0.6}>
            <Tooltip>{s.name} (existing stop)</Tooltip>
          </Marker>
        ))}
        {candidates.map((c) => {
          const isSel = c.id === selectedId;
          return (
            <CircleMarker
              key={c.id}
              center={c.latLongTuple}
              radius={isSel ? 11 : 7}
              pathOptions={{
                color: isSel ? "#b5472f" : "#2e6b4f",
                fillColor: isSel ? "#b5472f" : "#2e6b4f",
                fillOpacity: 0.85,
                weight: isSel ? 3 : 1,
              }}
              eventHandlers={{ click: () => onSelect(c.id) }}
            >
              <Tooltip>
                {c.suggestedName ?? "Unnamed"} · {c.arrivalDate.slice(0, 10)} → {c.departureDate.slice(0, 10)} · {c.photoCount} photos
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
