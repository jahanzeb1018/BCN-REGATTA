// BuoyMarker.jsx
import React from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import "./BuoyMarker.css";

const BuoyMarker = ({ lat, lng, name, radius = 60, highlight = false }) => {
  return (
    <CircleMarker
      center={[lat, lng]}
      radius={5}
      pathOptions={{ color: highlight ? "gold" : "yellow", fillColor: highlight ? "gold" : "yellow" }}
      className={highlight ? "buoy-highlight" : ""}
    >
      <Tooltip>{name}</Tooltip>
    </CircleMarker>
  );
};

export default BuoyMarker;
