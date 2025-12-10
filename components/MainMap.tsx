"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { currentLocationIcon } from "@/utils/CurrentLocationIcon";
import { centerOfUsa, currentLocation, homeLocation } from "@/data/ImportantMarkers";
import Stop from "./Stop";
import { markerIcon } from "@/utils/MarkerIcon";
import { StopInfoResponse } from "@/models/StopInfo";

const MainMap = () => {
  const [stops, setStops] = useState<StopInfoResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStops() {
      try {
        const response = await fetch("/api/stops");
        const data = await response.json();
        setStops(data);
      } catch (error) {
        console.error("Failed to fetch stops:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStops();
  }, []);

  return (
    <div className="leaflet-container">
      <MapContainer center={centerOfUsa} zoom={5} style={{ height: "100%", width: "100%" }}>
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

        {!loading &&
          stops.map((stop, index) => (
            <div key={index}>
              <Stop info={stop} />
              <Polyline
                positions={stop.journeyLatLongTuples}
                color={index % 2 === 0 ? "red" : "blue"}
              />
            </div>
          ))}
      </MapContainer>
    </div>
  );
};

export default MainMap;
