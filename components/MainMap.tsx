"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { centerOfUsa, homeLocation } from "@/data/ImportantMarkers";
import { markerIcon } from "@/utils/MarkerIcon";
import { homeIcon } from "@/utils/HomeIcon";
import { StopInfoResponse } from "@/models/StopInfo";
import { fmtRange, fmtNights, yearOf } from "@/lib/format";

/** One colour per trip year; legs are coloured by the year the leg was driven. */
const YEAR_COLORS = ["#b5472f", "#2e6b4f", "#c9901a", "#3f5fa8", "#7b4a9e", "#1f8a8a"];

interface MainMapProps {
  stops: StopInfoResponse[];
}

const badgeIcon = (text: string) =>
  L.divIcon({ className: "", html: `<span class="marker-badge">${text}</span>`, iconAnchor: [-8, 46] });

export default function MainMap({ stops }: MainMapProps) {
  const years = useMemo(() => [...new Set(stops.map((s) => yearOf(s.arrivalDate)))].sort(), [stops]);
  const colorFor = (year: number) => YEAR_COLORS[years.indexOf(year) % YEAR_COLORS.length];
  const first = stops[0];
  const last = stops[stops.length - 1];

  return (
    <div className="map-page" style={{ position: "relative" }}>
      <MapContainer center={centerOfUsa} zoom={5} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={homeLocation} icon={homeIcon}>
          <Tooltip>Home base · Tallahassee, FL</Tooltip>
        </Marker>

        {stops.map((stop, index) => (
          <Polyline
            key={`leg-${stop.id}`}
            positions={stop.journeyLatLongTuples}
            pathOptions={{ color: colorFor(yearOf(stop.arrivalDate)), weight: 3, opacity: 0.85 }}
          >
            <Tooltip sticky>
              {index > 0 ? `${stops[index - 1].name} → ${stop.name}` : `To ${stop.name}`}
            </Tooltip>
          </Polyline>
        ))}

        {stops.map((stop) => (
          <Marker key={stop.id} position={stop.latLongTuple} icon={markerIcon}>
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
          </Marker>
        ))}

        {first && <Marker position={first.latLongTuple} icon={badgeIcon("Start")} interactive={false} />}
        {last && last !== first && <Marker position={last.latLongTuple} icon={badgeIcon("End")} interactive={false} />}
      </MapContainer>

      {years.length > 0 && (
        <div className="map-legend" aria-label="Legend">
          <strong>{stops.length} stops</strong>
          {years.map((y) => (
            <span key={y}>
              <span className="swatch" style={{ background: colorFor(y) }} />
              {y}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
