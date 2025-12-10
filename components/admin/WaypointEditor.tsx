"use client";

import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import { LatLngTuple, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { centerOfUsa } from "@/data/ImportantMarkers";
import { markerIcon } from "@/utils/MarkerIcon";

interface WaypointEditorProps {
  stopLocation: LatLngTuple;
  waypoints: LatLngTuple[];
  onWaypointsChange: (waypoints: LatLngTuple[]) => void;
}

function createNumberedIcon(number: number): DivIcon {
  return new DivIcon({
    className: "waypoint-marker",
    html: `<div style="
      background: #0070f3;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (location: LatLngTuple) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function WaypointEditor({
  stopLocation,
  waypoints,
  onWaypointsChange,
}: WaypointEditorProps) {
  const handleMapClick = (location: LatLngTuple) => {
    onWaypointsChange([...waypoints, location]);
  };

  const handleWaypointClick = (index: number) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(newWaypoints);
  };

  const handleClearAll = () => {
    if (confirm("Clear all waypoints?")) {
      onWaypointsChange([]);
    }
  };

  const handleRemoveLast = () => {
    if (waypoints.length > 0) {
      onWaypointsChange(waypoints.slice(0, -1));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
        <span>
          <strong>{waypoints.length}</strong> waypoints
        </span>
        <button
          type="button"
          onClick={handleRemoveLast}
          disabled={waypoints.length === 0}
          style={{
            padding: "4px 8px",
            background: waypoints.length === 0 ? "#ccc" : "#ff9800",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: waypoints.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Undo Last
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={waypoints.length === 0}
          style={{
            padding: "4px 8px",
            background: waypoints.length === 0 ? "#ccc" : "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: waypoints.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Clear All
        </button>
      </div>

      <div style={{ height: "500px", width: "100%" }}>
        <MapContainer
          center={waypoints.length > 0 ? waypoints[0] : stopLocation}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Stop destination marker */}
          <Marker position={stopLocation} icon={markerIcon} />

          {/* Waypoint markers */}
          {waypoints.map((waypoint, index) => (
            <Marker
              key={index}
              position={waypoint}
              icon={createNumberedIcon(index + 1)}
              eventHandlers={{
                click: () => handleWaypointClick(index),
              }}
            />
          ))}

          {/* Journey polyline */}
          {waypoints.length > 0 && (
            <Polyline positions={waypoints} color="blue" weight={3} opacity={0.7} />
          )}
        </MapContainer>
      </div>

      <p style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>
        Click on the map to add waypoints. Click on a numbered waypoint to remove it.
        The red marker shows the stop destination.
      </p>
    </div>
  );
}
