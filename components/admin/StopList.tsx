"use client";

import Link from "next/link";
import { StopInfoResponse } from "@/models/StopInfo";

interface StopListProps {
  stops: StopInfoResponse[];
  onDelete: (id: string) => void;
}

export default function StopList({ stops, onDelete }: StopListProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #333" }}>
          <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
          <th style={{ textAlign: "left", padding: "8px" }}>Type</th>
          <th style={{ textAlign: "left", padding: "8px" }}>Arrival</th>
          <th style={{ textAlign: "left", padding: "8px" }}>Departure</th>
          <th style={{ textAlign: "left", padding: "8px" }}>Waypoints</th>
          <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {stops.map((stop) => (
          <tr key={stop.id} style={{ borderBottom: "1px solid #ddd" }}>
            <td style={{ padding: "8px" }}>
              <a href={stop.link} target="_blank" rel="noopener noreferrer">
                {stop.name}
              </a>
            </td>
            <td style={{ padding: "8px" }}>
              {stop.statePark && "State Park"}
              {stop.nationalPark && "National Park"}
              {stop.nationalMonument && "National Monument"}
            </td>
            <td style={{ padding: "8px" }}>{formatDate(stop.arrivalDate)}</td>
            <td style={{ padding: "8px" }}>{formatDate(stop.departureDate)}</td>
            <td style={{ padding: "8px" }}>{stop.journeyLatLongTuples.length}</td>
            <td style={{ padding: "8px" }}>
              <Link
                href={`/admin/edit/${stop.id}`}
                style={{ marginRight: "8px", color: "#0070f3" }}
              >
                Edit
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${stop.name}"?`)) {
                    onDelete(stop.id);
                  }
                }}
                style={{
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "4px 8px",
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
