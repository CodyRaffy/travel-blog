"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { StopInfoResponse } from "@/models/StopInfo";
import PhotoCurator from "@/components/admin/PhotoCurator";

export default function StopPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stop, setStop] = useState<StopInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stops/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStop)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (!stop) return <div style={{ padding: "20px" }}>Stop not found</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "1300px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px", flexWrap: "wrap", gap: "8px" }}>
        <h1>Photos — {stop.name}</h1>
        <div>
          <Link href="/admin" style={{ marginRight: "16px", color: "#0070f3" }}>
            Stops
          </Link>
          <Link href={`/admin/edit/${stop.id}`} style={{ color: "#0070f3" }}>
            Edit stop
          </Link>
        </div>
      </div>
      <p style={{ color: "#555", marginTop: 0 }}>
        {stop.arrivalDate.slice(0, 10)} → {stop.departureDate.slice(0, 10)}. Kept photos are rendered to WebP and shown on the
        site; everything else stays untouched in Dropbox.
      </p>
      <PhotoCurator stop={stop} onStopChange={setStop} />
    </div>
  );
}
