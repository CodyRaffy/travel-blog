"use client";

import dynamic from "next/dynamic";

const MainMap = dynamic(() => import("@/components/MainMap"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

export default function Home() {
  return <MainMap />;
}
