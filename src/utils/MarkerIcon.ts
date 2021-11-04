import L from "leaflet";
import icon from "./leaflet/marker-icon.png";

const markerIcon = new L.Icon({
  iconUrl: icon,
  iconRetinaUrl: icon,
  iconSize: new L.Point(25, 41),
  iconAnchor: [12.5, 41],
});

export { markerIcon };
