import L from "leaflet";
import icon from "./../img/Home.jpg";

const homeIcon = new L.Icon({
  iconUrl: icon,
  iconRetinaUrl: icon,
  iconSize: new L.Point(60, 40),
  className: "leaflet-div-icon",
});

export { homeIcon };
