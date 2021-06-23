import { LatLngTuple } from "leaflet";
import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { currentLocationIcon } from "../utils/CurrentLocationIcon";
import { homeIcon } from "../utils/HomeIcon";

const MainMap: React.FC = () => {
  const currentLocation: LatLngTuple = [
    48.361599749523215, -114.27451112888804,
  ];
  const centerOfUsa: LatLngTuple = [40.07656283137699, -98.94651206855815];
  const homeLocation: LatLngTuple = [30.516974975572815, -84.22185018565166];
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
      </MapContainer>
    </div>
  );
};

export default MainMap;
