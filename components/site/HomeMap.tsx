"use client";

import dynamic from "next/dynamic";
import { StopInfoResponse } from "@/models/StopInfo";

// Leaflet touches `window`, so the map only renders on the client.
const MainMap = dynamic(() => import("@/components/MainMap"), {
  ssr: false,
  loading: () => <div className="map-page" style={{ display: "grid", placeItems: "center" }}>Loading map…</div>,
});

export default function HomeMap({ stops }: { stops: StopInfoResponse[] }) {
  return <MainMap stops={stops} />;
}
