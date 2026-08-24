"use client";

import { useState } from "react";
import { LatLngTuple } from "leaflet";
import CategoryPicker from "@/components/admin/CategoryPicker";
import { CATEGORY_KEYS, StopCategoryFlags, emptyFlags } from "@/lib/categories";
import { VEHICLES, DEFAULT_VEHICLE, type VehicleKey } from "@/lib/vehicles";

interface StopFormData extends StopCategoryFlags {
  vehicle: VehicleKey;
  flightLeg: boolean;
  name: string;
  link: string;
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
  const [vehicle, setVehicle] = useState<VehicleKey>(initialData?.vehicle ?? DEFAULT_VEHICLE);
  const [flightLeg, setFlightLeg] = useState(initialData?.flightLeg ?? false);
  const [flags, setFlags] = useState<StopCategoryFlags>(() => {
    const f = emptyFlags();
    for (const k of CATEGORY_KEYS) f[k] = initialData?.[k] ?? false;
    return f;
  });
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
      ...flags,
      vehicle,
      flightLeg,
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
        <legend>Categories</legend>
        <CategoryPicker value={flags} onChange={setFlags} />
      </fieldset>

      <label style={{ display: "block", marginBottom: "4px" }}>Vehicle (drawn on the map for the leg into this stop)</label>
      <select value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleKey)} style={{ ...inputStyle }}>
        {VEHICLES.map((v) => (
          <option key={v.key} value={v.key}>
            {v.label} — {v.description}
          </option>
        ))}
      </select>
      <label style={{ display: "block", margin: "-4px 0 16px" }}>
        <input type="checkbox" checked={flightLeg} onChange={(e) => setFlightLeg(e.target.checked)} /> We flew here
        (the leg into this stop is drawn as a dashed flight, not a road route)
      </label>

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
