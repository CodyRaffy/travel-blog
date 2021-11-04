import L from "leaflet";
import icon from "./leaflet/marker-icon.png";

const markerIcon = new L.Icon({
  iconUrl: icon,
  iconRetinaUrl: icon,
});

export { markerIcon };
