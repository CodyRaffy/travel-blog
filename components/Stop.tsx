"use client";

import { Marker } from "react-leaflet";
import { StopInfo } from "@/models/StopInfo";
import { markerIcon } from "@/utils/MarkerIcon";

interface StopProps {
  info: StopInfo;
}

const Stop = ({ info }: StopProps) => {
  return <Marker position={info.latLongTuple} icon={markerIcon} />;
};

export default Stop;
