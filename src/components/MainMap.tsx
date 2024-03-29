import React from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { currentLocationIcon } from "../utils/CurrentLocationIcon";
import {
  centerOfUsa,
  currentLocation,
  homeLocation,
} from "../data/ImportantMarkers";
import { stops } from "../data/Stops";
import Stop from "./Stop";
import { markerIcon } from "../utils/MarkerIcon";

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

        <Marker position={homeLocation} icon={markerIcon}></Marker>

        {stops.map((i, index) => (
          <>
            <Stop info={i} key={index}></Stop>
            <Polyline
              key={index}
              positions={i.journeyLatLongTuples}
              color={index % 2 === 0 ? "red" : "blue"}
            />
          </>
        ))}
      </MapContainer>
    </div>
  );
};

export default MainMap;
