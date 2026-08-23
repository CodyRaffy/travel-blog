"use client";

import Link from "next/link";
import StopCandidateReview from "@/components/admin/StopCandidateReview";

export default function ReviewStopsPage() {
  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <h1>Review Stop Candidates</h1>
        <div>
          <Link href="/admin" style={{ marginRight: "16px", color: "#0070f3" }}>
            Stops
          </Link>
          <Link href="/admin/posts" style={{ color: "#0070f3" }}>
            Posts
          </Link>
        </div>
      </div>
      <p style={{ color: "#555", marginTop: 0 }}>
        Candidates come from clustering your photos by date and GPS. Click one to see sample photos, fix the name
        and dates, then approve it to create the stop — the road route from the previous stop is drawn
        automatically.
      </p>
      <StopCandidateReview />
    </div>
  );
}
