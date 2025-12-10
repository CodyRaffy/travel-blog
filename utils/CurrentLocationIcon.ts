import L from "leaflet";

const currentLocationIcon = new L.Icon({
  iconUrl: "/img/MissyWaterfall.jpg",
  iconRetinaUrl: "/img/MissyWaterfall.jpg",
  iconSize: new L.Point(30, 40),
  className: "leaflet-div-icon",
});

export { currentLocationIcon };
