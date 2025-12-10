"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LatLngTuple } from "leaflet";
import StopForm from "@/components/admin/StopForm";

const LocationPicker = dynamic(() => import("@/components/admin/LocationPicker"), {
  ssr: false,
  loading: () => <div style={{ height: "400px", background: "#eee" }}>Loading map...</div>,
});

export default function AddStopPage() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<LatLngTuple | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(data: {
    name: string;
    link: string;
    statePark: boolean;
    nationalMonument: boolean;
    nationalPark: boolean;
    arrivalDate: string;
    departureDate: string;
    latLongTuple: LatLngTuple | null;
  }) {
    if (!data.latLongTuple) return;

    setSaving(true);
    try {
      const response = await fetch("/api/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          link: data.link,
          statePark: data.statePark,
          nationalMonument: data.nationalMonument,
          nationalPark: data.nationalPark,
          arrivalDate: new Date(data.arrivalDate).toISOString(),
          departureDate: new Date(data.departureDate).toISOString(),
          latLongTuple: data.latLongTuple,
        }),
      });

      if (response.ok) {
        const newStop = await response.json();
        router.push(`/admin/edit/${newStop.id}`);
      } else {
        alert("Failed to create stop");
      }
    } catch (error) {
      console.error("Error creating stop:", error);
      alert("Failed to create stop");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/admin" style={{ color: "#0070f3" }}>
          &larr; Back to Admin
        </Link>
      </div>

      <h1>Add New Stop</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Click on the map to set the stop location. After creating the stop, you can add
        journey waypoints.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <h3>Stop Details</h3>
          <StopForm
            onSubmit={handleSubmit}
            onLocationSelect={setSelectedLocation}
            selectedLocation={selectedLocation}
            submitLabel={saving ? "Creating..." : "Create Stop"}
          />
        </div>
        <div>
          <h3>Select Location</h3>
          <LocationPicker
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
          />
        </div>
      </div>
    </div>
  );
}
