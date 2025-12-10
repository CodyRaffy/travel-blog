"use client";

import { useState } from "react";
import { LatLngTuple } from "leaflet";

interface StopFormData {
  name: string;
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  arrivalDate: string;
  departureDate: string;
  latLongTuple: LatLngTuple | null;
}

interface StopFormProps {
  initialData?: Partial<StopFormData>;
  onSubmit: (data: StopFormData) => void;
  onLocationSelect: (location: LatLngTuple | null) => void;
  selectedLocation: LatLngTuple | null;
  submitLabel: string;
}

export default function StopForm({
  initialData,
  onSubmit,
  onLocationSelect,
  selectedLocation,
  submitLabel,
}: StopFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [link, setLink] = useState(initialData?.link || "");
  const [statePark, setStatePark] = useState(initialData?.statePark || false);
  const [nationalMonument, setNationalMonument] = useState(
    initialData?.nationalMonument || false
  );
  const [nationalPark, setNationalPark] = useState(initialData?.nationalPark || false);
  const [arrivalDate, setArrivalDate] = useState(initialData?.arrivalDate || "");
  const [departureDate, setDepartureDate] = useState(initialData?.departureDate || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert("Please click on the map to set the stop location");
      return;
    }
    onSubmit({
      name,
      link,
      statePark,
      nationalMonument,
      nationalPark,
      arrivalDate,
      departureDate,
      latLongTuple: selectedLocation,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "8px",
    marginTop: "4px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "16px",
  };

  return (
    <form onSubmit={handleSubmit}>
      <label style={labelStyle}>
        Name:
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Link:
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          required
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Arrival Date:
        <input
          type="date"
          value={arrivalDate}
          onChange={(e) => setArrivalDate(e.target.value)}
          required
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Departure Date:
        <input
          type="date"
          value={departureDate}
          onChange={(e) => setDepartureDate(e.target.value)}
          required
          style={inputStyle}
        />
      </label>

      <fieldset style={{ marginBottom: "16px", padding: "12px", border: "1px solid #ccc" }}>
        <legend>Park Type</legend>
        <label style={{ marginRight: "16px" }}>
          <input
            type="checkbox"
            checked={statePark}
            onChange={(e) => setStatePark(e.target.checked)}
          />{" "}
          State Park
        </label>
        <label style={{ marginRight: "16px" }}>
          <input
            type="checkbox"
            checked={nationalPark}
            onChange={(e) => setNationalPark(e.target.checked)}
          />{" "}
          National Park
        </label>
        <label>
          <input
            type="checkbox"
            checked={nationalMonument}
            onChange={(e) => setNationalMonument(e.target.checked)}
          />{" "}
          National Monument
        </label>
      </fieldset>

      <div style={{ marginBottom: "16px" }}>
        <strong>Location:</strong>{" "}
        {selectedLocation
          ? `${selectedLocation[0].toFixed(6)}, ${selectedLocation[1].toFixed(6)}`
          : "Click on the map to set location"}
        {selectedLocation && (
          <button
            type="button"
            onClick={() => onLocationSelect(null)}
            style={{ marginLeft: "8px", color: "#dc3545", background: "none", border: "none", cursor: "pointer" }}
          >
            Clear
          </button>
        )}
      </div>

      <button
        type="submit"
        style={{
          background: "#0070f3",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
