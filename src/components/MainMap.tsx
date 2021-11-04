import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { currentLocationIcon } from "../utils/CurrentLocationIcon";
import { homeIcon } from "../utils/HomeIcon";
import {
  centerOfUsa,
  currentLocation,
  homeLocation,
} from "../data/ImportantMarkers";
import { stops } from "../data/Stops";
import Stop from "./Stop";

const MainMap: React.FC = () => {
  return (
    <div className="leaflet-container">
      <MapContainer center={centerOfUsa} zoom={5}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={currentLocation} icon={currentLocationIcon}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>

        <Marker position={homeLocation} icon={homeIcon}></Marker>
        {stops.map((i, index) => (
          <Stop info={i} key={index}></Stop>
        ))}
      </MapContainer>
    </div>
  );
};

export default MainMap;
