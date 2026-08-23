"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StopInfoResponse } from "@/models/StopInfo";
import StopList from "@/components/admin/StopList";
import { VEHICLES } from "@/lib/vehicles";

export default function AdminPage() {
  const [stops, setStops] = useState<StopInfoResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStops();
  }, []);

  async function fetchStops() {
    try {
      const response = await fetch("/api/stops");
      const data = await response.json();
      setStops(data);
    } catch (error) {
      console.error("Failed to fetch stops:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/stops/${id}`, { method: "DELETE" });
      if (response.ok) {
        setStops(stops.filter((stop) => stop.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete stop:", error);
    }
  }

  const [vehForm, setVehForm] = useState({ vehicle: "minivan", from: "", to: "" });
  async function handleSetVehicle() {
    if (!vehForm.from || !vehForm.to) return alert("Pick a from and to date.");
    const r = await fetch("/api/stops", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vehForm) });
    const res = await r.json();
    if (!r.ok) return alert(res.error ?? "Failed");
    alert(`Set vehicle on ${res.updated} stops.`);
    fetchStops();
  }

  async function handleRerouteAll() {
    if (!confirm("Redraw every journey leg along roads, in date order? Hand-edited waypoints will be replaced.")) return;
    setLoading(true);
    try {
      const r = await fetch("/api/stops/reroute", { method: "POST" });
      const res = await r.json();
      alert(`Routed ${res.routed} legs${res.failed ? `, ${res.failed} failed` : ""}.`);
      await fetchStops();
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Admin - Manage Stops</h1>
        <div>
          <Link href="/" style={{ marginRight: "16px", color: "#0070f3" }}>
            View Map
          </Link>
          <Link href="/admin/posts" style={{ marginRight: "16px", color: "#0070f3" }}>
            Posts
          </Link>
          <Link href="/admin/stops/review" style={{ marginRight: "16px", color: "#0070f3" }}>
            Review photo stops
          </Link>
          <button
            onClick={handleRerouteAll}
            title="Redraw all journey legs along roads (OSRM), in chronological order"
            style={{ marginRight: "16px", background: "none", border: "1px solid #0070f3", color: "#0070f3", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}
          >
            Re-route all legs
          </button>
          <Link
            href="/admin/add"
            style={{
              background: "#0070f3",
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              textDecoration: "none",
            }}
          >
            Add New Stop
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", margin: "0 0 16px", padding: "10px 12px", background: "#f3f5f3", borderRadius: "6px" }}>
        <strong>Set vehicle by date range:</strong>
        <select value={vehForm.vehicle} onChange={(e) => setVehForm({ ...vehForm, vehicle: e.target.value })}>
          {VEHICLES.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label}
            </option>
          ))}
        </select>
        <label>
          from <input type="date" value={vehForm.from} onChange={(e) => setVehForm({ ...vehForm, from: e.target.value })} />
        </label>
        <label>
          to <input type="date" value={vehForm.to} onChange={(e) => setVehForm({ ...vehForm, to: e.target.value })} />
        </label>
        <button onClick={handleSetVehicle} style={{ background: "#0070f3", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}>
          Apply
        </button>
        <span style={{ color: "#555", fontSize: "0.9em" }}>Applies to stops whose arrival date is in the range (the vehicle is drawn on the leg into each stop).</span>
      </div>

      {stops.length === 0 ? (
        <p>No stops yet. Add your first stop!</p>
      ) : (
        <StopList stops={stops} onDelete={handleDelete} />
      )}
    </div>
  );
}
