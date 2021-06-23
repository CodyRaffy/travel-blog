import L from "leaflet";
import icon from "./../img/MissyWaterfall.jpg";

const customIcon = new L.Icon({
  iconUrl: icon,
  iconRetinaUrl: icon,
  iconSize: new L.Point(15, 20),
  className: "leaflet-div-icon",
});

export { customIcon };
