import { Marker } from "react-leaflet";
import React from "react";
import { StopInfo } from "../models/StopInfo";

interface IProps {
  info: StopInfo;
}

const Stop: React.FC<IProps> = (props: IProps) => {
  return <Marker position={props.info.latLongTuple}></Marker>;
};

export default Stop;
