import { Marker } from "react-leaflet";
import React from "react";
import { StopInfo } from "../models/StopInfo";
import { markerIcon } from "../utils/MarkerIcon";

interface IProps {
  info: StopInfo;
}

const Stop: React.FC<IProps> = (props: IProps) => {
  return <Marker position={props.info.latLongTuple} icon={markerIcon}></Marker>;
};

export default Stop;
