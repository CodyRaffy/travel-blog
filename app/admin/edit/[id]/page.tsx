"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LatLngTuple } from "leaflet";
import { CATEGORY_KEYS, StopCategoryFlags } from "@/lib/categories";
import { StopInfoResponse } from "@/models/StopInfo";
import StopForm from "@/components/admin/StopForm";

const LocationPicker = dynamic(() => import("@/components/admin/LocationPicker"), {
  ssr: false,
  loading: () => <div style={{ height: "400px", background: "#eee" }}>Loading map...</div>,
});

const WaypointEditor = dynamic(() => import("@/components/admin/WaypointEditor"), {
  ssr: false,
  loading: () => <div style={{ height: "500px", background: "#eee" }}>Loading map...</div>,
});

export default function EditStopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [stop, setStop] = useState<StopInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LatLngTuple | null>(null);
  const [waypoints, setWaypoints] = useState<LatLngTuple[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "waypoints">("details");

  useEffect(() => {
    fetchStop();
  }, [id]);

  async function fetchStop() {
    try {
      const response = await fetch(`/api/stops/${id}`);
      if (response.ok) {
        const data = await response.json();
        setStop(data);
        setSelectedLocation(data.latLongTuple);
        setWaypoints(data.journeyLatLongTuples || []);
      } else {
        router.push("/admin");
      }
    } catch (error) {
      console.error("Error fetching stop:", error);
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  }

  async function handleDetailsSubmit(data: StopCategoryFlags & {
    name: string;
    link: string;
    arrivalDate: string;
    departureDate: string;
    latLongTuple: LatLngTuple | null;
  }) {
    if (!data.latLongTuple) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/stops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          link: data.link,
          ...Object.fromEntries(CATEGORY_KEYS.map((k) => [k, data[k]])),
          arrivalDate: new Date(data.arrivalDate).toISOString(),
          departureDate: new Date(data.departureDate).toISOString(),
          latLongTuple: data.latLongTuple,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setStop(updated);
        alert("Details saved!");
      } else {
        alert("Failed to save");
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoRoute() {
    setSaving(true);
    try {
      const response = await fetch(`/api/stops/${id}/route-from-previous`, { method: "POST" });
      if (response.ok) {
        const updated = await response.json();
        setStop(updated);
        setWaypoints(updated.journeyLatLongTuples || []);
      } else {
        alert((await response.json()).error ?? "Routing failed");
      }
    } catch (error) {
      console.error("Error routing:", error);
      alert("Routing failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWaypoints() {
    setSaving(true);
    try {
      const response = await fetch(`/api/stops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journeyLatLongTuples: waypoints,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setStop(updated);
        alert("Waypoints saved!");
      } else {
        alert("Failed to save waypoints");
      }
    } catch (error) {
      console.error("Error saving waypoints:", error);
      alert("Failed to save waypoints");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  if (!stop) {
    return <div style={{ padding: "20px" }}>Stop not found</div>;
  }

  const formatDateForInput = (isoString: string) => {
    return isoString.split("T")[0];
  };

  const tabStyle = (isActive: boolean) => ({
    padding: "10px 20px",
    background: isActive ? "#0070f3" : "#eee",
    color: isActive ? "white" : "#333",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
  });

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/admin" style={{ color: "#0070f3" }}>
          &larr; Back to Admin
        </Link>
      </div>

      <h1>Edit: {stop.name}</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("details")}
          style={tabStyle(activeTab === "details")}
        >
          Stop Details
        </button>
        <button
          onClick={() => setActiveTab("waypoints")}
          style={tabStyle(activeTab === "waypoints")}
        >
          Journey Waypoints ({waypoints.length})
        </button>
      </div>

      {activeTab === "details" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <h3>Stop Details</h3>
            <StopForm
              initialData={{
                name: stop.name,
                link: stop.link,
                ...Object.fromEntries(CATEGORY_KEYS.map((k) => [k, stop[k]])),
                arrivalDate: formatDateForInput(stop.arrivalDate),
                departureDate: formatDateForInput(stop.departureDate),
                latLongTuple: stop.latLongTuple,
              }}
              onSubmit={handleDetailsSubmit}
              onLocationSelect={setSelectedLocation}
              selectedLocation={selectedLocation}
              submitLabel={saving ? "Saving..." : "Save Details"}
            />
          </div>
          <div>
            <h3>Stop Location</h3>
            <LocationPicker
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
            />
          </div>
        </div>
      )}

      {activeTab === "waypoints" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3>Journey Waypoints</h3>
            <span style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleAutoRoute}
              disabled={saving}
              title="Replace the waypoints with a road route from the previous stop (OSRM). Also redraws the next stop's leg."
              style={{
                padding: "10px 20px",
                background: saving ? "#ccc" : "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "16px",
              }}
            >
              Draw road route
            </button>
            <button
              onClick={handleSaveWaypoints}
              disabled={saving}
              style={{
                padding: "10px 20px",
                background: saving ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "16px",
              }}
            >
              {saving ? "Saving..." : "Save Waypoints"}
            </button>
            </span>
          </div>
          <p style={{ color: "#555", marginTop: "-8px", marginBottom: "12px" }}>
            Legs are drawn automatically along roads when a stop is created. Use the editor only to hand-adjust a detour.
          </p>
          <WaypointEditor
            stopLocation={stop.latLongTuple}
            waypoints={waypoints}
            onWaypointsChange={setWaypoints}
          />
        </div>
      )}
    </div>
  );
}
