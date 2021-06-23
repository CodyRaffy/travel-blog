import L from "leaflet";
import icon from "./../img/MissyWaterfall.jpg";

const currentLocationIcon = new L.Icon({
  iconUrl: icon,
  iconRetinaUrl: icon,
  iconSize: new L.Point(30, 40),
  className: "leaflet-div-icon",
});

export { currentLocationIcon };
