"use client";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { centerOfUsa } from "@/data/ImportantMarkers";
import { markerIcon } from "@/utils/MarkerIcon";

interface LocationPickerProps {
  selectedLocation: LatLngTuple | null;
  onLocationSelect: (location: LatLngTuple) => void;
}

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (location: LatLngTuple) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function LocationPicker({
  selectedLocation,
  onLocationSelect,
}: LocationPickerProps) {
  return (
    <div style={{ height: "400px", width: "100%", marginBottom: "16px" }}>
      <MapContainer
        center={selectedLocation || centerOfUsa}
        zoom={selectedLocation ? 10 : 5}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        {selectedLocation && (
          <Marker position={selectedLocation} icon={markerIcon} />
        )}
      </MapContainer>
    </div>
  );
}
