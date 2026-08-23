"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { centerOfUsa, homeLocation } from "@/data/ImportantMarkers";
import { markerIcon } from "@/utils/MarkerIcon";
import { homeIcon } from "@/utils/HomeIcon";
import { StopInfoResponse } from "@/models/StopInfo";
import { fmtRange, fmtNights, yearOf } from "@/lib/format";
import TripScrubber from "@/components/site/TripScrubber";

/** One colour per trip year; legs are coloured by the year the leg was driven. */
const YEAR_COLORS = ["#b5472f", "#2e6b4f", "#c9901a", "#3f5fa8", "#7b4a9e", "#1f8a8a"];

interface MainMapProps {
  stops: StopInfoResponse[];
}

const badgeIcon = (text: string) =>
  L.divIcon({ className: "", html: `<span class="marker-badge">${text}</span>`, iconAnchor: [-8, 46] });

const RV_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40" width="44" height="28">
  <path d="M4 34 V16 a4 4 0 0 1 4 -4 H40 l12 9 H58 a3 3 0 0 1 3 3 v10 H4 Z" fill="#fff" stroke="#23312b" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="10" y="17" width="10" height="8" rx="1.5" fill="#2e6b4f"/><rect x="24" y="17" width="10" height="8" rx="1.5" fill="#2e6b4f"/>
  <path d="M41 17 l8 6 H41 Z" fill="#2e6b4f"/><rect x="4" y="29" width="57" height="2.5" fill="#b5472f"/>
  <circle cx="17" cy="35" r="4.5" fill="#23312b"/><circle cx="17" cy="35" r="1.6" fill="#fff"/>
  <circle cx="49" cy="35" r="4.5" fill="#23312b"/><circle cx="49" cy="35" r="1.6" fill="#fff"/></svg>`;
// The RV is a side view: flip it to face the direction of travel (west = left).
const rvIcons = {
  east: L.divIcon({ className: "rv-marker", html: RV_SVG, iconSize: [44, 28], iconAnchor: [22, 26] }),
  west: L.divIcon({ className: "rv-marker rv-marker--west", html: RV_SVG, iconSize: [44, 28], iconAnchor: [22, 26] }),
};

/** Point a fraction of the way along a polyline, by distance. */
function pointAlong(line: LatLngTuple[], frac: number): LatLngTuple {
  if (line.length === 0) return [0, 0];
  if (line.length === 1 || frac <= 0) return line[0];
  if (frac >= 1) return line[line.length - 1];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const d = Math.hypot(line[i][0] - line[i - 1][0], (line[i][1] - line[i - 1][1]) * Math.cos((line[i][0] * Math.PI) / 180));
    seg.push(d);
    total += d;
  }
  let target = frac * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const t = seg[i] === 0 ? 0 : target / seg[i];
      return [line[i][0] + (line[i + 1][0] - line[i][0]) * t, line[i][1] + (line[i + 1][1] - line[i][1]) * t];
    }
    target -= seg[i];
  }
  return line[line.length - 1];
}

function FollowRv({ target, active }: { target: LatLngTuple | null; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!target || !active) return;
    if (!map.getBounds().pad(-0.2).contains(target)) map.panTo(target, { animate: true, duration: 0.4 });
  }, [map, target, active]);
  return null;
}

export default function MainMap({ stops: allStops }: MainMapProps) {
  const allYears = useMemo(() => [...new Set(allStops.map((s) => yearOf(s.arrivalDate)))].sort(), [allStops]);
  const [activeYears, setActiveYears] = useState<Set<number>>(() => new Set(allYears));
  const colorFor = (year: number) => YEAR_COLORS[allYears.indexOf(year) % YEAR_COLORS.length];

  const stops = useMemo(() => allStops.filter((s) => activeYears.has(yearOf(s.arrivalDate))), [allStops, activeYears]);
  const [position, setPosition] = useState(0);
  const [scrubbed, setScrubbed] = useState(false);
  const onScrub = useCallback((p: number) => {
    setPosition(p);
    setScrubbed(true);
  }, []);
  useEffect(() => {
    setPosition(0);
  }, [activeYears]);

  const first = stops[0];
  const last = stops[stops.length - 1];
  const facing = useRef<"east" | "west">("east");

  // RV location: on a stop, or along the road leg into the next stop.
  const rvAt = useMemo<LatLngTuple | null>(() => {
    if (stops.length === 0) return null;
    const idx = Math.min(Math.floor(position), stops.length - 1);
    const frac = position - idx;
    const next = stops[idx + 1];
    if (frac < 0.001 || !next) return stops[idx].latLongTuple;
    const leg = next.journeyLatLongTuples.length >= 2 ? next.journeyLatLongTuples : [stops[idx].latLongTuple, next.latLongTuple];
    const here = pointAlong(leg, frac);
    // Heading: compare with a point slightly further along the same leg.
    const ahead = pointAlong(leg, Math.min(1, frac + 0.01));
    const dLng = ahead[1] - here[1];
    if (Math.abs(dLng) > 1e-6) facing.current = dLng < 0 ? "west" : "east";
    return here;
  }, [stops, position]);

  const toggleYear = (y: number) =>
    setActiveYears((cur) => {
      const n = new Set(cur);
      if (n.has(y)) {
        if (n.size === 1) return cur; // keep at least one year
        n.delete(y);
      } else n.add(y);
      return n;
    });

  return (
    <div className="map-page" style={{ position: "relative" }}>
      <MapContainer center={centerOfUsa} zoom={5} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FollowRv target={rvAt} active={scrubbed} />

        {!allStops.some((s) => s.homeBase) && (
          <Marker position={homeLocation} icon={homeIcon}>
            <Tooltip>Home base · Tallahassee, FL</Tooltip>
          </Marker>
        )}

        {stops.map((stop, index) => (
          <Polyline
            key={`leg-${stop.id}`}
            positions={stop.journeyLatLongTuples}
            pathOptions={{ color: colorFor(yearOf(stop.arrivalDate)), weight: 3, opacity: 0.85 }}
          >
            <Tooltip sticky>{index > 0 ? `${stops[index - 1].name} → ${stop.name}` : `To ${stop.name}`}</Tooltip>
          </Polyline>
        ))}

        {stops.map((stop, index) => {
          const popup = (
            <Popup className="stop-popup" closeButton={false}>
              {stop.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stop.coverUrl} alt="" />
              )}
              <div className="body">
                <a className="title" href={`/stops/${stop.slug}`}>
                  {stop.name}
                </a>
                <div className="dates">
                  {fmtRange(stop.arrivalDate, stop.departureDate)} · {fmtNights(stop.arrivalDate, stop.departureDate)}
                </div>
                <a className="more" href={`/stops/${stop.slug}`}>
                  Photos &amp; journal →
                </a>
              </div>
            </Popup>
          );
          const handlers = { click: () => onScrub(index) };
          if (stop.homeBase)
            return (
              <Marker key={stop.id} position={stop.latLongTuple} icon={homeIcon} eventHandlers={handlers}>
                {popup}
              </Marker>
            );
          if (stop.overnightStop)
            return (
              <CircleMarker
                key={stop.id}
                center={stop.latLongTuple}
                radius={5}
                pathOptions={{ color: "#23312b", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}
                eventHandlers={handlers}
              >
                {popup}
              </CircleMarker>
            );
          return (
            <Marker key={stop.id} position={stop.latLongTuple} icon={markerIcon} eventHandlers={handlers}>
              {popup}
            </Marker>
          );
        })}

        {first && <Marker position={first.latLongTuple} icon={badgeIcon("Start")} interactive={false} />}
        {last && last !== first && <Marker position={last.latLongTuple} icon={badgeIcon("End")} interactive={false} />}
        {rvAt && <Marker position={rvAt} icon={rvIcons[facing.current]} interactive={false} zIndexOffset={1000} />}
      </MapContainer>

      {allYears.length > 0 && (
        <div className="map-legend" aria-label="Legend and year filter">
          <strong>
            {stops.length} stops{stops.length !== allStops.length && ` of ${allStops.length}`}
          </strong>
          {allYears.map((y) => (
            <button
              key={y}
              className={`year-chip${activeYears.has(y) ? "" : " off"}`}
              onClick={() => toggleYear(y)}
              aria-pressed={activeYears.has(y)}
              title={activeYears.has(y) ? `Hide ${y}` : `Show ${y}`}
            >
              <span className="swatch" style={{ background: colorFor(y) }} />
              {y}
            </button>
          ))}
          <span className="hint">
            <span className="swatch dot" /> overnight stop
          </span>
        </div>
      )}

      <TripScrubber stops={stops} position={position} onChange={onScrub} />
    </div>
  );
}
