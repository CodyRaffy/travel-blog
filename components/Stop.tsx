"use client";

import { Marker } from "react-leaflet";
import { StopInfo, StopInfoResponse } from "@/models/StopInfo";
import { markerIcon } from "@/utils/MarkerIcon";

interface StopProps {
  info: StopInfo | StopInfoResponse;
}

const Stop = ({ info }: StopProps) => {
  return <Marker position={info.latLongTuple} icon={markerIcon} />;
};

export default Stop;
