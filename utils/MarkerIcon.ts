import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: new L.Point(25, 41),
  iconAnchor: [12.5, 41],
});

export { markerIcon };
