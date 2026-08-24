"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { centerOfUsa, homeLocation } from "@/data/ImportantMarkers";
import { markerIcon } from "@/utils/MarkerIcon";
import { homeIcon } from "@/utils/HomeIcon";
import { StopInfoResponse } from "@/models/StopInfo";
import { fmtRange, fmtNights, yearOf, isRvEra } from "@/lib/format";
import TripScrubber from "@/components/site/TripScrubber";
import { VEHICLES, vehicleByKey, type VehicleKey } from "@/lib/vehicles";

/** One colour per trip year; legs are coloured by the year the leg was driven. */
const YEAR_COLORS = ["#b5472f", "#2e6b4f", "#c9901a", "#3f5fa8", "#7b4a9e", "#1f8a8a"];

interface MainMapProps {
  stops: StopInfoResponse[];
}

const badgeIcon = (text: string) =>
  L.divIcon({ className: "", html: `<span class="marker-badge">${text}</span>`, iconAnchor: [-8, 46] });

// Vehicles are side views facing east; flipped with CSS to face west. One icon per vehicle per facing.
const vehicleIcons = Object.fromEntries(
  VEHICLES.map((v) => [
    v.key,
    {
      east: L.divIcon({ className: "rv-marker", html: v.svg, iconSize: v.size, iconAnchor: v.anchor }),
      west: L.divIcon({ className: "rv-marker rv-marker--west", html: v.svg, iconSize: v.size, iconAnchor: v.anchor }),
    },
  ])
) as Record<VehicleKey, { east: L.DivIcon; west: L.DivIcon }>;
/** Top-down airplane, rotated to its bearing (0 = north). Used for legs with no road route, e.g. Hawaii. */
const planeIcon = (bearing: number) =>
  L.divIcon({
    className: "plane-marker",
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="36" height="36" style="transform: rotate(${bearing.toFixed(0)}deg)">
      <path d="M32 4 c3 0 5 3 5 8 v12 l22 13 v6 l-22 -7 v11 l6 5 v5 l-11 -3 l-11 3 v-5 l6 -5 v-11 l-22 7 v-6 l22 -13 v-12 c0 -5 2 -8 5 -8 z" fill="#fff" stroke="#23312b" stroke-width="2.5" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

/** Legs without a road route that jump more than a short hop are flights or ferries (Hawaii; Alaska if flown). */
const FLIGHT_MIN_MILES = 60;
function isFlightLeg(prev: StopInfoResponse, stop: StopInfoResponse): boolean {
  if (stop.flightLeg) return true;
  return stop.journeyLatLongTuples.length <= 2 && lengthMiles([prev.latLongTuple, stop.latLongTuple]) > FLIGHT_MIN_MILES;
}

/** Initial compass bearing from a to b, degrees clockwise from north. */
function bearing(a: LatLngTuple, b: LatLngTuple): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(b[1] - a[1]);
  const y = Math.sin(dLon) * Math.cos(toRad(b[0]));
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Length of a polyline in miles (haversine). */
function lengthMiles(line: LatLngTuple[]): number {
  let m = 0;
  for (let i = 1; i < line.length; i++) {
    const [aLat, aLon] = line[i - 1];
    const [bLat, bLon] = line[i];
    const toRad = (d: number) => (d * Math.PI) / 180;
    const x = Math.sin(toRad(bLat - aLat) / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(toRad(bLon - aLon) / 2) ** 2;
    m += 2 * 3958.8 * Math.asin(Math.sqrt(x));
  }
  return m;
}

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
  const [era, setEra] = useState<"all" | "rv" | "trips">("all");
  const eraStops = useMemo(
    () => allStops.filter((s) => (era === "all" ? true : era === "rv" ? isRvEra(s.arrivalDate) : !isRvEra(s.arrivalDate))),
    [allStops, era]
  );
  const allYears = useMemo(() => [...new Set(eraStops.map((s) => yearOf(s.arrivalDate)))].sort(), [eraStops]);
  const [activeYears, setActiveYears] = useState<Set<number>>(() => new Set(allYears));
  useEffect(() => {
    setActiveYears(new Set(allYears));
  }, [allYears]);
  const colorFor = (year: number) => YEAR_COLORS[allYears.indexOf(year) % YEAR_COLORS.length];

  const stops = useMemo(() => eraStops.filter((s) => activeYears.has(yearOf(s.arrivalDate))), [eraStops, activeYears]);
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
  // Debounce direction changes: only flip after the heading has disagreed for a sustained stretch.
  const contrary = useRef(0);
  const FLIP_AFTER = 6; // consecutive position updates (~6% of a leg when playing)

  // Odometer: cumulative road miles at the start of each stop's inbound leg.
  const legMiles = useMemo(
    () =>
      stops.map((s, i) => {
        if (i === 0) return 0;
        const leg = s.journeyLatLongTuples.length >= 2 ? s.journeyLatLongTuples : [stops[i - 1].latLongTuple, s.latLongTuple];
        return lengthMiles(leg);
      }),
    [stops]
  );
  const cumulative = useMemo(() => {
    const out: number[] = [];
    let sum = 0;
    for (const m of legMiles) {
      sum += m;
      out.push(sum);
    }
    return out;
  }, [legMiles]);
  const miles = useMemo(() => {
    if (stops.length === 0) return 0;
    const idx = Math.min(Math.floor(position), stops.length - 1);
    const frac = position - idx;
    return cumulative[idx] + (stops[idx + 1] ? frac * legMiles[idx + 1] : 0);
  }, [stops, position, cumulative, legMiles]);

  // Vehicle location: on a stop, or along the leg into the next stop (road or flight).
  const vehicle = useMemo<{ at: LatLngTuple; mode: "drive" | "fly" | "sail"; bearing: number; kind: VehicleKey } | null>(() => {
    if (stops.length === 0) return null;
    const idx = Math.min(Math.floor(position), stops.length - 1);
    const frac = position - idx;
    const next = stops[idx + 1];
    if (frac < 0.001 || !next) return { at: stops[idx].latLongTuple, mode: "drive", bearing: 0, kind: vehicleByKey(stops[idx].vehicle).key };
    const kind = vehicleByKey(next.vehicle).key; // the vehicle that drove this leg
    if (isFlightLeg(stops[idx], next)) {
      const a = stops[idx].latLongTuple;
      const b = next.latLongTuple;
      const at: LatLngTuple = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
      // A water crossing when the destination's vehicle is the boat; otherwise a flight.
      if (kind === "boat") {
        if (Math.abs(b[1] - a[1]) > 1e-6) facing.current = b[1] < a[1] ? "west" : "east";
        return { at, mode: "sail", bearing: 0, kind };
      }
      return { at, mode: "fly", bearing: bearing(a, b), kind };
    }
    const leg = next.journeyLatLongTuples.length >= 2 ? next.journeyLatLongTuples : [stops[idx].latLongTuple, next.latLongTuple];
    const here = pointAlong(leg, frac);
    // Heading: compare with a point slightly further along the same leg.
    const ahead = pointAlong(leg, Math.min(1, frac + 0.01));
    const dLng = ahead[1] - here[1];
    if (Math.abs(dLng) > 1e-6) {
      const want = dLng < 0 ? "west" : "east";
      if (want === facing.current) contrary.current = 0;
      else if (++contrary.current >= FLIP_AFTER) {
        facing.current = want;
        contrary.current = 0;
      }
    }
    return { at: here, mode: "drive", bearing: 0, kind };
  }, [stops, position]);
  const rvAt = vehicle?.at ?? null;

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
            <Tooltip>Home · Tallahassee, FL</Tooltip>
          </Marker>
        )}

        {stops.map((stop, index) => {
          const flight = index > 0 && isFlightLeg(stops[index - 1], stop);
          const positions = flight ? [stops[index - 1].latLongTuple, stop.latLongTuple] : stop.journeyLatLongTuples;
          return (
            <Polyline
              key={`leg-${stop.id}`}
              positions={positions}
              pathOptions={{
                color: colorFor(yearOf(stop.arrivalDate)),
                weight: flight ? 2 : 3,
                opacity: 0.85,
                dashArray: flight ? "4 24" : undefined,
              }}
            >
              <Tooltip sticky>
                {index > 0 ? `${stops[index - 1].name} → ${stop.name}${flight ? (stop.vehicle === "boat" ? " (by sea)" : " (flight)") : ""}` : `To ${stop.name}`}
              </Tooltip>
            </Polyline>
          );
        })}

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
        {vehicle && (
          <Marker
            position={vehicle.at}
            icon={vehicle.mode === "fly" ? planeIcon(vehicle.bearing) : vehicleIcons[vehicle.kind]?.[facing.current] ?? vehicleIcons.fifth_wheel[facing.current]}
            interactive={false}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>

      {allYears.length > 0 && (
        <div className="map-legend" aria-label="Legend and year filter">
          <strong>
            {stops.length} stops{stops.length !== allStops.length && ` of ${allStops.length}`}
          </strong>
          <span className="era-chips">
            {([["all", "All"], ["rv", "RV years"], ["trips", "Trips"]] as const).map(([key, label]) => (
              <button
                key={key}
                className={`year-chip${era === key ? " on" : ""}`}
                onClick={() => setEra(key)}
                aria-pressed={era === key}
                title={key === "rv" ? "Living in the fifth wheel, Dec 2020 – Apr 2024" : key === "trips" ? "Trips that started and ended at home" : "Everything"}
              >
                {label}
              </button>
            ))}
          </span>
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

      <TripScrubber stops={stops} position={position} onChange={onScrub} miles={miles} totalMiles={cumulative[cumulative.length - 1] ?? 0} legMode={vehicle?.mode === "fly" || vehicle?.mode === "sail" ? vehicle.mode : "drive"} />
    </div>
  );
}
